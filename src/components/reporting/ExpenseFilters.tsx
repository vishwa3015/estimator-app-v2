
import { useState } from "react";
import { ExpenseType } from "@/types/ghl";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export type FilterType = ExpenseType | 'All';

interface ExpenseFiltersProps {
  filterType: FilterType;
  setFilterType: (type: FilterType) => void;
  filterDescription?: string;
  setFilterDescription?: (description: string) => void;
  availableDescriptions?: string[];
  onFilterTypeChange: (type: ExpenseType | null) => void;
  onSearchTermChange: (term: string) => void;
}

const ExpenseFilters = ({ 
  filterType, 
  setFilterType, 
  filterDescription = '', 
  setFilterDescription, 
  availableDescriptions = [], 
  onFilterTypeChange, 
  onSearchTermChange 
}: ExpenseFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleFilterTypeChange = (value: string) => {
    const newFilterType = value as FilterType;
    setFilterType(newFilterType);
    
    if (newFilterType === 'All') {
      onFilterTypeChange(null);
    } else {
      onFilterTypeChange(newFilterType as ExpenseType);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchTermChange(searchTerm);
  };

  const handleDescriptionChange = (value: string) => {
    if (setFilterDescription) {
      setFilterDescription(value);
    }
  };

  return (
    <div className="flex flex-col space-y-3 mb-6">
      <div className="w-full">
        <Select value={filterType} onValueChange={handleFilterTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Expenses</SelectItem>
            <SelectItem value="Materials">Materials</SelectItem>
            <SelectItem value="Labor">Labor</SelectItem>
            <SelectItem value="Subcontractor">Subcontractor</SelectItem>
            <SelectItem value="Misc">Miscellaneous</SelectItem>
            <SelectItem value="Commission">Commission</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {filterType !== 'All' && availableDescriptions.length > 0 && setFilterDescription && (
        <div className="w-full">
          <Select value={filterDescription} onValueChange={handleDescriptionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by description" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Descriptions</SelectItem>
              {availableDescriptions.map((desc) => (
                <SelectItem key={desc} value={desc}>{desc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search expenses..."
          className="pl-8 w-full"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </form>
    </div>
  );
};

export default ExpenseFilters;
