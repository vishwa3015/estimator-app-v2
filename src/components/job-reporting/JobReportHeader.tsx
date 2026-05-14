
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface JobReportHeaderProps {
  jobName?: string;
  opportunityId: string;
  onExportToPDF: () => void;
  onExportToCSV: () => void;
}

const JobReportHeader = ({ 
  jobName, 
  opportunityId,
  onExportToPDF,
  onExportToCSV 
}: JobReportHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center">
        <Button variant="outline" size="icon" className="mr-4" asChild>
          <Link to={`/?opportunityId=${opportunityId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Job Report</h1>
          {jobName && <p className="text-muted-foreground">{jobName}</p>}
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportToCSV}>
            <FileText className="h-4 w-4 mr-2" />
            Export to CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportToPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Export to PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default JobReportHeader;
