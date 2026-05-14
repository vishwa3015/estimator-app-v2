import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface IntroductionEmailBodyProps {
  emailBody: string;
  onEmailBodyChange: (body: string) => void;
}

interface FieldVariable {
  id: string;
  label: string;
}

const defaultEmailBody = `Hi {{CUSTOMER_FIRST_NAME}},

Thank you for the opportunity to quote on the repairs to your home. Please find your estimate below along with upgrade options for potential improvements to your project.

The following estimate includes:

1. Remove and disposal of old materials
2. Supply and install new materials
3. Clean up of entire work area (all nails and other materials)
4. Clean all gutters (if roof is done)
5. Your own dedicated Production Scheduling team
6. We are Licensed to work in your geographical region
7. 5-year Workmanship Warranty on complete projects

We maintain current WCB for all employees to ensure you are not personally liable should a worker get injured.

If you have any questions, please give me a call. We always want to provide the best value to our clients. If we are outside your budget, please let me know and we will do our best to work within that.

Kind regards,

{{SALESPERSON_NAME}} | {{SALESPERSON_TITLE}}
{{SALESPERSON_EMAIL}}
{{SALESPERSON_PHONE}}`;

const IntroductionEmailBody: React.FC<IntroductionEmailBodyProps> = ({
  emailBody,
  onEmailBodyChange
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const availableVariables: FieldVariable[] = [
    { id: "CUSTOMER_FIRST_NAME", label: "Customer First Name" },
    { id: "CUSTOMER_LAST_NAME", label: "Customer Last Name" },
    { id: "SALESPERSON_NAME", label: "Salesperson Name" },
    { id: "SALESPERSON_TITLE", label: "Salesperson Title" },
    { id: "SALESPERSON_EMAIL", label: "Salesperson Email" },
    { id: "SALESPERSON_PHONE", label: "Salesperson Phone" }
  ];

  const insertVariable = (variableId: string) => {
    const variable = `{{${variableId}}}`;
    onEmailBodyChange(emailBody + variable);
    setIsDropdownOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="email-body">Email Body</Label>
      <div className="relative">
        <Textarea
          id="email-body"
          value={emailBody}
          onChange={(e) => onEmailBodyChange(e.target.value)}
          placeholder="Enter email body..."
          className="min-h-[400px] font-inter text-[12px] leading-normal"
        />
        
        <div className="mt-2 relative">
          <button 
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
          >
            Insert Variable
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white shadow-lg rounded-md border border-gray-200 z-10">
              <div className="p-2">
                {availableVariables.map((variable) => (
                  <div
                    key={variable.id}
                    className="px-2 py-1 cursor-pointer hover:bg-slate-100 rounded text-sm"
                    onClick={() => insertVariable(variable.id)}
                  >
                    {variable.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        You can use variables like {"{{"} "CUSTOMER_FIRST_NAME" {"}}"} which will be replaced with actual contact details
      </p>
    </div>
  );
};

export { IntroductionEmailBody, defaultEmailBody };
