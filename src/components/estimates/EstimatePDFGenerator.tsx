
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Eye, MoreVerticalIcon, Trash2, Mail } from "lucide-react";
import { EstimatesActionsHandler } from "../estimates-v2/EstimatesActionsHandler";
import SendEstimateDialog from "./SendEstimateDialog";
import { useEstimateData } from "@/hooks/use-estimate-data";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

interface EstimatePDFGeneratorProps {
  opportunityId: string;
  contactId?: string;
  formValues?: Record<string, unknown>;
  sectionUpdates?: Record<string, unknown>[];
  configId?: string;
  onDelete?: () => Promise<{ success: boolean }>;
  isLocked?: boolean;
  selectedOpportunityId?: string;
}

const EstimatePDFGenerator: React.FC<EstimatePDFGeneratorProps> = ({
  opportunityId,
  contactId,
  formValues = {},
  sectionUpdates = [],
  configId,
  onDelete,
  isLocked = false,
  selectedOpportunityId
}) => {

  const [open, setOpen] = useState(false)
  const { contact, isLoading } = useEstimateData();
  const { estimateId } = useParams();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  

  let credentials;
  const storedCredentials = localStorage.getItem("smartroofing_credentials");
  if (storedCredentials) {
    try {
      credentials = (JSON.parse(storedCredentials));
    } catch (error) {
      console.error("Error parsing stored credentials:", error);
      localStorage.removeItem("smartroofing_credentials");
    }
  }

  if (isLoading) {
    return <p>Please wait....</p>
  }

  const handleDelete = async () => {
    if (!estimateId || !onDelete) {
      toast({
        title: "Error",
        description: "Cannot delete estimate",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const result = await onDelete();

      if (!result.success) {
        throw new Error('Failed to delete estimate');
      }
    } catch (error) {
      console.error('Error deleting estimate:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete estimate",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setDropdownOpen(false);
    }
  };

  return (
    <EstimatesActionsHandler
      formValues={formValues}
      sectionUpdates={sectionUpdates}
      opportunityId={opportunityId}
      contactId={contactId}
      configId={configId}
      estimateId={estimateId}
      selectedOpportunityId={selectedOpportunityId}
    >
      {({ handleViewFullEstimate, handleDownloadPDF, handleSendEstimate }) => (
        <>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <MoreVerticalIcon size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 space-y-2">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleViewFullEstimate();
                  setDropdownOpen(false);
                }}
                className="p-0 focus:bg-transparent"
              >
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-9"
                >
                  <Eye size={16} />
                  View Full Estimate
                </Button>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  handleDownloadPDF();
                  setDropdownOpen(false);
                }}
                className="p-0 focus:bg-transparent"
              >
                <Button className="w-full justify-start gap-2 h-9">
                  <FileDown size={16} />
                  Download PDF
                </Button>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  if (isLocked || !selectedOpportunityId) return; 
                  setOpen(true);
                  setDropdownOpen(false);
                }}
                className="p-0 focus:bg-transparent"
              >
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 h-9"
                  disabled={isLocked || !selectedOpportunityId}
                >
                  <Mail size={16} />
                  Send Estimate
                </Button>
              </DropdownMenuItem>
              {estimateId && onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    if (isLocked) return;
                    setShowDeleteDialog(true);
                    setDropdownOpen(false);
                  }}
                  className="p-0 focus:bg-transparent"
                >
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive"
                    disabled={isLocked}
                  >
                    <Trash2 size={16} />
                    Delete Estimate
                  </Button>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <SendEstimateDialog
            credentials={credentials}
            contact={contact}
            open={open}
            setOpen={setOpen}
            handleSendEstimate={handleSendEstimate}
          />
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the estimate
                  and remove all associated data including uploaded files, PDFs, and configurations.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? "Deleting..." : "Delete Estimate"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </EstimatesActionsHandler>
  );
};

export default EstimatePDFGenerator;
