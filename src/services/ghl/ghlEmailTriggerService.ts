import { API_BASE_URL, getHeaders } from "./config";
import { GHLCredentials } from "@/types/ghl";

export const setEstimateAndTriggerWorkflow = async (
  credentials: GHLCredentials,
  contactId: string,
  estimateUrl: string,
  estimateReviewURL: string,
  contactFullDetailURL: string
): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
      method: "PUT",
      headers: getHeaders(credentials),
      body: JSON.stringify({
        customFields: [
          {
            key: "estimate_url",
            field_value: estimateUrl,
          },
          {
            key: "estimate_review_url",
            field_value: estimateReviewURL,
          },
          {
            key: "contact_fill_details_url",
            field_value: contactFullDetailURL,
          },
          {
            key: "send_owner_email_trigger",
            field_value: "Yes",
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to update contact: ${errorData.message || response.statusText}`
      );
    }
  } catch (error) {
    console.error("Error updating contact with estimate & trigger:", error);
    throw error;
  }
};