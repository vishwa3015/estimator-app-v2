import { API_BASE_URL, getHeaders } from "./config";
import { GHLCredentials } from "@/types/ghl";

export const updateQuickMeasureReport = async (
  credentials: GHLCredentials,
  contactId: string,
  gafOrderNumber: number | string,
  subscriberOrderNumber: string | null,
  orderStatus: string,
  reportUrl?: string | null,
  opportunityId?: string | null,
): Promise<void> => {
  try {
    const customFields = [
      {
        key: "quickmeasure_gaf_order_number",
        field_value: String(gafOrderNumber),
      },
      {
        key: "quickmeasure_order_status",
        field_value: orderStatus,
      },
    ];

    if (subscriberOrderNumber) {
      customFields.push({
        key: "quickmeasure_subscriber_order_number",
        field_value: subscriberOrderNumber,
      });
    }

      if (reportUrl) {
      customFields.push({
        key: "quickmeasure_report_url",
        field_value: reportUrl,
      });
    }

    if (opportunityId) {
   const response = await fetch(`${API_BASE_URL}/opportunities/${opportunityId}`, {
      method: "PUT",
      headers: getHeaders(credentials),
      body: JSON.stringify({ customFields }),
    });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update opportunity: ${errorData.message || response.statusText}`);
      }
    }
  } catch (error) {
    console.error("Error updating QuickMeasure report:", error);
    throw error;
  }
};