import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { EstimateDocument } from "@/types/estimate-items";

interface WarrantyEditorProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
}

const WarrantyEditor: React.FC<WarrantyEditorProps> = ({ estimate, setEstimate }) => {
  const w = estimate.warranty || {};

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0">
        <CardTitle>Warranty</CardTitle>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        <div>
          <div className="text-sm font-medium mb-1">Select the warranty start date</div>
          <DatePicker
            date={w.startDate ? new Date(w.startDate) : undefined}
            onSelect={(d) => setEstimate(prev => ({ ...prev, warranty: { ...w, startDate: d?.toISOString() } }))}
          />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-medium">Information</div>
          <div className="text-sm">Customer name: {`${estimate.contactFirstName || ''} ${estimate.contactLastName || ''}`.trim() || '—'}</div>
          <div className="text-sm">Address: {estimate.contactAddress || '—'}</div>
          <div className="text-sm">City/State/Zip: {[estimate.contactCity, estimate.contactState, estimate.contactZip].filter(Boolean).join(', ') || '—'}</div>
          <div className="text-sm">Date project completed: {estimate.reportDate ? new Date(estimate.reportDate).toLocaleDateString() : (estimate.date ? new Date(estimate.date).toLocaleDateString() : '—')}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WarrantyEditor;
