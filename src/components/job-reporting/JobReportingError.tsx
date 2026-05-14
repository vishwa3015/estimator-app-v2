
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

const JobReportingError = () => (
  <div className="container mx-auto py-8 px-4">
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p>Failed to load job reporting data. Please try again later.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/">Return to Dashboard</Link>
        </Button>
      </AlertDescription>
    </Alert>
  </div>
);

export default JobReportingError;
