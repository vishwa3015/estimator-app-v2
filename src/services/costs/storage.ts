
import { supabase } from "@/integrations/supabase/client";
import type { JobCost, JobCostStorage } from "./types";
import type { CostItem, ExpenseType, PaymentMethod } from "@/types/ghl";
import { setLocationContext, getCurrentLocationId } from "@/hooks/use-location-context";
import { v4 as uuidv4 } from "uuid";
import { EstimateItem } from "@/types/database";

// Type alias for better code readability
type PostgrestResponse<T> = { data: T | null; error: Error | null };

export const jobCostStorage: JobCostStorage = {
  getJobCosts: async (opportunityId?: string): Promise<Record<string, JobCost>> => {
    try {
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);
      
      // Set location context - will continue even if it fails
      await setLocationContext(locationId);

      // Try to get data from local storage first as a fallback
      const localData = localStorage.getItem('job_costs_cache');
      let jobCosts: Record<string, JobCost> = {};
      
      if (localData) {
        try {
          jobCosts = JSON.parse(localData);
        } catch (e) {
          console.error('Error parsing local job costs cache:', e);
        }
      }

      try {
        let query = supabase.from('estimates').select('*');
        
        if (opportunityId) {
          query = query.eq('opportunity_id', opportunityId);
        }

        // Also filter by location for safety
        query = query.eq('location_id', locationId);

        // Execute the query
        const { data: estimates, error } = await query;

        if (error) {
          console.error('Error fetching estimates:', error);
          return jobCosts; // Return cached data if available
        }

        // Group estimates by opportunity_id to build JobCost objects
        if (estimates && estimates.length > 0) {
          jobCosts = {};
          
          estimates.forEach((item: EstimateItem) => {
            if (!jobCosts[item.opportunity_id]) {
              jobCosts[item.opportunity_id] = {
                opportunityId: item.opportunity_id,
                jobValue: 0,
                costItems: [],
                totalCost: 0,
                profit: 0,
                marginPercent: 0,
                lastUpdated: new Date().toISOString()
              };
            }
            
            jobCosts[item.opportunity_id].costItems.push({
              id: item.id,
              description: item.description,
              amount: Number(item.amount),
              date: item.created_at || new Date().toISOString(),
              type: item.type as ExpenseType,
              category: item.category,
              notes: item.notes,
              salesPersonId: item.sales_person_id,
              paymentMethod: item.payment_method as PaymentMethod
            });
          });
          
          // Update local cache
          localStorage.setItem('job_costs_cache', JSON.stringify(jobCosts));
        }
      } catch (dbError) {
        console.error('Database error when fetching estimates, using cache:', dbError);
      }

      return jobCosts;
    } catch (error) {
      console.error('Error in getJobCosts:', error);
      
      // Try to return cached data from localStorage if available
      try {
        const localData = localStorage.getItem('job_costs_cache');
        if (localData) {
          return JSON.parse(localData);
        }
      } catch (e) {
        console.error('Error reading from cache:', e);
      }
      
      return {};
    }
  },

  saveJobCosts: async (jobCosts: Record<string, JobCost>): Promise<void> => {
    try {
      const credentials = localStorage.getItem("smartroofing_credentials");
      if (!credentials) {
        throw new Error("No credentials found");
      }
      
      const { companyId: locationId } = JSON.parse(credentials);

      console.log('Setting location context before saving job costs:', locationId);
      await setLocationContext(locationId);
      
      // Save to local storage as a fallback
      localStorage.setItem('job_costs_cache', JSON.stringify(jobCosts));

      // Try to save to the database
      try {
        for (const [opportunityId, jobCost] of Object.entries(jobCosts)) {
          for (const item of jobCost.costItems) {
            const estimate = {
              id: item.id || uuidv4(),
              sales_person_id: item.salesPersonId,
              description: item.description,
              opportunity_id: opportunityId,
              type: item.type,
              category: item.category || '',
              notes: item.notes || '',
              amount: item.amount,
              payment_method: item.paymentMethod || 'Other',
              location_id: locationId,
              created_at: item.date || new Date().toISOString(),
              created_by: '',
              contact_id: ''
            };

            console.log('Saving estimate:', estimate);

            // Use direct Supabase query for upsert
            const { error } = await supabase
              .from('estimates')
              .upsert(estimate, {
                onConflict: 'id'
              });

            if (error) {
              console.error('Error upserting estimate:', error);
              // We continue even if there's an error with individual items
            }
          }
        }
      } catch (dbError) {
        console.error('Database error when saving estimates, but local cache is updated:', dbError);
      }
    } catch (error) {
      console.error('Error in saveJobCosts:', error);
      // We've already saved to localStorage above, so we don't need to do anything else here
    }
  }
};
