import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EagleViewOAuthToken, EagleViewTokenResponse } from "@/types/eagleview";

const EAGLEVIEW_AUTH_URL = "https://apicenter.eagleview.com/oauth2/v1/authorize";
const EAGLEVIEW_TOKEN_URL = "https://apicenter.eagleview.com/oauth2/v1/token";
const EAGLEVIEW_TOKEN_CACHE_KEY = "eagleview_oauth_token";
const OAUTH_STATE_KEY = "eagleview_oauth_state";
const PKCE_CODE_VERIFIER_KEY = "eagleview_pkce_code_verifier";
const GHL_CREDENTIALS_KEY = "smartroofing_credentials";

// Helper function to generate random string for state parameter
function generateRandomString(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((v) => charset[v % charset.length])
    .join("");
}

// PKCE Helper: Generate code verifier (43-128 characters)
function generateCodeVerifier(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((v) => charset[v % charset.length])
    .join("");
}

// PKCE Helper: Generate code challenge from verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  // Hash the verifier using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);

  // Convert to base64url encoding
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Helper function to get location ID from GHL credentials
function getLocationIdFromStorage(): string | null {
  try {
    const storedGHLCredentials = localStorage.getItem(GHL_CREDENTIALS_KEY);
    if (!storedGHLCredentials) return null;

    const ghlCredentials = JSON.parse(storedGHLCredentials);
    return ghlCredentials.companyId || null;
  } catch (error) {
    console.error("Error retrieving location ID:", error);
    return null;
  }
}

// Helper function to store refresh token in database
async function storeRefreshTokenInDatabase(refreshToken: string): Promise<void> {
  try {
    const locationId = getLocationIdFromStorage();
    if (!locationId) {
      console.warn("Location ID not found, cannot store refresh token");
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ eagleview_api_refresh_token: refreshToken })
      .eq('location_id', locationId);

    if (error) {
      console.error("Error storing refresh token:", error);
    } else {
      console.log("Refresh token stored successfully in database");
    }
  } catch (error) {
    console.error("Error updating refresh token in database:", error);
  }
}

// Helper function to create Basic Auth header
function createBasicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

// Helper function to create token object from response
function createTokenFromResponse(tokenData: EagleViewTokenResponse): EagleViewOAuthToken {
  return {
    access_token: tokenData.access_token,
    expires_at: Date.now() + tokenData.expires_in * 1000,
  };
}

