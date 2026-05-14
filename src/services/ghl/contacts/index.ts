import { GHLCredentials, GHLContact } from "@/types/ghl";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { enrichContactCustomFields } from "../customFieldMapper";

interface CachedContact {
  id: string;
  fn?: string;
  ln?: string;
  n?: string;
  name?: string;
  e?: string;
  p?: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const CONTACTS_PAGE_SIZE = 500; // MUST BE 500 OR LESS DUE TO GHL API LIMITS

// Helper to normalize compact cached format back to full format
const normalizeContact = (c: CachedContact): GHLContact => ({
  id: c.id,
  firstName: c.fn || c.firstName || '',
  lastName: c.ln || c.lastName || '',
  name: c.contactName || c.n || c.name || "",
  email: c.e || c.email || '',
  phone: c.p || c.phone || '',
  contactName: c.contactName || `${c.fn || c.firstName || ''} ${c.ln || c.lastName || ''}`.trim(),
});

const clearContactsCache = () => {
  try {
    // Clear the main contacts list cache
    localStorage.removeItem("ghl_contacts_list");

    // Clear individual contact caches
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("ghl_contact_")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log(`Cleared contacts cache: ${keysToRemove.length + 1} items removed`);
  } catch (error) {
    console.error("Error clearing contacts cache:", error);
  }
};

// Response type for paginated results
export interface PaginatedContactsResponse {
  contacts: GHLContact[];
  searchAfter: string | null;
  hasMore: boolean;
  totalCount?: number;
  isSearch: boolean;
}

export const contactsService = {

  clearCache: clearContactsCache,

  // Get time remaining until cache expires (in milliseconds), returns 0 if expired or no cache
  getCacheExpiresIn: (): number => {
    try {
      const cachedContacts = localStorage.getItem("ghl_contacts_list");
      if (cachedContacts) {
        const cached = JSON.parse(cachedContacts);
        const cachedTime = cached && cached.t ? new Date(cached.t) : null;
        const now = new Date();

        if (cachedTime) {
          const expiresIn = CACHE_TTL_MS - (now.getTime() - cachedTime.getTime());
          return Math.max(0, expiresIn);
        }
      }
    } catch (e) {
      console.error("Error checking cache expiration:", e);
    }
    return 0;
  },

  // Get contacts from cache only (doesn't fetch from API)
  getCachedContacts: (): GHLContact[] => {
    try {
      const cachedContacts = localStorage.getItem("ghl_contacts_list");
      if (cachedContacts) {
        const cached = JSON.parse(cachedContacts);
        const cachedTime = cached && cached.t ? new Date(cached.t) : null;
        const now = new Date();

        // Use cache if less than CACHE_TTL_MS
        if (cachedTime && now.getTime() - cachedTime.getTime() < CACHE_TTL_MS) {
          const contacts = cached.c;
          if (contacts && Array.isArray(contacts)) {
            return contacts.map(normalizeContact);
          }
        } else {
          console.log("Cache expired");
        }
      }
    } catch (e) {
      console.error("Error reading cached contacts:", e);
    }
    return [];
  },

  // Fetch a single page of contacts (for background pagination)
  getContactsPage: async (
    credentials: GHLCredentials,
    limit: number = CONTACTS_PAGE_SIZE,
    searchAfter?: string | null,
  ): Promise<PaginatedContactsResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-ghl-contacts", {
        body: {
          credentials,
          limit,
          searchAfter,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || "Unknown error from edge function");
      }

      const { contacts = [], hasMore, searchAfter: newSearchAfter, totalCount, isSearch } = data;

