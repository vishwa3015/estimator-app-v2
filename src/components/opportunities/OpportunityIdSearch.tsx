
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Hash } from "lucide-react";

interface OpportunityIdSearchProps {
  onSearch: (opportunityId: string) => void;
}

const OpportunityIdSearch = ({ onSearch }: OpportunityIdSearchProps) => {
  const [opportunityIdSearch, setOpportunityIdSearch] = useState("");

  const handleSearchById = (e: React.FormEvent) => {
    e.preventDefault();
    if (opportunityIdSearch.trim()) {
      onSearch(opportunityIdSearch.trim());
    }
  };

  return (
    <form onSubmit={handleSearchById} className="mt-3 flex gap-2">
      <div className="relative flex-1">
        <Hash className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Find by ID..."
          value={opportunityIdSearch}
          onChange={(e) => setOpportunityIdSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary">Go</Button>
    </form>
  );
};

export default OpportunityIdSearch;
