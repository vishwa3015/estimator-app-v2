
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EstimateDocument } from "@/types/estimate-items";

interface ContactDetailsProps {
  estimate: EstimateDocument;
  setEstimate: React.Dispatch<React.SetStateAction<EstimateDocument>>;
}

const ContactDetails: React.FC<ContactDetailsProps> = ({
  estimate,
  setEstimate,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="contact-email">Contact Email</Label>
        <Input
          id="contact-email"
          value={estimate.contactEmail || ''}
          onChange={(e) => setEstimate(prev => ({ ...prev, contactEmail: e.target.value }))}
          className="bg-gray-50"
        />
      </div>
      <div>
        <Label htmlFor="contact-phone">Contact Phone</Label>
        <Input
          id="contact-phone"
          value={estimate.contactPhone || ''}
          onChange={(e) => setEstimate(prev => ({ ...prev, contactPhone: e.target.value }))}
          className="bg-gray-50"
        />
      </div>
      <div>
        <Label htmlFor="contact-address">Contact Address</Label>
        <Textarea
          id="contact-address"
          value={estimate.contactAddress || ''}
          onChange={(e) => setEstimate(prev => ({ ...prev, contactAddress: e.target.value }))}
          className="bg-gray-50"
        />
      </div>
    </div>
  );
};

export default ContactDetails;
