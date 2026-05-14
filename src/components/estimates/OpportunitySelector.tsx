import { useEffect, useState, useCallback } from "react";
import { GHLOpportunity } from "@/types/ghl";
import { contactOpportunitiesService } from "@/services/ghl/opportunities/contactOpportunities";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Briefcase, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OpportunitySelectorProps {
    locationId: string;
    contactId: string;
    value?: string;
    onChange?: (opportunityId: string, opportunity: GHLOpportunity) => void;
    disabled?: boolean;
}

const formatCurrency = (val?: number) =>
    val != null && val > 0
        ? new Intl.NumberFormat("en-US", {
            style: "currency", currency: "USD", maximumFractionDigits: 0,
        }).format(val)
        : null;

export default function OpportunitySelector({
    locationId,
    contactId,
    value,
    onChange,
    disabled,
}: OpportunitySelectorProps) {
    const [opportunities, setOpportunities] = useState<GHLOpportunity[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (bustCache = false) => {
        if (!locationId || !contactId) return;
        if (bustCache) contactOpportunitiesService.clearCache(contactId);

        setLoading(true);
        setError(null);
        try {
            const data = await contactOpportunitiesService.getByContactId(locationId, contactId);
            setOpportunities(data);
        } catch {
            setError("Could not load opportunities.");
        } finally {
            setLoading(false);
        }
    }, [locationId, contactId]);

    useEffect(() => { load(); }, [load]);

    const selectedOpp = opportunities.find((o) => o.id === value);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    Opportunity
                </label>
                <Button variant="ghost" size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => load(true)} disabled={loading || disabled}
                >
                    <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {!error && (
                <Select value={value} onValueChange={(id) => {
                    const opp = opportunities.find(o => o.id === id);
                    if (opp) onChange?.(id, opp);
                }} disabled={disabled || loading || opportunities.length === 0}>
                    <SelectTrigger className="h-auto min-h-10">
                        {loading ? (
                            <span className="flex items-center gap-2 text-muted-foreground text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading opportunities…
                            </span>
                        ) : selectedOpp ? (
                            <div className="flex items-center justify-between w-full gap-2 pr-1 py-0.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-medium text-sm shrink-0">{selectedOpp.name}</span>
                                    {(selectedOpp.pipelineName || selectedOpp.stageName) && (
                                        <>
                                            <span className="text-muted-foreground text-sm shrink-0">·</span>
                                            <span className="text-[11px] text-muted-foreground truncate">
                                                {[selectedOpp.pipelineName, selectedOpp.stageName]
                                                    .filter(Boolean)
                                                    .join(" → ")}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {formatCurrency(selectedOpp.value) && (
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        {formatCurrency(selectedOpp.value)}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <SelectValue placeholder={
                                opportunities.length === 0
                                    ? "No opportunities found for this contact"
                                    : "Select an opportunity…"
                            } />
                        )}
                    </SelectTrigger>

                    <SelectContent className="max-h-72">
                        {opportunities.map((opp) => {
                            const money = formatCurrency(opp.value);
                            const pipeline = opp.pipelineName;
                            const stage = opp.stageName;
                            return (
                                <SelectItem key={opp.id} value={opp.id} className="py-2.5">
                                    <div className="flex flex-col gap-0.5 w-full">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-sm leading-tight">{opp.name}</span>
                                            {money && (
                                                <span className="text-xs text-muted-foreground shrink-0">{money}</span>
                                            )}
                                        </div>
                                        {(pipeline || stage) && (
                                            <span className="text-[11px] text-muted-foreground leading-tight">
                                                {[pipeline, stage].filter(Boolean).join(" → ")}
                                            </span>
                                        )}
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}