
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Mail, FileText } from "lucide-react";
import { EstimateSent } from "@/types/estimates";
import { GHLCredentials, GHLOpportunity } from "@/types/ghl";
import { useQuery } from "@tanstack/react-query";
import { estimateService } from "@/services/ghl/estimateService";
import SendEstimateDialog from "./SendEstimateDialog";
import { JobCost } from "@/types/ghl";
import { UserInfo } from "@/types/estimate-items";

interface EstimateHistoryProps {
  credentials: GHLCredentials;
  opportunity: GHLOpportunity;
  jobCost: JobCost | null;
}

const EstimateHistory = ({ credentials, opportunity, jobCost }: EstimateHistoryProps) => {
  const [open, setOpen] = React.useState(false);
  
  const { data: estimates, isLoading } = useQuery({
    queryKey: ['estimates', opportunity.contactId],
    queryFn: () => estimateService.getEstimates(credentials, opportunity.contactId!),
    enabled: !!opportunity.contactId
  });

  if (!opportunity.contactId) {
    return null; // Return null instead of showing "No contact associated" message
  }

  const handleSendEstimate = async (email: string, subject: string, userInfo: UserInfo) => {
    // Placeholder - implement actual sending logic
    console.log("Sending estimate", { email, subject, userInfo });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Estimate History</h3>
        <SendEstimateDialog 
          credentials={credentials} 
          opportunity={opportunity}
          jobCost={jobCost}
          open={open}
          setOpen={setOpen}
          handleSendEstimate={handleSendEstimate}
        />
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="estimates">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Sent Estimates ({isLoading ? "..." : estimates?.length || 0})</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {isLoading ? (
              <div className="text-center py-4">Loading estimates...</div>
            ) : !estimates?.length ? (
              <div className="text-center py-4 text-muted-foreground">
                No estimates have been sent yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estimates.map((estimate) => (
                    <TableRow key={estimate.id}>
                      <TableCell>{format(new Date(estimate.sentAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {estimate.subject}
                      </TableCell>
                      <TableCell>{estimate.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default EstimateHistory;
