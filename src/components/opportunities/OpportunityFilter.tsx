
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface OpportunityFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const OpportunityFilter = ({ searchTerm, onSearchChange }: OpportunityFilterProps) => {
  return (
    <div className="relative mt-3 w-full">
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search jobs..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-8 w-full"
      />
    </div>
  );
};

export default OpportunityFilter;
