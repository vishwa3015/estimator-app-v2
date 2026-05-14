
import React, { useState, useEffect } from "react";
import { GHLOpportunity, JobCost, GHLCredentials, GHLUser } from "@/types/ghl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import EstimateHistory from "../estimates/EstimateHistory";
import OpportunityEstimates from "../estimates/OpportunityEstimates";
import { ghlService } from "@/services/ghl";

interface JobContentProps {
  selectedOpportunity: GHLOpportunity;
  credentials: GHLCredentials;
  jobCost: JobCost | null;
}

const JobContent = ({ selectedOpportunity, credentials, jobCost }: JobContentProps) => {
  const [assignedUser, setAssignedUser] = useState<GHLUser | null>(null);

  useEffect(() => {
    const fetchAssignedUser = async () => {
      if (selectedOpportunity.assignedTo) {
        try {
          const user = await ghlService.getUserById(credentials, selectedOpportunity.assignedTo);
          setAssignedUser(user);
        } catch (error) {
          console.error("Error fetching assigned user:", error);
        }
      }
    };

    fetchAssignedUser();
  }, [selectedOpportunity.assignedTo, credentials]);

  // Helper to get the most reliable contact name
  const getContactName = () => {
    if (selectedOpportunity.contactName) {
      return selectedOpportunity.contactName;
    }
    
    if (selectedOpportunity.contact?.name) {
      return selectedOpportunity.contact.name;
    }
    
    if (selectedOpportunity.contact?.firstName && selectedOpportunity.contact?.lastName) {
      return `${selectedOpportunity.contact.firstName} ${selectedOpportunity.contact.lastName}`;
    }
    
    if (selectedOpportunity.contact?.firstName) {
      return selectedOpportunity.contact.firstName;
    }
    
    return '';  // Return empty string instead of "No contact associated"
  };

  // Helper to get the most reliable assigned user name
  const getAssignedUserName = () => {
    // First check if we have fetched user data
    if (assignedUser?.name) {
      return assignedUser.name;
    }
    
    // Then check direct user object
    if (selectedOpportunity.user?.name) {
      return selectedOpportunity.user.name;
    }
    
    // Then check contact's associated user
    if (selectedOpportunity.contact?.user?.name) {
      return selectedOpportunity.contact.user.name;
    }
    
    return '';
  };

  const hasAssignedUser = Boolean(selectedOpportunity.assignedTo);

  return (
    <div className="space-y-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-4">
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Opportunity Name</span>
              <span className="block">{selectedOpportunity.name}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Value</span>
              <span className="block">{formatCurrency(selectedOpportunity.value)}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Status</span>
              <span className="block">{selectedOpportunity.status}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Created Date</span>
              <span className="block">{format(new Date(selectedOpportunity.createdAt), 'MMM d, yyyy')}</span>
            </div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Contact</span>
              <span className="block">
                {getContactName()}
              </span>
            </div>
            <div>
              <span className="block text-sm font-medium text-muted-foreground">Assigned To</span>
              <span className="block">
                {hasAssignedUser ? getAssignedUserName() || 'Loading...' : 'Unassigned'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <OpportunityEstimates opportunity={selectedOpportunity} />
      
      <EstimateHistory 
        credentials={credentials} 
        opportunity={selectedOpportunity}
        jobCost={jobCost}
      />
    </div>
  );
};

export default JobContent;

