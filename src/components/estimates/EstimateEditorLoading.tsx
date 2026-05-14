
import React from "react";
import DashboardNav from "@/components/DashboardNav";
import { Loader2 } from "lucide-react";

interface EstimateEditorLoadingProps {
  showNav?: boolean;
}

const EstimateEditorLoading: React.FC<EstimateEditorLoadingProps> = ({ showNav = true }) => {
  return (
    <div className="flex min-h-screen flex-col">
      {showNav && <DashboardNav />}
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
};

export default EstimateEditorLoading;
