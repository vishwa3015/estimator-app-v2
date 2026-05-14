import { useState, useEffect, useCallback, useRef } from "react";
import { GHLCredentials, GHLContact } from "@/types/ghl";
import { contactsService, CONTACTS_PAGE_SIZE } from "@/services/ghl/contacts";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Mail, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ContactsListProps {
  credentials?: GHLCredentials | null;
  onSelectContact: (contact: GHLContact) => void;
  selectedContactId?: string;
}

const ContactsList = ({ credentials, onSelectContact, selectedContactId }: ContactsListProps) => {
  const [contacts, setContacts] = useState<GHLContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<GHLContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [lastFetchCompletedAt, setLastFetchCompletedAt] = useState<number>(0);
  const navigate = useNavigate();

  // Ref for race condition prevention
  const isSearchingRef = useRef(false);
  // Ref to abort background fetch when navigating away
  const shouldAbortBackgroundFetchRef = useRef(false);
  // Ref to track previous credentials for change detection
  const prevCredentialsRef = useRef<GHLCredentials | null | undefined>(credentials);
  // Ref to track background loading state for cleanup
  const isBackgroundLoadingRef = useRef(false);

  // Helper: Sorts contacts by name ASC
  const sortByName = (arr: GHLContact[]) => {
    return arr
      .slice()
      .sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
  };

  const fetchContacts = useCallback(async (showLoading = true, clearCache = false) => {
    if (!credentials) return;

    // Clear search state when fetching all contacts
    isSearchingRef.current = false;
    // Reset abort flag for new fetch
    shouldAbortBackgroundFetchRef.current = false;

    // Clear cache only when explicitly requested (refresh or credentials change)
    if (clearCache) {
      console.log("Clearing contacts cache");
      contactsService.clearCache();
    }

    if (showLoading) setIsLoading(true);
    try {
      // Fetch first page using getContactsPage
      const result = await contactsService.getContactsPage(credentials, CONTACTS_PAGE_SIZE);
      setTotalCount(result.totalCount || null);

      // Update cache with first batch
      contactsService.updateContactsCache(result.contacts);

      // Check if we already have all contacts cached (comparing with totalCount from API)
      const cachedContacts = contactsService.getCachedContacts();
      if (result.totalCount && cachedContacts.length >= result.totalCount) {
        console.log(`Cache already complete: ${cachedContacts.length} contacts (total: ${result.totalCount})`);
        // Load all contacts from cache
        const sorted = sortByName(cachedContacts);
        setContacts(sorted);
        setFilteredContacts(sorted);
        // Ensure background loading states are reset
        setIsBackgroundLoading(false);
        isBackgroundLoadingRef.current = false;
        // Update timestamp to trigger effect re-run for rescheduling auto-refresh
        setLastFetchCompletedAt(Date.now());
      } else {
        // Cache incomplete - set first batch and continue fetching in background
        const processedData = sortByName(result.contacts);
        setContacts(processedData);
        setFilteredContacts(processedData);

        if (result.hasMore && result.searchAfter) {
          // Continue fetching remaining pages in background asynchronously (non-blocking)
          setIsBackgroundLoading(true);
          isBackgroundLoadingRef.current = true;
          // Use setTimeout to ensure this runs after render, making it truly non-blocking
          setTimeout(async () => {
            try {
              let currentNextPageUrl: string | null = result.searchAfter;
              let currentPage = 2;
              let allLoadedContacts = [...result.contacts];

              while (currentNextPageUrl) {
                // Check if we should abort (user navigated away)
                if (shouldAbortBackgroundFetchRef.current) {
                  console.log('Background fetch aborted: user navigated away');
                  break;
                }

                try {
                  const nextResult = await contactsService.getContactsPage(
                    credentials,
                    CONTACTS_PAGE_SIZE,
                    currentNextPageUrl
                  );

                  // Check again after async operation
                  if (shouldAbortBackgroundFetchRef.current) {
                    console.log('Background fetch aborted after fetch: user navigated away');
                    break;
                  }

                  // Merge and deduplicate with existing contacts
                  allLoadedContacts = [...allLoadedContacts, ...nextResult.contacts];
                  const uniqueContacts = Array.from(
                    new Map(allLoadedContacts.map(c => [c.id, c])).values()
                  );
                  const sortedContacts = sortByName(uniqueContacts);

                  // Use functional update to avoid stale closure issues
                  setContacts(prevContacts => {
                    // Merge with current state in case user actions updated it
                    const merged = [...prevContacts, ...nextResult.contacts];
                    const deduped = Array.from(
                      new Map(merged.map(c => [c.id, c])).values()
                    );
                    return sortByName(deduped);
                  });

                  // Only update filtered contacts if not currently searching
                  setFilteredContacts(prev => {
                    // Use ref to check current search state (not stale closure)
                    if (isSearchingRef.current) {
                      return prev; // Don't update during search
                    }
                    // Update with new merged contacts
                    const merged = [...prev, ...nextResult.contacts];
                    const deduped = Array.from(
                      new Map(merged.map(c => [c.id, c])).values()
                    );
                    return sortByName(deduped);
                  });

                  // Update cache incrementally
                  contactsService.updateContactsCache(nextResult.contacts);

                  console.log(`Background: Loaded page ${currentPage}: ${nextResult.contacts.length} contacts (total loaded: ${sortedContacts.length})`);

                  // Prepare for next iteration
                  currentNextPageUrl = nextResult.searchAfter;
                  currentPage++;

                  // Stop if no more pages
                  if (!nextResult.hasMore) {
                    console.log(`Background: All contacts loaded: ${sortedContacts.length} total`);
                    break;
                  }

                  // Small delay between requests to avoid overwhelming the API
                  await new Promise(resolve => setTimeout(resolve, 50));

                } catch (pageError) {
                  console.error(`Background: Error fetching page ${currentPage}:`, pageError);
                  break; // Stop background fetching on error
                }
              }
            } finally {
              // Always reset loading state, even if unexpected errors occur
              setIsBackgroundLoading(false);
              isBackgroundLoadingRef.current = false;
              // Update timestamp to trigger effect re-run for rescheduling auto-refresh
              setLastFetchCompletedAt(Date.now());
            }
          }, 0);
        }
      }

      // Hide loading spinner immediately after first page
      setIsLoading(false);
      setHasInitiallyLoaded(true);

    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to fetch contacts");
      setIsLoading(false);
      setHasInitiallyLoaded(true);
    } finally {
      // Don't set loading states in finally since we already did it above
      setIsRefreshing(false);
    }
  }, [credentials]);

  // Initial load and auto-refresh management
  useEffect(() => {
    if (!credentials) return;

    // Phase 1: Initial load (when not yet loaded)
    if (!hasInitiallyLoaded) {
      console.log("ContactsList mounted - attempting to load from cache");

      // Try to get cached contacts first
      const cachedContacts = contactsService.getCachedContacts();

      if (cachedContacts && cachedContacts.length > 0) {
        // Use cached data
        console.log(`Loaded ${cachedContacts.length} contacts from cache`);
        const sorted = sortByName(cachedContacts);
        setContacts(sorted);
        setFilteredContacts(sorted);
        setIsLoading(false);
        setHasInitiallyLoaded(true);

        // Optionally fetch in background to update cache (silent refresh)
        // This ensures cache stays fresh without blocking UI
        fetchContacts(false, false);
      } else {
        // No cache, fetch fresh data
        console.log("No cache found - fetching fresh data");
        fetchContacts(true, false);
      }
      return; // Don't set up auto-refresh yet
    }

    // Phase 2: Auto-refresh timer (when loaded)
    const expiresIn = contactsService.getCacheExpiresIn();

    // Only schedule future refreshes if cache is valid
    if (expiresIn > 0) {
      console.log(`Cache expires in ${Math.round(expiresIn / 1000 / 60)} minutes, scheduling auto-refresh`);
      const timeoutId = setTimeout(() => {
        console.log("Cache expired - triggering background refresh");
        fetchContacts(false, true); // Silent refresh after clearing cache
      }, expiresIn);

      return () => clearTimeout(timeoutId);
    }
    // If cache already expired, do nothing - will refresh on next mount or manual action
  }, [credentials, hasInitiallyLoaded, fetchContacts, lastFetchCompletedAt]);

  // Cleanup effect - abort background fetch when component unmounts
  useEffect(() => {
    return () => {
      // Only abort if background fetch is actually running
      if (isBackgroundLoadingRef.current) {
        console.log("ContactsList unmounting - aborting background fetch");
        shouldAbortBackgroundFetchRef.current = true;
        setIsBackgroundLoading(false);
      }
    };
  }, []); // Empty deps - only runs on mount/unmount

  // Reset state and clear cache when credentials actually change (user switches account)
  useEffect(() => {
    const prevCreds = prevCredentialsRef.current;
    const credsChanged = prevCreds?.companyId !== credentials?.companyId;

    // Update ref for next comparison
    prevCredentialsRef.current = credentials;

    // Only clear cache if credentials actually changed (not on initial mount or unmount)
    if (credsChanged && credentials) {
      console.log("Credentials changed - clearing cache and resetting state");
      contactsService.clearCache();
      setHasInitiallyLoaded(false);
    }
  }, [credentials]);

  // Server-side search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!credentials || !searchQuery.trim()) {
      // This shouldn't be called with empty query, but handle it anyway
      isSearchingRef.current = false;
      setIsSearching(false);
      return;
    }

    // Set search state to prevent background fetch from updating filteredContacts
    isSearchingRef.current = true;

    setIsSearching(true);
    try {
      // First, get fresh results from API
      const results = await contactsService.searchContacts(credentials, searchQuery.trim());

      // Update local cache with search results
      if (results && results.length > 0) {
        contactsService.updateContactsCache(results);
      }

      // Then get results from updated cache for consistency
      const cachedResults = await contactsService.searchContacts(credentials, searchQuery.trim(), true);
      setFilteredContacts(cachedResults);
    } catch (error) {
      console.error("Error searching contacts:", error);
      toast.error("Failed to search contacts");
      setFilteredContacts([]);
    } finally {
      setIsSearching(false);
      // Keep isSearchingRef.current = true until search is cleared
      // It will be set to false when search query is cleared (in the useEffect)
    }
  }, [credentials]);

  useEffect(() => {
    if (searchTerm.trim()) {
      // Debounce search to avoid too many API calls
      const timeoutId = setTimeout(() => {
        performSearch(searchTerm);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      // Show all locally cached contacts when no search term
      isSearchingRef.current = false;
      setFilteredContacts(contacts);
      setIsSearching(false);
    }
  }, [searchTerm, performSearch, contacts]);

  const handleContactClick = (contact: GHLContact) => {
    navigate(`/?contactId=${contact.id}`);
    onSelectContact(contact);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchContacts(false, true); // showLoading=false, clearCache=true
    toast.success("Refreshing contacts...");
  };

  if (!credentials) {
    return (
      <Card className="h-full overflow-hidden">
        <CardHeader className="p-4">
          <CardTitle className="text-lg font-semibold">Contacts</CardTitle>
          <CardDescription>Connect to GoHighLevel to view contacts</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            Please connect to GoHighLevel first
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">Contacts</CardTitle>
          <button
            onClick={handleRefresh}
            className="text-xs text-primary hover:underline"
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <CardDescription>Select a contact to view details</CardDescription>

        <div className="mt-4">
          <input
            type="text"
            placeholder="Filter contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-160px)] overflow-y-auto">
        {isLoading && contacts.length === 0 ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No matching contacts found" : "No contacts available"}
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground mb-2">
              {isSearching && <span className="text-primary">Searching... </span>}
              Showing {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
              {searchTerm === "" && contacts.length > 0 && totalCount && ` (${contacts.length} of ${totalCount} loaded)`}
              {searchTerm === "" && contacts.length > 0 && !totalCount && ` (${contacts.length} cached)`}
              {searchTerm !== "" && !isSearching && ` (search results)`}
              {isRefreshing && <span className="ml-2 text-primary"> • Refreshing...</span>}
              {isBackgroundLoading && <span className="ml-2 text-primary"> • Loading more...</span>}
            </div>
            <ul className="space-y-2 !list-none">
              {filteredContacts.map((contact) => (
                <li key={contact.id}>
                  <button
                    onClick={() => handleContactClick(contact)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${selectedContactId === contact.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact'}
                          </span>
                        </div>

                        {contact.email && (
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {contact.email}
                            </span>
                          </div>
                        )}

                        {contact.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {contact.phone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-2 truncate">
                      ID: {contact.id}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ContactsList;