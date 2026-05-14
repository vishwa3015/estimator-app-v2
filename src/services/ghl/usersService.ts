
import { GHLCredentials, GHLUser, GHLContact } from "@/types/ghl";
import { API_BASE_URL, getHeaders } from "./config";
import { enrichContactCustomFields } from "./customFieldMapper";

export const usersService = {
  getUserById: async (credentials: GHLCredentials, userId: string): Promise<GHLUser | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}?locationId=${credentials.companyId}`, {
        method: "GET",
        headers: getHeaders(credentials)
      });

      if (!response.ok) {
        console.error(`Error fetching user details for ID ${userId}:`, response.status, response.statusText);
        return await usersService.getUserByIdAlternative(credentials, userId);
      }

      const data = await response.json();
      console.log(`User details for ID ${userId}:`, data);

      if (data && data.user) {
        return data.user;
      } else if (data && data.name) {
        return data;
      }

      return await usersService.getUserByIdAlternative(credentials, userId);
    } catch (error) {
      console.error(`Error fetching user details for ID ${userId}:`, error);
      return await usersService.getUserByIdAlternative(credentials, userId);
    }
  },

  getUserByIdAlternative: async (credentials: GHLCredentials, userId: string): Promise<GHLUser | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users?locationId=${credentials.companyId}`, {
        method: "GET",
        headers: getHeaders(credentials)
      });

      if (!response.ok) {
        console.error("Error fetching users list:", response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log("Users list:", data);

      if (data && Array.isArray(data.users)) {
        const user = (data.users as GHLUser[]).find((u) => u.id === userId);
        if (user) {
          return user;
        }
      }

      return {
        id: userId,
        name: userId
      };
    } catch (error) {
      console.error(`Error in alternative user fetch for ID ${userId}:`, error);
      return {
        id: userId,
        name: userId
      };
    }
  },

  getContactById: async (credentials: GHLCredentials, contactId: string): Promise<GHLContact | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/contacts/${contactId}?locationId=${credentials.companyId}`, {
        method: "GET",
        headers: getHeaders(credentials)
      });

      if (!response.ok) {
        console.error(`Error fetching contact details for ID ${contactId}:`, response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log(`Contact details for ID ${contactId}:`, data);

      let contact = null;
      if (data && data.contact) {
        contact = data.contact;
      } else if (data) {
        // Some APIs return the contact directly
        contact = data;
      }

      // Enrich contact with custom field key mappings
      return await enrichContactCustomFields(contact, credentials);
    } catch (error) {
      console.error(`Error fetching contact details for ID ${contactId}:`, error);
      return null;
    }
  }
};
