import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EagleViewTokenResponse, EagleViewAuthCache } from "@/types/eagleview";
import { GHLCredentials } from "@/types/ghl";

// Configuration constants
const EAGLEVIEW_AUTH_URL = "https://apicenter.eagleview.com/oauth2/v1/token";
const EAGLEVIEW_TOKEN_CACHE_KEY = "eagleview_auth_token";
const GHL_CREDENTIALS_KEY = "smartroofing_credentials";
const TOKEN_REFRESH_BUFFER = 300; // 5 minutes buffer before expiration

export const eagleViewAuthService = {
  /**
   * Get EagleView credentials from Supabase user_profiles table
   */
  getCredentialsFromDatabase: async (): Promise<{ clientId: string; clientSecret: string } | null> => {
    try {
      // Get current user's location_id from GHL credentials
      const storedGHLCredentials = localStorage.getItem(GHL_CREDENTIALS_KEY);
      if (!storedGHLCredentials) {
        console.warn("GHL credentials not found in localStorage");
        return null;
      }

      const ghlCredentials: GHLCredentials = JSON.parse(storedGHLCredentials);
      const locationId = ghlCredentials.companyId;

      if (!locationId) {
        console.warn("Location ID not found in GHL credentials");
        return null;
      }

      // Query user_profiles by location_id
      const { data, error } = await supabase
        .from('user_profiles')
        .select('eagleview_api_client_id, eagleview_api_client_secret')
        .eq('location_id', locationId)
        .single();

      if (error) {
        console.error("Error fetching Eagleview credentials from database:", error);
        return null;
      }

      if (!data?.eagleview_api_client_id || !data?.eagleview_api_client_secret) {
        console.warn("Eagleview credentials not found in user_profiles");
        return null;
      }

      return {
        clientId: data.eagleview_api_client_id,
        clientSecret: data.eagleview_api_client_secret,
      };
    } catch (error) {
      console.error("Error retrieving credentials from database:", error);
      return null;
    }
  },

  /**
   * Get a valid access token
   * If credentials not provided, retrieves them from database
   */
  getAccessToken: async (clientId?: string, clientSecret?: string): Promise<string> => {
    // Check for cached token
    const cachedToken = eagleViewAuthService.getCachedToken();
    if (cachedToken) {
      console.log("Using cached EagleView token");
      return cachedToken;
    }

    // Request new token
    console.log("Requesting new EagleView token");
    return await eagleViewAuthService.requestNewToken(clientId, clientSecret);
  },

  /**
   * Request a new access token from EagleView
   * If credentials not provided, retrieves them from database
   */
  requestNewToken: async (clientId?: string, clientSecret?: string): Promise<string> => {
    try {
      let finalClientId = clientId;
      let finalClientSecret = clientSecret;

      // If credentials not provided, retrieve from database
      if (!finalClientId || !finalClientSecret) {
        const dbCreds = await eagleViewAuthService.getCredentialsFromDatabase();
        if (!dbCreds) {
          toast.error("EagleView credentials not found. Please configure in the database.");
          throw new Error("EagleView client credentials are missing");
        }
        finalClientId = dbCreds.clientId;
        finalClientSecret = dbCreds.clientSecret;
      }

      // Encode credentials as Base64 for Basic Authentication
      const credentials = btoa(`${finalClientId}:${finalClientSecret}`);

      // Prepare form data for client credentials grant
      const formData = new URLSearchParams();
      formData.append("grant_type", "client_credentials");

      const response = await fetch(EAGLEVIEW_AUTH_URL, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("EagleView token request failed:", response.status, errorText);
        throw new Error(`Failed to obtain EagleView access token: ${response.status}`);
      }

      const tokenResponse: EagleViewTokenResponse = await response.json();

      // Cache the token
      eagleViewAuthService.cacheToken(tokenResponse);

      console.log("Successfully obtained EagleView access token");
      return tokenResponse.access_token;
    } catch (error) {
      console.error("Error requesting EagleView token:", error);
      toast.error("Failed to authenticate with EagleView");
      throw error;
    }
  },

  /**
   * Get cached token if it exists and is still valid
   */
  getCachedToken: (): string | null => {
    try {
      const cachedData = localStorage.getItem(EAGLEVIEW_TOKEN_CACHE_KEY);
      if (!cachedData) {
        return null;
      }

      const cache: EagleViewAuthCache = JSON.parse(cachedData);

      // Check if token is expired (with buffer)
      const now = Date.now();
      const expirationWithBuffer = cache.expires_at - (TOKEN_REFRESH_BUFFER * 1000);

      if (now >= expirationWithBuffer) {
        console.log("Cached EagleView token is expired");
        eagleViewAuthService.clearTokenCache();
        return null;
      }

      return cache.access_token;
    } catch (error) {
      console.error("Error retrieving cached token:", error);
      eagleViewAuthService.clearTokenCache();
      return null;
    }
  },

  /**
   * Cache the token response
   */
  cacheToken: (tokenResponse: EagleViewTokenResponse): void => {
    try {
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);

      const cache: EagleViewAuthCache = {
        access_token: tokenResponse.access_token,
        expires_at: expiresAt,
        token_type: tokenResponse.token_type,
      };

      localStorage.setItem(EAGLEVIEW_TOKEN_CACHE_KEY, JSON.stringify(cache));
      console.log("EagleView token cached successfully");
    } catch (error) {
      console.error("Error caching token:", error);
    }
  },

  /**
   * Clear the cached token
   */
  clearTokenCache: (): void => {
    try {
      localStorage.removeItem(EAGLEVIEW_TOKEN_CACHE_KEY);
      console.log("EagleView token cache cleared");
    } catch (error) {
      console.error("Error clearing token cache:", error);
    }
  },

  /**
   * Check if a valid cached token exists
   */
  isTokenValid: (): boolean => {
    const token = eagleViewAuthService.getCachedToken();
    return token !== null;
  },
};