      return {
        contacts,
        searchAfter: newSearchAfter,
        hasMore: (hasMore && !isSearch) || false,
        totalCount,
        isSearch,
      };
    } catch (error) {
      console.error("Error fetching contacts page:", error);
      throw error;
    }
  },

  // Update cache with new contacts (append and deduplicate)
  updateContactsCache: (newContacts: GHLContact[]) => {
    try {
      const cachedContacts = localStorage.getItem("ghl_contacts_list");
      let existingContacts: CachedContact[] = [];

      if (cachedContacts) {
        const cached = JSON.parse(cachedContacts);
        existingContacts = cached.c || [];
      }

      // Convert new contacts to compact format
      const contactsToCache = newContacts.map((contact: GHLContact): CachedContact => {
        const cached: CachedContact = { id: contact.id }; 
        if (contact.firstName) cached.fn = contact.firstName;
        if (contact.lastName) cached.ln = contact.lastName;
        if (contact.name) cached.n = contact.name;
        if (contact.email) cached.e = contact.email;
        if (contact.phone) cached.p = contact.phone;
        return cached;
      });

      // Merge and deduplicate
      const contactMap = new Map();
      [...existingContacts, ...contactsToCache].forEach(c => {
        contactMap.set(c.id, c);
      });

      const mergedContacts = Array.from(contactMap.values());

      const cacheData = JSON.stringify({
        c: mergedContacts,
        t: new Date().toISOString(),
        total: mergedContacts.length,
      });

      localStorage.setItem("ghl_contacts_list", cacheData);
    } catch (e) {
      console.error("Error updating contacts cache:", e);
    }
  },

  searchContacts: async (credentials: GHLCredentials, search: string, inCache?: boolean): Promise<GHLContact[]> => {
    // If searching with a valid search term
    if (search && search.trim().length > 0) {
      const searchTerm = search.toLowerCase().trim();

      // Only search in cache if explicitly requested
      if (inCache === true) {
        try {
          const cachedContacts = localStorage.getItem("ghl_contacts_list");
          if (cachedContacts) {
            const cached = JSON.parse(cachedContacts);
            const cachedTime = cached && cached.t ? new Date(cached.t) : (cached.timestamp ? new Date(cached.timestamp) : null);
            const now = new Date();

            // Use cache for search if less than CACHE_TTL_MS
            if (cachedTime && now.getTime() - cachedTime.getTime() < CACHE_TTL_MS) {
              const contacts = cached.c;
              if (contacts && Array.isArray(contacts)) {
                // Client-side search using compact format
                const results = (contacts as CachedContact[]).filter((c) =>
                  (c.n && c.n.toLowerCase().includes(searchTerm)) ||
                  (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                  (c.fn && c.fn.toLowerCase().includes(searchTerm)) ||
                  (c.firstName && c.firstName.toLowerCase().includes(searchTerm)) ||
                  (c.ln && c.ln.toLowerCase().includes(searchTerm)) ||
                  (c.lastName && c.lastName.toLowerCase().includes(searchTerm)) ||
                  (c.e && c.e.toLowerCase().includes(searchTerm)) ||
                  (c.email && c.email.toLowerCase().includes(searchTerm)) ||
                  (c.p && c.p.includes(searchTerm)) ||
                  (c.phone && c.phone.includes(searchTerm)) ||
                  (c.id && c.id.toLowerCase().includes(searchTerm))
                ).map(normalizeContact);

                return results;
              }
            } else {
              console.log("Cache expired, skipping cache search");
            }
          }
        } catch (e) {
          console.error("Error searching cached contacts:", e);
        }
      }

      // Always call API when inCache is false/undefined, or when cache search was requested but failed
      try {
        const { data, error } = await supabase.functions.invoke("fetch-ghl-contacts", {
          body: {
            credentials,
            search, // original search term (case sensitive)
            limit: CONTACTS_PAGE_SIZE,
          },
        });

        if (error) {
          console.error("Edge function error:", error);
          throw new Error(`Edge function error: ${error.message}`);
        }

        if (!data.success) {
          throw new Error(data.error || "Unknown error from edge function");
        }

        const { contacts = [], totalCount } = data;
        console.log(`API search returned ${contacts.length} results ${(totalCount > contacts.length ? `out of ${totalCount} total` : '')}`);
        return contacts;
      } catch (error) {
        console.error("Error searching contacts via Edge Function:", error);
        toast.error("Failed to search contacts from GHL.");
        return [];
      }
    }

    // Try to load from cache first for non-search request
    try {
      const cachedContacts = localStorage.getItem("ghl_contacts_list");
      if (cachedContacts) {
        const cached = JSON.parse(cachedContacts);
        const cachedTime = cached && cached.t ? new Date(cached.t) : (cached.timestamp ? new Date(cached.timestamp) : null);
        const now = new Date();

        // Use cache if less than CACHE_TTL_MS (increased for better performance)
        if (cachedTime && now.getTime() - cachedTime.getTime() < CACHE_TTL_MS) {
          const remainingSeconds = Math.round((CACHE_TTL_MS - (now.getTime() - cachedTime.getTime())) / 1000);
          const contacts = cached.c;
          console.log(`Using cached contacts list (${contacts?.length || 0} contacts, valid for ${remainingSeconds}s)`);
          if (contacts && Array.isArray(contacts)) {
            return contacts.map(normalizeContact);
          }
        } else {
          console.log("Cache expired, fetching fresh contacts");
        }
      }
    } catch (e) {
      console.error("Error reading cached contacts list:", e);
    }

    return [];
  },

  getContactById: async (credentials: GHLCredentials, contactId: string): Promise<GHLContact | null> => {
    // Try to get from cache first for instant result
    try {
      const cachedContact = localStorage.getItem(`ghl_contact_${contactId}`);
      if (cachedContact) {
        const parsed = JSON.parse(cachedContact);
        console.log("Using cached contact data initially for", contactId);
        return parsed;
      }
    } catch (e) {
      console.error("Error reading contact cache:", e);
    }

    // If not in cache, try to find it in the contacts list cache
    try {
      const cachedContacts = localStorage.getItem("ghl_contacts_list");
      if (cachedContacts) {
        const cached = JSON.parse(cachedContacts);
        const contacts = cached.c;
        if (contacts && Array.isArray(contacts)) {
          const foundContact = (contacts as CachedContact[]).find((c) => c && c.id === contactId);
          if (foundContact && foundContact.id) {
            const normalized = normalizeContact(foundContact);
            console.log("Found contact in cached list:", normalized);
            return normalized;
          }
        }
      }
    } catch (e) {
      console.error("Error searching cached contacts list:", e);
    }

    // If not found in cache, fetch individual contact via Edge Function
    try {
      const { data, error } = await supabase.functions.invoke("fetch-ghl-contact-by-id", {
        body: { credentials, contactId },
      });

      if (error) {
        console.error(`Edge function error for contact ID ${contactId}:`, error);
        return null;
      }

      if (!data.success) {
        console.error(`Error fetching contact details for ID ${contactId}:`, data.error);
        return null;
      }

      // Enrich contact with custom field key mappings
      return await enrichContactCustomFields(data.contact, credentials);
    } catch (error) {
      console.error(`Error fetching contact details for ID ${contactId}:`, error);
      return null;
    }
  },
};
