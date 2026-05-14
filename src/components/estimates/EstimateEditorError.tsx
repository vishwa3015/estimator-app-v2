
import React from "react";
import DashboardNav from "@/components/DashboardNav";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EstimateEditorErrorProps {
  message: string;
  showNav?: boolean;
}

const EstimateEditorError: React.FC<EstimateEditorErrorProps> = ({ message, showNav = true }) => {
  return (
    <div className="flex min-h-screen flex-col">
      {showNav && <DashboardNav />}
      <div className="container max-w-4xl mx-auto p-4">
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default EstimateEditorError;
