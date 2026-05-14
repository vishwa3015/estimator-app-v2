
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ghlService } from "@/services/ghl";
import { GHLCredentials } from "@/types/ghl";
import { KeyRound, Loader2, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GHLConnectProps {
  onConnect: (credentials: GHLCredentials) => void;
}

const GHLConnect = ({ onConnect }: GHLConnectProps) => {
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const apiKeyParam = params.get("apiKey");
    const companyIdParam = params.get("companyId");
    const pitParam = params.get("pit") ?? "";

    if (apiKeyParam && companyIdParam) {
      setApiKey(apiKeyParam);
      setCompanyId(companyIdParam);

      const credentials: GHLCredentials = {
        pit: pitParam,
        apikey: apiKeyParam,
        companyId: companyIdParam
      };

      setIsAutoConnecting(true);
      validateAndConnect(credentials);
    }
  }, []);

  const validateAndConnect = async (credentials: GHLCredentials) => {
    setIsLoading(true);
    try {
      const isValid = await ghlService.validateCredentials(credentials);
      if (isValid) {
        onConnect(credentials);
        toast.success("Successfully connected");
      } else {
        toast.error("Invalid credentials. Please check your API Key and Location ID.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.error("Failed to connect. Please check your credentials.");
    } finally {
      setIsLoading(false);
      setIsAutoConnecting(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim() || !companyId.trim()) {
      toast.error("Please enter both API Key and Location ID");
      return;
    }

    const credentials: GHLCredentials = {
      pit: "",
      apikey: apiKey.trim(),
      companyId: companyId.trim()
    };

    validateAndConnect(credentials);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md shadow-lg animate-fade-in">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-smartroofing flex items-center justify-center">
            <KeyRound className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Connect to Job Cost Tracker</CardTitle>
          <CardDescription>
            {isAutoConnecting
              ? "Connecting automatically with provided credentials..."
              : "Enter your credentials to connect to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAutoConnecting && (
            <>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="companyId">Location ID</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Your Location ID can be found in the URL when you're logged into your account. Look for the string that appears after "/location/" in the address bar.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="companyId"
                  placeholder="Enter your Location ID"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This is the ID of the specific location you want to connect to
                </p>
              </div>
            </>
          )}
          {isAutoConnecting && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
        <CardFooter>
          {!isAutoConnecting && (
            <Button
              className="w-full bg-smartroofing hover:bg-smartroofing-hover"
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect to Job Cost Tracker"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default GHLConnect;
