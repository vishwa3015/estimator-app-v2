
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WelcomeCardProps {
  isLoading: boolean;
  isMobile: boolean;
}

const WelcomeCard = ({ isLoading, isMobile }: WelcomeCardProps) => {
  return (
    <Card className="mx-auto">
      <CardHeader>
        <CardTitle>Welcome to Estimates</CardTitle>
        <CardDescription>
          Track the estimates for your jobs
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center py-8">
        {isLoading ? (
          <div className="flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <p className="text-muted-foreground">
            {isMobile ? "Select a job to start" : "Select a job to start"}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;
