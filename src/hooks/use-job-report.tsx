
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ghlService } from "@/services/ghl";
import { costService } from "@/services/costs";
import { JobCost, ExpenseType, GHLOpportunity } from "@/types/ghl";
import { toast } from "@/components/ui/use-toast";

export const useJobReport = (opportunityId?: string) => {
  const navigate = useNavigate();
  const [job, setJob] = useState<GHLOpportunity | null>(null)
  const [jobCost, setJobCost] = useState<JobCost | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadJobData = async () => {
      if (!opportunityId) {
        navigate('/');
        return;
      }

      setIsLoading(true);
      try {
        const storedCredentials = localStorage.getItem("smartroofing_credentials");
        if (!storedCredentials) {
          console.error("No credentials found, redirecting to auth page");
          navigate('/auth');
          return;
        }

        try {
          const jobCostData = await costService.getJobCostByOpportunityId(opportunityId);
          setJobCost(jobCostData || {
            opportunityId,
            jobValue: 0,
            costItems: [],
            totalCost: 0,
            profit: 0,
            marginPercent: 0,
            lastUpdated: new Date().toISOString()
          });
        } catch (error) {
          console.error("Failed to load job cost data:", error);
          setJobCost({
            opportunityId,
            jobValue: 0,
            costItems: [],
            totalCost: 0,
            profit: 0,
            marginPercent: 0,
            lastUpdated: new Date().toISOString()
          });
        }

        try {
          const credentials = JSON.parse(storedCredentials);
          if (credentials) {
            const jobData = await ghlService.getOpportunityById(credentials, opportunityId);
            setJob(jobData);
          }
        } catch (error) {
          console.error("Failed to load job details from GHL:", error);
        }
      } catch (error) {
        console.error("Failed to load job data:", error);
        toast({
          title: "Error",
          description: "Failed to load job data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadJobData();
  }, [opportunityId, navigate]);

  return { job, jobCost, isLoading };
};
