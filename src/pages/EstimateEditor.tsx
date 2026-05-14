import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardNav from "@/components/DashboardNav";
import { useEstimateData } from "@/hooks/use-estimate-data";
import EstimateEditorLoading from "@/components/estimates/EstimateEditorLoading";
import EstimateEditorError from "@/components/estimates/EstimateEditorError";
import EstimatesEditorV3 from "@/components/estimates-v2/EstimatesEditorV3";

const EstimateEditorPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isLoading, opportunity } = useEstimateData();

  const handleBackToJob = () => {
    if (opportunity?.id.startsWith("contact-")) {
      // This is a contact-based estimate, go back to contact view
      const contactId = opportunity.id.replace("contact-", "");
      navigate(`/?contactId=${contactId}`);
    } else if (opportunity) {
      navigate(`/?opportunityId=${opportunity.id}`);
    }
  };

  if (isLoading) {
    return <EstimateEditorLoading showNav={!isMobile} />;
  }

  if (!opportunity) {
    return (
      <EstimateEditorError
        message="The opportunity associated with this estimate could not be found. Some features may be limited."
        showNav={!isMobile}
      />
    );
  }

  if (!opportunity) {
    return (
      <EstimateEditorError
        message="No opportunity found. Please select an opportunity first."
        showNav={!isMobile}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col pb-[60px]">
      {!isMobile && <DashboardNav />}
      <div className="container max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <Button variant="outline" className="gap-2" onClick={handleBackToJob}>
            <ArrowLeft className="h-4 w-4" />
            {opportunity?.id.startsWith("contact-")
              ? "Back to Contact"
              : "Back to Job"}
          </Button>
        </div>
        {/* Commented old quote editor */}
        {/* <EstimateEditorSelector
          opportunity={opportunity}
          onSave={handleSaveEstimate}
          onSend={handleSendEstimate}
          credentials={credentials}
        /> */}

        <EstimatesEditorV3 handleBackToJob={handleBackToJob} />
      </div>
    </div>
  );
};

export default EstimateEditorPage;
