import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, Send, UserCheck } from "lucide-react";
import { GHLContact, GHLCredentials, GHLOpportunity, GHLUser, JobCost } from "@/types/ghl";
import { ghlService } from "@/services/ghl";
import { toast } from "@/hooks/use-toast";

// AFTER
interface SendEstimateDialogProps {
  credentials: GHLCredentials;
  opportunity?: GHLOpportunity;
  jobCost?: JobCost | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  contact?: GHLContact;
  handleSendEstimate: (email: string, subject: string, userInfo: GHLUser | null, message?: string, flowType?: 'approval' | 'customer') => Promise<void>;
}

const SendEstimateDialog = ({ credentials, opportunity, jobCost, open, setOpen, contact, handleSendEstimate }: SendEstimateDialogProps) => {
  const [subject, setSubject] = useState(`Estimate for ${contact?.fullNameLowerCase ? contact.fullNameLowerCase : contact?.email}`);
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<GHLUser | null>(null);
  const [email, setEmail] = useState("");
  const [selectedFlow, setSelectedFlow] = useState<'approval' | 'customer' | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedFlow(null);
      setIsLoading(false);
    }
  }, [open]);

  // Fetch assigned user info
  useEffect(() => {
    if (!contact?.assignedTo) return;

    (async () => {
      try {
        const fetchedUserInfo = await ghlService.getUserById(credentials, contact.assignedTo);
        setUserInfo(fetchedUserInfo);
        setEmail(fetchedUserInfo?.email || "");
      } catch (error) {
        console.error("Error fetching user info:", error);
        toast({
          title: "Error",
          description: "Failed to load assigned agent details. You may not be able to send for approval.",
          variant: "destructive",
        });
      }
    })();
  }, [contact?.assignedTo, credentials]);

  // Handle send email
  const handleSendEmail = async () => {
    if (!subject.trim()) {
      toast({
        title: "Error",
        description: "Subject is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedFlow === 'approval' && !email) {
      toast({
        title: "Error",
        description: "Email is required to send for approval",
        variant: "destructive",
      });
      return;
    }

    if (selectedFlow === 'customer') {
      const customerEmail = contact?.email?.trim();
      if (!customerEmail) {
        toast({
          title: "Error",
          description: "This contact has no email address. Add one in GHL before sending.",
          variant: "destructive",
        });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        toast({
          title: "Error",
          description: "The contact's email address is invalid. Update it in GHL before sending.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const recipientEmail =
        selectedFlow === "customer"
          ? String(contact?.email ?? "").trim()
          : email;

      await handleSendEstimate(
        recipientEmail,
        subject,
        userInfo,
        undefined,
        selectedFlow,
      );
      setOpen(false);
    } catch (error) {
      console.error("Failed to send estimate email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent dialog from closing while loading
  const handleOpenChange = (val: boolean) => {
    if (isLoading) return;
    setOpen(val);
  };

  if (!selectedFlow) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Estimate</DialogTitle>
            <DialogDescription>
              Choose how you'd like to send this estimate
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-6">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary"
              disabled={!contact?.assignedTo}
              onClick={() => setSelectedFlow('approval')}
            >
              <UserCheck className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Internal Approval Flow</div>
                <div className="text-sm text-muted-foreground">Send to sales agent for approval</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary"
              onClick={() => setSelectedFlow('customer')}
            >
              <Send className="h-8 w-8" />
              <div className="text-center">
                <div className="font-semibold">Customer Flow</div>
                <div className="text-sm text-muted-foreground">Send directly to customer</div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            Send Estimate Email
          </DialogTitle>

        </DialogHeader>

        {selectedFlow === 'approval' ? (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Sales Agent Email</label>
                <Input
                  value={email}
                  disabled
                  className="h-12"
                  placeholder="Loading agent email..."
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Subject</label>
                <Input value={subject} disabled className="h-12" />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleSendEmail} disabled={isLoading || !email}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send for Approval"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
             <div className="py-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-600 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <p className="text-center text-[22px] text-gray-700">
                  Are you sure you want to send this estimate to{" "}
                  <span className="font-semibold">
                    {contact?.fullNameLowerCase || contact?.firstName || "the customer"}
                  </span>
                  ?
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Send Estimate
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendEstimateDialog;
