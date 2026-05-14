import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Settings2, Sparkles } from "lucide-react";
import EstimateEditor from "./EstimateEditor";
import EstimateEditorV2 from "./EstimateEditorV2";
import { EstimateDocument } from "@/types/estimate-items";
import { EstimateSection } from "@/services/estimates/section-service";
import { GHLCredentials, GHLOpportunity } from "@/types/ghl";

interface EstimateEditorSelectorProps {
  opportunity: GHLOpportunity;
  onSave: (estimate: EstimateDocument, sections?: EstimateSection[]) => Promise<void>;
  onSend: (estimate: EstimateDocument) => Promise<void>;
  credentials: GHLCredentials;
}

const EstimateEditorSelector: React.FC<EstimateEditorSelectorProps> = ({
  opportunity,
  onSave,
  onSend,
  credentials
}) => {
  const [useV2Editor, setUseV2Editor] = useState(false);

  return (
    <div className="space-y-6">
      {/* Editor Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Estimate Editor
              </CardTitle>
              <CardDescription>
                Choose between the legacy editor or the new configuration-driven editor
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={useV2Editor ? "secondary" : "default"}>
                Legacy
              </Badge>
              <Switch
                checked={useV2Editor}
                onCheckedChange={setUseV2Editor}
              />
              <Badge variant={useV2Editor ? "default" : "secondary"} className="gap-1">
                <Sparkles className="h-3 w-3" />
                V2 Beta
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Editor Content */}
      {useV2Editor ? (
        <EstimateEditorV2
          opportunity={opportunity}
          onSave={onSave}
          onSend={onSend}
          credentials={credentials}
        />
      ) : (
        <EstimateEditor
          opportunity={opportunity}
          onSave={onSave}
          onSend={onSend}
          credentials={credentials}
        />
      )}
    </div>
  );
};

export default EstimateEditorSelector;