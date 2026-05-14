
import { useState, useEffect, useCallback } from "react";
import { GHLCredentials, GHLOpportunity } from "@/types/ghl";
import { ghlService } from "@/services/ghl";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import OpportunityIdSearch from "./opportunities/OpportunityIdSearch";
import OpportunityFilter from "./opportunities/OpportunityFilter";
import OpportunityListItem from "./opportunities/OpportunityListItem";

interface OpportunitiesListProps {
  credentials: GHLCredentials;
  onSelectOpportunity: (opportunity: GHLOpportunity) => void;
  selectedOpportunityId?: string;
}

interface CachedOpportunities {
  opportunities: GHLOpportunity[];
}

const OpportunitiesList = ({ credentials, onSelectOpportunity, selectedOpportunityId }: OpportunitiesListProps) => {
  const [opportunities, setOpportunities] = useState<GHLOpportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<GHLOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [assignedUserNames, setAssignedUserNames] = useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const params = useParams();

  // Helper: Sorts opportunities by createdAt DESC
  const sortRecent = (arr: GHLOpportunity[]) => {
    return arr
      .slice()
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  };

  const fetchOpportunities = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      let cached: CachedOpportunities | null = null;
      try {
        const cachedOpportunities = localStorage.getItem('ghl_opportunities_list');
        if (cachedOpportunities && !isRefreshing) {
          cached = JSON.parse(cachedOpportunities);
          if (cached.opportunities) {
            const sorted = sortRecent(cached.opportunities);
            setOpportunities(sorted);
            setFilteredOpportunities(sorted.slice(0, 20));
            if (showLoading) setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("Error reading cached opportunities:", e);
      }

      // Fetch fresh data, update all state on success
      const data = await ghlService.getOpportunities(credentials);
      const processedData = sortRecent(
        data.map(opp => ({
          ...opp,
          value: opp.value || opp.monetaryValue || 0
        }))
      );
      setOpportunities(processedData);
      // Only show most recent 20 initially
      setFilteredOpportunities(processedData.slice(0, 20));

      const userIds = new Set<string>();
      processedData.forEach(opp => {
        if (opp.assignedTo && typeof opp.assignedTo === 'string') {
          userIds.add(opp.assignedTo);
        }
      });

      if (userIds.size > 0) {
        try {
          const userNamesMap: Record<string, string> = {};
          for (const userId of userIds) {
            try {
              const userData = await ghlService.getUserById(credentials, userId);
              if (userData && userData.name) {
                userNamesMap[userId] = userData.name;
              }
            } catch (error) {
              console.error(`Error fetching user data for ID ${userId}:`, error);
            }
          }
          setAssignedUserNames(userNamesMap);
        } catch (error) {
          console.error("Error fetching user names:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      toast.error("Failed to fetch opportunities");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [credentials, isRefreshing]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  useEffect(() => {
    if (searchTerm) {
      // Search ALL opportunities (not just top 20)
      const filtered = opportunities.filter(opp => 
        (opp.name && opp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (opp.id && opp.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (opp.contact?.name && opp.contact.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (opp.contact?.email && opp.contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (opp.contact?.phone && opp.contact.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredOpportunities(filtered);
    } else {
      // Show only top 20 most recent by default
      setFilteredOpportunities(opportunities.slice(0, 20));
    }
  }, [searchTerm, opportunities]);

  const handleOpportunityClick = (opportunity: GHLOpportunity) => {
    navigate(`/?opportunityId=${opportunity.id}`);
    onSelectOpportunity(opportunity);
  };

  const handleSearchById = (opportunityId: string) => {
    navigate(`/?opportunityId=${opportunityId}`);
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOpportunities(false);
    toast.success("Refreshing opportunities...");
  };

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Jobs</CardTitle>
          <button 
            onClick={handleRefresh} 
            className="text-xs text-primary hover:underline"
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <CardDescription>Select a job to manage an estimate</CardDescription>
        
        <OpportunityIdSearch onSearch={handleSearchById} />
        <OpportunityFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-160px)] overflow-y-auto">
        {isLoading && opportunities.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No matching jobs found" : "No jobs available"}
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-2">
              Showing {filteredOpportunities.length} job{filteredOpportunities.length !== 1 ? 's' : ''}
              {searchTerm === "" && opportunities.length > 0 && ` (showing 20 of ${opportunities.length} total)`}
              {searchTerm !== "" && opportunities.length > 0 && ` (filtered from ${opportunities.length} total)`}
              {isRefreshing && <span className="ml-2 text-primary"> • Refreshing...</span>}
            </div>
            <ul className="space-y-2">
              {filteredOpportunities.map((opportunity) => (
                <li key={opportunity.id}>
                  <OpportunityListItem 
                    opportunity={opportunity} 
                    isSelected={selectedOpportunityId === opportunity.id}
                    onSelect={handleOpportunityClick}
                    assignedUserNames={assignedUserNames}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OpportunitiesList;
