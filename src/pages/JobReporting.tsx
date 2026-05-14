
import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useJobReport } from "@/hooks/use-job-report";
import JobReportingLoading from "@/components/job-reporting/JobReportingLoading";
import JobReportingError from "@/components/job-reporting/JobReportingError";
import JobReportContainer from "@/components/job-reporting/JobReportContainer";

const JobReporting = () => {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { job, jobCost, isLoading } = useJobReport(opportunityId);

  const jobReportData = useMemo(() => {
    if (!jobCost || !jobCost.costItems) return {
      totalExpenses: 0,
      totalJobValue: 0,
      totalProfit: 0,
      marginPercent: 0,
      expensesByType: {
        'Materials': 0,
        'Labor': 0,
        'Subcontractor': 0,
        'Misc': 0,
        'Commission': 0,
        'Marketing': 0
      }
    };
    
    const expensesByType = {
      'Materials': 0,
      'Labor': 0,
      'Subcontractor': 0,
      'Misc': 0,
      'Commission': 0,
      'Marketing': 0
    };

    jobCost.costItems.forEach(item => {
      if (item && item.type) {
        expensesByType[item.type] = (expensesByType[item.type] || 0) + item.amount;
      }
    });

    return {
      totalExpenses: jobCost.totalCost || 0,
      totalJobValue: jobCost.jobValue || 0,
      totalProfit: jobCost.profit || 0,
      marginPercent: jobCost.marginPercent || 0,
      expensesByType
    };
  }, [jobCost]);

  if (isLoading) {
    return <JobReportingLoading />;
  }

  if (!jobCost) {
    return <JobReportingError />;
  }

  return (
    <JobReportContainer
      jobCost={jobCost}
      jobName={job?.name}
      opportunityId={opportunityId || ''}
      jobReportData={jobReportData}
    />
  );
};

export default JobReporting;
