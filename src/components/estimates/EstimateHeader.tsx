import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import EstimateActions from "./EstimateActions";
import { EstimateDocument, EstimateTemplate } from "@/types/estimate-items";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useEstimateData } from "@/hooks/use-estimate-data";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import moment from 'moment';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface EstimateHeaderProps {
  title: string;
  onSave: (title: string) => Promise<{ id?: string } | void>;
  onDelete?: () => Promise<{ success: boolean }>;
  opportunityId: string;
  contactId?: string;
  formValues?: Record<string, unknown>;
  sectionUpdates?: Record<string, unknown>[];
  configId?: string;
  onCancel?: () => void;
  configurations?: Array<{ id: string; config_name?: string }>;
  onConfigSelect?: (configId: string) => void;
  isLocked?: boolean;
  selectedOpportunityId?: string;
}

const EstimateHeader: React.FC<EstimateHeaderProps> = ({
  title,
  onSave,
  onDelete,
  opportunityId,
  contactId,
  formValues,
  sectionUpdates,
  configId,
  onCancel,
  configurations,
  onConfigSelect,
  isLocked = false,
  selectedOpportunityId,
}) => {
  const { estimate } = useEstimateData();
  const { toast } = useToast();
  const { estimateId } = useParams();
  const [openSaveDialogue, setOpenSaveDialogue] = useState(() => !estimateId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inputTitle, setTitle] = useState(`Estimate - ${moment().format('MM/DD/YYYY')}`);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate()
  const [selectedConfigId, setSelectedConfigId] = useState<string>(configId || "");

  useEffect(() => {
    if (estimate?.config_data?.title) {
      setTitle(estimate.config_data.title);
    }
  }, [estimate]);

  useEffect(() => {
    if (configId && configId !== selectedConfigId) {
      setSelectedConfigId(configId);
    }
  }, [configId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;
    setIsLoading(true);
    try {
      const savedEstimate = await onSave(inputTitle.trim());
      if (!estimateId && savedEstimate && savedEstimate.id) {
        navigate(`/create-estimate-for-contact/${contactId}/${savedEstimate.id}`);
      }
      setOpenSaveDialogue(false);
      toast({
        title: estimateId ? "Title updated" : "Estimate created!",
        description: estimateId
          ? "Estimate name has been updated."
          : "You can now customize your estimate.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save estimate",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (estimateId) {
      setOpenSaveDialogue(false);
    }
  }, [estimateId]);

  const handleCancel = () => {
    setOpenSaveDialogue(false);
    if (estimateId) {
      navigate(`/create-estimate-for-contact/${contactId}/${estimateId}`, { replace: true });
    } else if (onCancel) {
      onCancel();
    }
  };

  const showTemplateSelector =
    !estimateId && configurations && configurations.length > 1;

  return (
    <>
      <Dialog
        open={openSaveDialogue}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCancel();
          } else {
            setOpenSaveDialogue(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {estimate?.id ? "Update Estimate" : "Create Estimate"}
            </DialogTitle>
            <DialogDescription>
              {estimate?.id
                ? "Update an existing estimate that can be shared directly from here"
                : "Create an estimate that can be shared directly from here"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="estimate-name">Estimate Name</Label>
              <Input
                id="estimate-name"
                value={inputTitle}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. App Quote, Budget"
                required
              />
            </div>

            {showTemplateSelector && (
              <div className="space-y-2">
                <Label htmlFor="template-select">Default Estimate Template</Label>
                <Select
                  value={selectedConfigId}
                  onValueChange={(val) => {
                    setSelectedConfigId(val);
                    onConfigSelect?.(val);
                  }}
                >
                  <SelectTrigger id="template-select" className="w-full">
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {configurations.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.config_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The selected template's sections and defaults will be applied to this estimate.
                </p>
              </div>
            )}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading
                      ? estimate?.id
                        ? "Updating.."
                        : "Creating..."
                      : estimate?.id
                        ? "Update Estimate"
                        : "Save"}
                  </Button>
                </div>
              </form>
        </DialogContent>
      </Dialog>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold truncate">
                  {estimate?.config_data?.title || inputTitle || title}
                </h1>
              </div>
              <p className="text-muted-foreground mt-1">
                Estimate #{estimate?.id || 'New'}
              </p>
            </div>
            <div className="flex-shrink-0">
              <EstimateActions
                onSave={() => setOpenSaveDialogue(true)}
                onDelete={onDelete}
                opportunityId={opportunityId}
                contactId={contactId}
                formValues={formValues}
                sectionUpdates={sectionUpdates}
                configId={configId}
                isLocked={isLocked}
                selectedOpportunityId={selectedOpportunityId}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default EstimateHeader;