export const eagleViewOAuthService = {
  /**
   * Initiate OAuth authorization flow with PKCE
   * Opens Eagleview authorization page
   */
  initiateAuthorization: async (clientId: string, scopes?: string[]): Promise<void> => {
    try {
      // Generate state parameter for CSRF protection
      const state = generateRandomString(32);

      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store state and code verifier for later use
      localStorage.setItem(OAUTH_STATE_KEY, state);
      localStorage.setItem(PKCE_CODE_VERIFIER_KEY, codeVerifier);

      // Build authorization URL - use simple /settings (Eagleview doesn't support query params in redirect URI)
      const redirectUri = `${window.location.origin}/settings`;
      const scope = scopes?.join(" ") || "openid Order AdjustOrder Download_Report getReportDetail offline_access";

      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state,
        scope: scope,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      const authUrl = `${EAGLEVIEW_AUTH_URL}?${params.toString()}`;

      console.log("Initiating OAuth flow with PKCE and redirect URI:", redirectUri);

      // Redirect to Eagleview authorization page
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error initiating OAuth flow:", error);
      toast.error("Failed to initiate Eagleview authorization");
      throw error;
    }
  },

  /**
   * Exchange authorization code for access token using PKCE
   */
  exchangeCodeForToken: async (
    code: string,
    clientId: string,
    state?: string
  ): Promise<EagleViewOAuthToken> => {
    try {
      // Verify state if provided
      const storedState = localStorage.getItem(OAUTH_STATE_KEY);
      if (state && storedState && state !== storedState) {
        throw new Error("Invalid OAuth state parameter - possible CSRF attack");
      }

      // Retrieve stored code verifier for PKCE
      const codeVerifier = localStorage.getItem(PKCE_CODE_VERIFIER_KEY);
      if (!codeVerifier) {
        throw new Error("Code verifier not found - PKCE flow incomplete");
      }

      const redirectUri = `${window.location.origin}/settings`;

      console.log("Exchanging authorization code for token with PKCE");

      // Prepare form data for authorization code grant with PKCE
      const formData = new URLSearchParams();
      formData.append("grant_type", "authorization_code");
      formData.append("code", code);
      formData.append("redirect_uri", redirectUri);
      formData.append("client_id", clientId);
      formData.append("code_verifier", codeVerifier);

      const response = await fetch(EAGLEVIEW_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token exchange failed:", response.status, errorText);
        throw new Error(`Failed to exchange code for token: ${response.status}`);
      }

      const tokenData = await response.json();

      // Create and cache token
      const token = createTokenFromResponse(tokenData);
      eagleViewOAuthService.cacheToken(token);

      // Store refresh_token in database if provided
      if (tokenData.refresh_token) {
        await storeRefreshTokenInDatabase(tokenData.refresh_token);
      }

      // Clean up state and PKCE code verifier
      localStorage.removeItem(OAUTH_STATE_KEY);
      localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);

      console.log("Successfully obtained and cached OAuth token");
      toast.success("Successfully connected to Eagleview");

      return token;
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      toast.error("Failed to complete Eagleview authorization");

      // Clean up on error
      localStorage.removeItem(OAUTH_STATE_KEY);
      localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);

      throw error;
    }
  },

  /**
   * Get cached OAuth token if valid
   */
  getCachedToken: (): EagleViewOAuthToken | null => {
    try {
      const cached = localStorage.getItem(EAGLEVIEW_TOKEN_CACHE_KEY);
      if (!cached) return null;

      const token: EagleViewOAuthToken = JSON.parse(cached);

      // Check if token is expired (with 5 minute buffer)
      const now = Date.now();
      const bufferMs = 5 * 60 * 1000;
      if (now >= token.expires_at - bufferMs) {
        console.log("Cached OAuth token is expired");
        eagleViewOAuthService.clearTokenCache();
        return null;
      }

      return token;
    } catch (error) {
      console.error("Error retrieving cached OAuth token:", error);
      eagleViewOAuthService.clearTokenCache();
      return null;
    }
  },

  /**
   * Cache OAuth token
   */
  cacheToken: (token: EagleViewOAuthToken): void => {
    try {
      localStorage.setItem(EAGLEVIEW_TOKEN_CACHE_KEY, JSON.stringify(token));
      console.log("OAuth token cached successfully");
    } catch (error) {
      console.error("Error caching OAuth token:", error);
    }
  },

  /**
   * Clear cached OAuth token
   */
  clearTokenCache: (): void => {
    try {
      localStorage.removeItem(EAGLEVIEW_TOKEN_CACHE_KEY);
      localStorage.removeItem(OAUTH_STATE_KEY);
      localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);
      console.log("OAuth token cache cleared");
    } catch (error) {
      console.error("Error clearing OAuth token cache:", error);
    }
  },

  /**
   * Clear refresh token from database
   */
  clearRefreshToken: async (): Promise<void> => {
    try {
      const locationId = getLocationIdFromStorage();
      if (!locationId) {
        console.warn("Location ID not found, cannot clear refresh token from database");
        return;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update({ eagleview_api_refresh_token: null })
        .eq("location_id", locationId);

      if (error) {
        console.error("Error clearing refresh token from database:", error);
        throw error;
      }

      console.log("Refresh token cleared from database");
    } catch (error) {
      console.error("Error clearing refresh token:", error);
      throw error;
    }
  },

  /**
   * Check if user is authorized (has valid token or can refresh)
   */
  isAuthorized: async (): Promise<boolean> => {
    const accessToken = await eagleViewOAuthService.getAccessToken();
    return accessToken !== null;
  },

  /**
   * Get access token for API calls
   */
  getAccessToken: async (): Promise<string> => {
    const token = eagleViewOAuthService.getCachedToken();

    // If token doesn't exist or is expired, try to refresh it
    if (!token) {
      console.log("No valid token found, attempting to refresh...");
      try {
        const newToken = await eagleViewOAuthService.refreshToken();
        return newToken.access_token;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        throw new Error("Not authorized. Please connect to Eagleview in settings.");
      }
    }

    return token.access_token;
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<EagleViewOAuthToken> => {
    try {
      console.log("Refreshing access token");

      // Get location_id from GHL credentials
      const locationId = getLocationIdFromStorage();
      if (!locationId) {
        throw new Error("Location ID not found. Please connect to GHL first.");
      }

      // Fetch credentials from database
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select(
          "eagleview_api_refresh_token, eagleview_api_client_id"
        )
        .eq("location_id", locationId)
        .single();

      if (error || !profile) {
        console.error("Error fetching user profile:", error);
        throw new Error("Failed to fetch user profile from database");
      }

      const {
        eagleview_api_refresh_token: refreshToken,
        eagleview_api_client_id: clientId,
      } = profile;

      if (!refreshToken || !clientId) {
        throw new Error(
          "Eagleview credentials not found. Please configure OAuth settings."
        );
      }

      // Prepare form data for refresh token grant
      const formData = new URLSearchParams();
      formData.append("grant_type", "refresh_token");
      formData.append("refresh_token", refreshToken);
      formData.append("client_id", clientId);

      const response = await fetch(EAGLEVIEW_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token refresh failed:", response.status, errorText);
        throw new Error(`Failed to refresh token: ${response.status}`);
      }

      const tokenData = await response.json();

      // Create and cache token
      const token = createTokenFromResponse(tokenData);
      eagleViewOAuthService.cacheToken(token);

      // Store/update refresh_token in database if provided
      if (tokenData.refresh_token) {
        await storeRefreshTokenInDatabase(tokenData.refresh_token);
      }

      console.log("Successfully refreshed access token");
      return token;
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  },
};
