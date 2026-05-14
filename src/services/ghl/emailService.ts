
import { API_BASE_URL,getHeaders } from "./config";
import { GHLCredentials } from "@/types/ghl";

export const emailService = {
  sendEmail: async (
    credentials: GHLCredentials,
    contactId: string,
    subject: string,
    body: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/messages`, {
        method: "POST",
        headers: getHeaders(credentials),
        body: JSON.stringify({
          type: "Email",
          contactId: contactId,
          subject: subject,
          body: body,
          direction: "outbound"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error sending email via GHL:", errorData);
        throw new Error(`Failed to send email: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      return !!data;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }
};
