import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { eagleViewOAuthService } from "@/services/eagleview/oauth-service";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GHLCredentials } from "@/types/ghl";

const EagleViewOAuthSettings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    // Check if already authorized (this will attempt token refresh if needed)
    const checkAuthorization = async () => {
      const authorized = await eagleViewOAuthService.isAuthorized();
      setIsAuthorized(authorized);
    };

    checkAuthorization();

    // Get client ID from user_profiles table
    const fetchCredentials = async () => {
      try {
        const storedGHLCredentials = localStorage.getItem("smartroofing_credentials");
        if (!storedGHLCredentials) return;

        const ghlCredentials: GHLCredentials = JSON.parse(storedGHLCredentials);
        const locationId = ghlCredentials.companyId;

        if (!locationId) return;

        const { data, error } = await supabase
          .from('user_profiles')
          .select('eagleview_api_client_id')
          .eq('location_id', locationId)
          .single();

        if (!error && data?.eagleview_api_client_id) {
          setClientId(data.eagleview_api_client_id);
        }
      } catch (error) {
        console.error("Error fetching credentials:", error);
      }
    };

    fetchCredentials();
  }, []);

  useEffect(() => {
    // Handle OAuth callback - Eagleview redirects directly to /settings
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      toast.error(`OAuth Error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`);
      // Clean up URL params
      searchParams.delete("error");
      searchParams.delete("error_description");
      setSearchParams(searchParams);
      return;
    }

    if (code) {
      handleOAuthCallback(code, state || undefined);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string, state?: string) => {
    setIsLoading(true);
    try {
      // Get credentials from database
      const storedGHLCredentials = localStorage.getItem("smartroofing_credentials");
      if (!storedGHLCredentials) {
        throw new Error("GHL credentials not found. Please reconnect to GHL.");
      }

      const ghlCredentials: GHLCredentials = JSON.parse(storedGHLCredentials);
      const locationId = ghlCredentials.companyId;

      if (!locationId) {
        throw new Error("Location ID not found.");
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('eagleview_api_client_id')
        .eq('location_id', locationId)
        .single();

      if (error || !data?.eagleview_api_client_id) {
        throw new Error("Eagleview Client ID not configured. Please add it in the database.");
      }

      const clientId = data.eagleview_api_client_id;

      // Exchange code for token (PKCE flow - no client secret needed)
      await eagleViewOAuthService.exchangeCodeForToken(code, clientId, state);

      setIsAuthorized(true);

      // Clean up URL params
      searchParams.delete("code");
      searchParams.delete("state");
      setSearchParams(searchParams);
    } catch (error) {
      console.error("Error handling OAuth callback:", error);
      toast.error(error instanceof Error ? error.message : "Failed to complete authorization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Get credentials from database
      const storedGHLCredentials = localStorage.getItem("smartroofing_credentials");
      if (!storedGHLCredentials) {
        toast.error("Please connect to GHL first.");
        setIsLoading(false);
        return;
      }

      const ghlCredentials: GHLCredentials = JSON.parse(storedGHLCredentials);
      const locationId = ghlCredentials.companyId;

      if (!locationId) {
        toast.error("Location ID not found.");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('eagleview_api_client_id')
        .eq('location_id', locationId)
        .single();

      if (error || !data?.eagleview_api_client_id) {
        toast.error("Eagleview Client ID not configured. Please add them in the database.");
        setIsLoading(false);
        return;
      }

      const clientId = data.eagleview_api_client_id;

      // Initiate OAuth flow
      await eagleViewOAuthService.initiateAuthorization(clientId);
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      toast.error(error instanceof Error ? error.message : "Failed to initiate authorization");
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    eagleViewOAuthService.clearTokenCache();
    await eagleViewOAuthService.clearRefreshToken();
    setIsAuthorized(false);
    toast.success("Disconnected from Eagleview");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Eagleview Integration
              {isAuthorized ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect your Eagleview account to access measurement and report services
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Authorization Status: {isAuthorized ? "Authorized" : "Not Authorized"}
          </p>
        </div>

        <div className="flex gap-2">
          {!isAuthorized ? (
            <Button onClick={handleConnect} disabled={isLoading || !clientId}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect to Eagleview
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleDisconnect} disabled={isLoading}>
              Disconnect
            </Button>
          )}
        </div>

        {!clientId && (
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-4 text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Configuration Required</p>
            <p>
              Please ensure your Eagleview API credentials (Client ID and Client Secret) are
              configured in your user profile before connecting.
            </p>
          </div>
        )}

        <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
          <p className="font-medium">About OAuth Authorization</p>
          <p className="text-muted-foreground">
            Clicking "Connect to Eagleview" will redirect you to Eagleview's authorization page.
            After approving access, you'll be redirected back to this page where the connection
            will be completed automatically.
          </p>
          <p className="text-muted-foreground">
            This uses the OAuth 2.0 Authorization Code flow for secure user authorization.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EagleViewOAuthSettings;
