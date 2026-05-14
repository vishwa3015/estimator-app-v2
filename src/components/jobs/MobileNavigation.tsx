
import { MenuIcon, BarChart3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GHLOpportunity } from "@/types/ghl";
import OpportunitiesList from "../OpportunitiesList";
import { GHLCredentials } from "@/types/ghl";

interface MobileNavigationProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedOpportunity: GHLOpportunity | null;
  credentials: GHLCredentials;
  onSelectOpportunity: (opportunity: GHLOpportunity) => void;
}

const MobileNavigation = ({
  sidebarOpen,
  setSidebarOpen,
  selectedOpportunity,
  credentials,
  onSelectOpportunity
}: MobileNavigationProps) => {
  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <button className="p-2 mr-2 rounded-md border hover:bg-accent">
              <MenuIcon className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 sm:max-w-full">
            <div className="h-full overflow-y-auto">
              <OpportunitiesList 
                credentials={credentials} 
                onSelectOpportunity={onSelectOpportunity}
                selectedOpportunityId={selectedOpportunity?.id}
              />
            </div>
          </SheetContent>
        </Sheet>
        {selectedOpportunity && (
          <div className="truncate">
            <h2 className="text-lg font-semibold">{selectedOpportunity.name}</h2>
            <div className="text-xs text-muted-foreground">ID: {selectedOpportunity.id}</div>
          </div>
        )}
      </div>
      {selectedOpportunity && (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/job-report/${selectedOpportunity.id}`} className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Report</span>
          </Link>
        </Button>
      )}
    </div>
  );
};

export default MobileNavigation;
