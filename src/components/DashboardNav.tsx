
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, Settings } from "lucide-react";

const DashboardNav = () => {
  const location = useLocation();
  
  // Check if current route is related to estimates
  const isEstimateRoute = 
    location.pathname.includes('/create-estimate') || 
    location.pathname.includes('/estimates/');
  
  // Hide navigation on estimate creation/editing routes
  if (isEstimateRoute) {
    return null;
  }

  return (
    <div className="flex items-center justify-between mb-4 sm:mb-6 border-b pb-4">
      <div className="flex gap-2 sm:gap-4 desktop:gap-6 w-full overflow-x-auto pb-1">
        <Button
          variant={location.pathname === "/" ? "default" : "outline"}
          size="sm"
          className="flex-1 min-w-[100px] desktop:min-w-[120px] desktop:text-base"
          asChild
        >
          <Link to="/">
            <Briefcase className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Jobs</span>
          </Link>
        </Button>
        <Button
          variant={location.pathname === "/settings" ? "default" : "outline"}
          size="sm"
          className="flex-1 min-w-[100px] desktop:min-w-[120px] desktop:text-base"
          asChild
        >
          <Link to="/settings">
            <Settings className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Settings</span>
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default DashboardNav;
