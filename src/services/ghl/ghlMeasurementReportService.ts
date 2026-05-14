import { API_BASE_URL, getHeaders } from "./config";
import { GHLCredentials } from "@/types/ghl";

export const formatGoogleViewerUrl = (url: string, embedded: boolean): string => {
  if (!url) return '';
  if (url.startsWith('https://docs.google.com/viewer')) {
    return url;
  }
  const embeddedParam = embedded ? '&embedded=true' : '';
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}${embeddedParam}`;
};

export const updateMeasurementReport = async (
  credentials: GHLCredentials,
  contactId: string,
  eagleviewReportId: string,
  eagleviewReportStatus: string,
  eagleviewOrderId?: string,
  eagleviewReportUrl?: string,
): Promise<void> => {
  try {
    const customFields = [
      {
        key: "eagleview_report_id",
        field_value: eagleviewReportId,
      },
      {
        key: "eagleview_report_status",
        field_value: eagleviewReportStatus,
      },
    ];

    // Only add order ID if it's provided
    if (eagleviewOrderId) {
      customFields.push({
        key: "eagleview_order_id",
        field_value: eagleviewOrderId,
      });
    }

    // Only add report URL if it's provided
    if (eagleviewReportUrl) {
      customFields.push({
        key: "eagleview_report_url",
        field_value: formatGoogleViewerUrl(eagleviewReportUrl, false),
      });
    }

    const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
      method: "PUT",
      headers: getHeaders(credentials),
      body: JSON.stringify({
        customFields: customFields,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to update contact: ${errorData.message || response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error updating contact with measurement report:", error);
    throw error;
  }
};