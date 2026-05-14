
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';

interface EstimateAcceptanceProps {
  onAccept: (notes: string, signature: string | null) => void;
}

const EstimateAcceptance: React.FC<EstimateAcceptanceProps> = ({
  onAccept
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const sigPadRef = React.useRef<SignatureCanvas>(null);
  
  const handleClearSignature = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
      setSignature(null);
    }
  };
  
  const handleAccept = () => {
    const signatureDataUrl = sigPadRef.current?.getTrimmedCanvas().toDataURL('image/png') || null;
    setSignature(signatureDataUrl);
    onAccept(notes, signatureDataUrl);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <CheckCircle2 size={16} />
          Accept Estimate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Accept Estimate</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="acceptance-notes">Notes (Optional)</Label>
            <Textarea
              id="acceptance-notes"
              placeholder="Add any notes or comments about your acceptance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20"
            />
          </div>
          
          <div>
            <Label>Signature</Label>
            <div className="border rounded p-2 bg-background">
              <SignatureCanvas
                ref={sigPadRef}
                penColor="black"
                canvasProps={{
                  className: "signature-canvas border w-full h-40"
                }}
              />
            </div>
            <div className="flex justify-end mt-2">
              <Button variant="outline" size="sm" onClick={handleClearSignature}>
                Clear
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAccept}>
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EstimateAcceptance;
