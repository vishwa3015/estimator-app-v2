import { supabase } from "@/integrations/supabase/client";
import { GHLOpportunity } from "@/types/ghl";

const CACHE_PREFIX = "ghl_contact_opps_";
const CACHE_TTL_MS = 5 * 60 * 1000;

export const contactOpportunitiesService = {
  getByContactId: async (
    locationId: string,
    contactId: string
  ): Promise<GHLOpportunity[]> => {
    if (!locationId || !contactId) return [];

    const cacheKey = `${CACHE_PREFIX}${contactId}`;

    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - cached.ts < CACHE_TTL_MS) {
          console.log(`[contactOpps] Cache hit for contact ${contactId}`);
          return cached.data;
        }
      }
    } catch (e) {
      console.error("[contactOpps] Cache read error:", e);
    }

    const { data, error } = await supabase.functions.invoke("ghl-opportunities", {
      body: { locationId, contactId },
    });

    if (error) throw new Error(`Edge function error: ${error.message}`);
    if (!data?.opportunities) throw new Error(data?.error || "Failed to fetch opportunities");

    const opportunities: GHLOpportunity[] = data.opportunities ?? [];

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: opportunities, ts: Date.now() }));
    } catch (e) {
      console.error("[contactOpps] Cache write error:", e);
    }

    return opportunities;
  },

  clearCache: (contactId?: string) => {
    if (contactId) {
      localStorage.removeItem(`${CACHE_PREFIX}${contactId}`);
    } else {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) localStorage.removeItem(key);
      }
    }
  },
};