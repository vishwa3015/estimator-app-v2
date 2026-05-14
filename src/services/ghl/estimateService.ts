
import { API_BASE_URL, createHeaders, getHeaders } from "./config";
import { GHLCredentials } from "@/types/ghl";
import { EstimateSent } from "@/types/estimates";

interface RawEmailMessage {
  id: string;
  subject?: string;
  body?: string;
  sentAt?: string;
  createdAt?: string;
  status?: string;
}

export const estimateService = {
  getEstimates: async (
    credentials: GHLCredentials,
    contactId: string
  ): Promise<EstimateSent[]> => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/conversations/messages?contactId=${contactId}&type=Email`,
        {
          method: "GET",
          headers: getHeaders(credentials),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch estimates");
      }

      const data = await response.json();
      return (data.messages as RawEmailMessage[])
        .filter((message) => message.subject?.includes("Estimate for"))
        .map((message) => ({
          id: message.id,
          subject: message.subject,
          body: message.body,
          sentAt: message.sentAt || message.createdAt,
          status: message.status
        }));
    } catch (error) {
      console.error("Error fetching estimates:", error);
      throw error;
    }
  }
};
