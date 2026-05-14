import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QuickMeasureOAuthToken, QuickMeasureTokenResponse, QuickMeasureUserProfile, SupabaseClientConfig } from "@/types/quickmeasure-types";

const QUICKMEASURE_TOKEN_CACHE_KEY = "quickmeasure_oauth_token";
const QUICKMEASURE_DISCONNECTED_KEY = "quickmeasure_disconnected";
const GHL_CREDENTIALS_KEY = "smartroofing_credentials";
const TOKEN_REFRESH_BUFFER = 300;

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

function createTokenFromResponse(tokenData: QuickMeasureTokenResponse): QuickMeasureOAuthToken {
  return {
    access_token: tokenData.access_token,
    expires_at: Date.now() + tokenData.expires_in * 1000,
    token_type: tokenData.token_type,
  };
}

export const quickMeasureOAuthService = {

  getCredentialsFromDatabase: async (): Promise<{
    clientId: string;
    clientSecret: string;
    audience: string;
    scope: string;
  } | null> => {
    try {
      const locationId = getLocationIdFromStorage();
      if (!locationId) {
        console.warn("Location ID not found in GHL credentials");
        return null;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select(
          "quickmeasure_client_id, quickmeasure_client_secret, quickmeasure_audience, quickmeasure_scope"
        )
        .eq("location_id", locationId)
        .single();

      if (error) {
        console.error("Error fetching QuickMeasure credentials from database:", error);
        return null;
      }

      const userProfile = data as unknown as QuickMeasureUserProfile;

      if (
        !userProfile?.quickmeasure_client_id ||
        !userProfile?.quickmeasure_client_secret ||
        !userProfile?.quickmeasure_audience
      ) {
        console.warn("QuickMeasure credentials not found in user_profiles");
        return null;
      }

      return {
        clientId: userProfile.quickmeasure_client_id,
        clientSecret: userProfile.quickmeasure_client_secret,
        audience: userProfile.quickmeasure_audience,
        scope:
          userProfile.quickmeasure_scope
      };
    } catch (error) {
      console.error("Error retrieving credentials from database:", error);
      return null;
    }
  },


  getCachedToken: (): QuickMeasureOAuthToken | null => {
    try {
      const cached = localStorage.getItem(QUICKMEASURE_TOKEN_CACHE_KEY);
      if (!cached) return null;

      const token: QuickMeasureOAuthToken = JSON.parse(cached);

      const now = Date.now();
      const bufferMs = TOKEN_REFRESH_BUFFER * 1000;
      if (now >= token.expires_at - bufferMs) {
        quickMeasureOAuthService.clearTokenCache();
        return null;
      }

      return token;
    } catch (error) {
      console.error("Error retrieving cached QuickMeasure OAuth token:", error);
      quickMeasureOAuthService.clearTokenCache();
      return null;
    }
  },

  cacheToken: (token: QuickMeasureOAuthToken): void => {
    try {
      localStorage.setItem(QUICKMEASURE_TOKEN_CACHE_KEY, JSON.stringify(token));
    } catch (error) {
      console.error("Error caching QuickMeasure OAuth token:", error);
    }
  },

  clearTokenCache: (): void => {
    try {
      localStorage.removeItem(QUICKMEASURE_TOKEN_CACHE_KEY);
    } catch (error) {
      console.error("Error clearing QuickMeasure OAuth token cache:", error);
    }
  },

  setDisconnected: (disconnected: boolean): void => {
    try {
      if (disconnected) {
        localStorage.setItem(QUICKMEASURE_DISCONNECTED_KEY, "true");
      } else {
        localStorage.removeItem(QUICKMEASURE_DISCONNECTED_KEY);
      }
    } catch (error) {
      console.error("Error setting QuickMeasure disconnect state:", error);
    }
  },

  isDisconnected: (): boolean => {
    try {
      return localStorage.getItem(QUICKMEASURE_DISCONNECTED_KEY) === "true";
    } catch (error) {
      console.error("Error checking QuickMeasure disconnect state:", error);
      return false;
    }
  },

  requestNewToken: async (): Promise<QuickMeasureOAuthToken> => {
    try {
      const locationId = getLocationIdFromStorage();
      if (!locationId) {
        toast.error("Location ID not found. Please ensure you're logged into GHL.");
        throw new Error("Location ID not found in GHL credentials");
      }

      const supabaseConfig = supabase as unknown as SupabaseClientConfig;
      const supabaseUrl = supabaseConfig.supabaseUrl;
      const supabaseAnonKey = supabaseConfig.supabaseKey;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error("Supabase configuration not found");
        toast.error("Application configuration error");
        throw new Error("Supabase URL or Anon Key not configured");
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/quickmeasure`;
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          location_id: locationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Edge function call failed:", response.status, errorData);

        if (response.status === 404) {
          toast.error("QuickMeasure credentials not configured for your account");
        } else if (response.status === 400) {
          toast.error("QuickMeasure credentials are incomplete");
        } else if (response.status === 500) {
          toast.error("Server error: " + (errorData.message || "Failed to get token"));
        } else {
          toast.error("Failed to authenticate with QuickMeasure");
        }

        throw new Error(
          errorData.error || `Failed to obtain QuickMeasure access token: ${response.status}`
        );
      }

      const tokenData = await response.json();

      if (!tokenData.access_token || !tokenData.expires_in) {
        console.error("Invalid token response:", tokenData);
        toast.error("Received invalid token from server");
        throw new Error("Invalid token response from edge function");
      }

      const token = createTokenFromResponse(tokenData);
      quickMeasureOAuthService.cacheToken(token);
      toast.success("Successfully connected to QuickMeasure");
      return token;
    } catch (error) {
      console.error("Error requesting QuickMeasure token:", error);
      const errorMessage = (error as Error).message || "Unknown error";

      if (!errorMessage.includes("not configured") && !errorMessage.includes("not found")) {
        toast.error("Failed to authenticate with QuickMeasure: " + errorMessage);
      }
      throw error;
    }
  },

  getAccessToken: async (): Promise<string> => {
    const cachedToken = quickMeasureOAuthService.getCachedToken();
    if (cachedToken) {
      return cachedToken.access_token;
    }

    const newToken = await quickMeasureOAuthService.requestNewToken();
    return newToken.access_token;
  },

isAuthorized: async (): Promise<boolean> => {
  try {
    const cachedToken = quickMeasureOAuthService.getCachedToken();
    if (cachedToken) {
      quickMeasureOAuthService.setDisconnected(false);
      return true;
    }

    const locationId = getLocationIdFromStorage();
    if (locationId) {
      const { data } = await supabase
        .from("user_profiles")
        .select("quickmeasure_access_token, quickmeasure_token_expires_at")
        .eq("location_id", locationId)
        .single();

      if (data?.quickmeasure_access_token && data?.quickmeasure_token_expires_at) {
        const expiresAt = new Date(data.quickmeasure_token_expires_at).getTime();
        const bufferMs = TOKEN_REFRESH_BUFFER * 1000;
        if (expiresAt - bufferMs > Date.now()) {
          quickMeasureOAuthService.setDisconnected(false);
          quickMeasureOAuthService.cacheToken({
            access_token: data.quickmeasure_access_token,
            expires_at: expiresAt,
            token_type: "Bearer",
          });
          return true;
        }
      }
    }

    return false;
    } catch (error) {
      return false;
    }
  },

  testConnection: async (): Promise<boolean> => {
    try {
      quickMeasureOAuthService.setDisconnected(false);
      await quickMeasureOAuthService.getAccessToken();
      return true;
    } catch (error) {
      return false;
    }
  },
};