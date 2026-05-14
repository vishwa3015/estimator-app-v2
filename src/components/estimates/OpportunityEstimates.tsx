
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, ExternalLink, Trash2 } from "lucide-react";
import { GHLOpportunity } from "@/types/ghl";
import { EstimateDocument } from "@/types/estimate-items";
import { estimateService } from "@/services/estimates";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";  // Updated import path
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OpportunityEstimatesProps {
  opportunity: GHLOpportunity;
}

const OpportunityEstimates: React.FC<OpportunityEstimatesProps> = ({
  opportunity
}) => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState<EstimateDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadEstimates = async () => {
      setIsLoading(true);
      try {
        const loadedEstimates = await estimateService.getEstimates(opportunity.id);
        setEstimates(loadedEstimates);
      } catch (error) {
        console.error("Error loading estimates:", error);
        toast({
          title: "Error",
          description: "Failed to load estimates",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEstimates();
  }, [opportunity.id]);
  
  const handleCreateEstimate = () => {
    navigate(`/create-estimate/${opportunity.id}`);
  };
  
  const handleViewEstimate = (estimateId: string) => {
    navigate(`/estimates/${estimateId}`);
  };
  
  const handleDeleteEstimate = async (estimateId: string) => {
    try {
      await estimateService.deleteEstimate(estimateId);
      setEstimates(estimates.filter(est => est.id !== estimateId));
      
      toast({
        title: "Success",
        description: "Estimate deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting estimate:", error);
      toast({
        title: "Error",
        description: "Failed to delete estimate",
        variant: "destructive"
      });
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'draft':
        return "bg-gray-200 text-gray-800";
      case 'sent':
        return "bg-blue-100 text-blue-800";
      case 'accepted':
        return "bg-green-100 text-green-800";
      case 'declined':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Estimates</CardTitle>
          <Button onClick={handleCreateEstimate} className="gap-1">
            <Plus size={16} />
            Create Estimate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading estimates...
          </div>
        ) : estimates.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No estimates created yet. Click "Create Estimate" to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {estimates.map(estimate => (
              <div 
                key={estimate.id}
                className="border rounded p-4 hover:border-primary cursor-pointer transition-colors"
                onClick={() => handleViewEstimate(estimate.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText size={16} />
                      <h3 className="font-medium">
                        {estimate.title || `Estimate #${estimate.number}`}
                      </h3>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Created: {format(new Date(estimate.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusBadgeClass(estimate.status)}`}>
                      {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(estimate.total)}
                    </span>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this estimate? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEstimate(estimate.id);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <ExternalLink size={14} className="mr-1" />
                  <span className="text-primary underline">
                    {estimateService.generateEstimateLink(estimate.id)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OpportunityEstimates;
