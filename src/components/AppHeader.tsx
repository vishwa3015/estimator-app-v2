import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { GHLCredentials } from "@/types/ghl";
import { CircleUserRound, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import OnboardingForm from "./OnboardingForm";

interface AppHeaderProps {
  credentials: GHLCredentials;
  onDisconnect: () => void;
  locationName?: string;
}

const AppHeader = ({ credentials, onDisconnect, locationName }: AppHeaderProps) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingFormOpen, setIsOnboardingFormOpen] = useState(false);

  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setShowOnboarding(false);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_profiles")
          .select("onboarding")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching onboarding status:", error);
          setShowOnboarding(false);
        } else {
          setShowOnboarding(data?.onboarding === true);
        }
      } catch (error) {
        console.error("Error in fetchOnboardingStatus:", error);
        setShowOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnboardingStatus();
  }, []);

  return (
    <>
      <header className="bg-white border-b py-3 px-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-primary">Estimates</h1>
          <p className="text-sm text-muted-foreground">
            Location: {locationName || credentials.companyId}
          </p>
        </div>
        <div className="flex gap-2">
          {!isLoading && showOnboarding && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsOnboardingFormOpen(true)}
            >
              <CircleUserRound className="h-4 w-4" />
              Onboard Contact
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            <LogOut className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </header>

      <OnboardingForm
        open={isOnboardingFormOpen}
        onOpenChange={setIsOnboardingFormOpen}
      />
    </>
  );
};

export default AppHeader;
