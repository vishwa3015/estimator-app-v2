
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import FileDropzone from "@/components/ui/file-dropzone";
import { EstimateDocument } from "@/types/estimate-items";

interface EstimateBasicInfoProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
}

const EstimateBasicInfo: React.FC<EstimateBasicInfoProps> = ({
  estimate,
  setEstimate,
}) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimate-title">Title</Label>
          <Input
            id="estimate-title"
            value={estimate.title}
            onChange={(e) => setEstimate(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="report-type">Report type</Label>
          <Input
            id="report-type"
            value={estimate.reportType || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, reportType: e.target.value }))}
            placeholder="e.g., Roofing Estimate"
          />
        </div>
        <div>
          <Label htmlFor="estimate-date">Date</Label>
          <DatePicker
            date={new Date(estimate.date)}
            onSelect={(date) => setEstimate(prev => ({
              ...prev,
              date: date?.toISOString() || new Date().toISOString(),
              reportDate: date?.toISOString() || prev.reportDate
            }))}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <FileDropzone
          label="Primary Image"
          accept="image/*"
          valueDataUrl={estimate.primaryImageDataUrl}
          onChange={(_, dataUrl) => setEstimate(prev => ({ ...prev, primaryImageDataUrl: dataUrl }))}
        />
        <FileDropzone
          label="Certification/Secondary Logo"
          accept="image/*"
          valueDataUrl={estimate.certificationLogoDataUrl}
          onChange={(_, dataUrl) => setEstimate(prev => ({ ...prev, certificationLogoDataUrl: dataUrl }))}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            value={estimate.contactFirstName || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, contactFirstName: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            value={estimate.contactLastName || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, contactLastName: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="company-name">Company name</Label>
          <Input
            id="company-name"
            value={estimate.companyName || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, companyName: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={estimate.contactAddress || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, contactAddress: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={estimate.contactCity || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, contactCity: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="state">State/Province</Label>
          <Input
            id="state"
            value={estimate.contactState || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, contactState: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="zip">Zip code/Postal code</Label>
          <Input
            id="zip"
            value={estimate.contactZip || ''}
            onChange={(e) => setEstimate(prev => ({ ...prev, contactZip: e.target.value }))}
          />
        </div>
      </div>
    </div>
  );
};

export default EstimateBasicInfo;
