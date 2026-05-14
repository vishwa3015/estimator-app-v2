
import React from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ReportHeaderProps {
  onExportCSV: () => void;
}

const ReportHeader = ({ onExportCSV }: ReportHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
      <div className="flex items-center">
        <Button variant="outline" size="icon" className="mr-4" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl sm:text-3xl font-bold">Financial Reporting</h1>
      </div>
      
      <Button variant="outline" onClick={onExportCSV} className="flex items-center gap-2 w-full sm:w-auto">
        <Download className="h-4 w-4" />
        Export to CSV
      </Button>
    </div>
  );
};

export default ReportHeader;
