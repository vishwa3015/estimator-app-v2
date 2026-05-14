
import { Loader2 } from "lucide-react";

const JobReportingLoading = () => (
  <div className="container mx-auto py-8 px-4">
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  </div>
);

export default JobReportingLoading;
