
import { User, Phone, Mail, UserCog } from "lucide-react";
import { GHLOpportunity } from "@/types/ghl";
import { cn } from "@/lib/utils";

interface OpportunityListItemProps {
  opportunity: GHLOpportunity;
  isSelected: boolean;
  onSelect: (opportunity: GHLOpportunity) => void;
  assignedUserNames: Record<string, string>;
}

const OpportunityListItem = ({ 
  opportunity, 
  isSelected, 
  onSelect,
  assignedUserNames
}: OpportunityListItemProps) => {
  
  const getContactName = (opportunity: GHLOpportunity) => {
    if (opportunity.contact?.name) {
      return opportunity.contact.name;
    } else if (opportunity.contact?.firstName && opportunity.contact?.lastName) {
      return `${opportunity.contact.firstName} ${opportunity.contact.lastName}`;
    } else if (opportunity.contactName) {
      return opportunity.contactName;
    }
    return "No contact";
  };

  const getAssignedUserName = (opportunity: GHLOpportunity) => {
    if (opportunity.user?.name) {
      return opportunity.user.name;
    }
    
    if (opportunity.contact?.user?.name) {
      return opportunity.contact.user.name;
    }
    
    if (opportunity.assignedTo && typeof opportunity.assignedTo === 'string') {
      return assignedUserNames[opportunity.assignedTo] || opportunity.assignedTo;
    }
    
    return null;
  };

  return (
    <button
      onClick={() => onSelect(opportunity)}
      className={cn(
        "w-full text-left p-3 rounded-md transition-colors hover:bg-muted",
        isSelected ? "bg-primary/10 border-l-4 border-primary" : ""
      )}
    >
      <div className="font-medium truncate">{opportunity.name}</div>
      
      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        <span className="truncate">{getContactName(opportunity)}</span>
      </div>
      
      {opportunity.contact?.phone && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span className="truncate">{opportunity.contact.phone}</span>
        </div>
      )}
      
      {opportunity.contact?.email && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          <span className="truncate">{opportunity.contact.email}</span>
        </div>
      )}
      
      {getAssignedUserName(opportunity) && (
        <div className="mt-1 flex items-center gap-1 text-xs font-medium text-primary/70">
          <UserCog className="h-3 w-3" />
          Assigned: {getAssignedUserName(opportunity)}
        </div>
      )}
      
      <div className="mt-1 flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Value: ${opportunity.value ? opportunity.value.toLocaleString() : "0"}
        </div>
        <div className="text-xs bg-muted px-2 py-0.5 rounded-full">
          {opportunity.status || "open"}
        </div>
      </div>
    </button>
  );
};

export default OpportunityListItem;
