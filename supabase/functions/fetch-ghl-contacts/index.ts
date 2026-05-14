import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

interface ContactSearchBody {
  locationId: string;
  pageLimit: number;
  query?: string;
  searchAfter?: string;
  page?: number;
}

const CONTACTS_PAGE_SIZE = 500; // MUST BE 500 OR LESS DUE TO GHL API LIMITS

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Get API configuration based on credentials
const getApiConfig = (credentials) => {
  // Priority 1: Check for PIT token (Services API)
  if (credentials.pit) {
    return {
      baseUrl: 'https://services.leadconnectorhq.com',
      authHeader: `Bearer ${credentials.pit}`,
      version: '2021-07-28'
    };
  }

  // Priority 2: Check for API Key (V1 API)
  if (credentials.apiKey) {
    return {
      baseUrl: 'https://rest.gohighlevel.com/v1',
      authHeader: `Bearer ${credentials.apiKey}`,
      version: null
    };
  }

  // No valid credentials found
  throw new Error('Missing required credentials. Please provide either "pit" (for Services API) or "apiKey" (for V1 API)');
};

const createHeaders = (apiConfig) => {
  const headers = {
    'Authorization': apiConfig.authHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  if (apiConfig.version) {
    headers['Version'] = apiConfig.version;
  }

  return headers;
};

const handler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    const body = await req.json();
    const { credentials, search, limit = CONTACTS_PAGE_SIZE, nextPageUrl } = body;
    let searchAfter = body.searchAfter;

    if (!searchAfter && nextPageUrl) {
      // For backward compatibility, use nextPageUrl as searchAfter if provided
      searchAfter = nextPageUrl;
    }

    // Validate credentials object exists
    if (!credentials || !credentials.companyId) {
      return new Response(JSON.stringify({
        error: 'Missing required credentials (companyId)'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get API configuration based on available credentials
    let apiConfig;
    try {
      apiConfig = getApiConfig(credentials);
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Use the new /contacts/search endpoint with POST method
    const url = `${apiConfig.baseUrl}/contacts/search`;

    // Build request body
    const requestBody: ContactSearchBody = {
      locationId: credentials.companyId,
      pageLimit: Math.min(limit, 500)
    };

    // Add search query if provided
    if (search && search.trim()) {
      requestBody.query = search.trim();
    }
    // Use searchAfter for pagination (except first page)
    else if (searchAfter) {
      requestBody.searchAfter = searchAfter;
    } else {
      // First page - include page: 1
      requestBody.page = 1;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: createHeaders(apiConfig),
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const contacts = data.contacts || [];

    // Get searchAfter value from the last contact for next page
    const nextSearchAfter = contacts.length > 0
      ? contacts[contacts.length - 1].searchAfter
      : null;

    // Map contacts to only include required fields
    const mappedContacts = contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      contactName: c.contactName
    }));

    // Calculate pagination metadata
    const totalCount = data.total || mappedContacts.length;
    // hasMore is true only if we got contacts and have a full page
    const hasMore = mappedContacts.length > 0 && mappedContacts.length === limit;

    return new Response(JSON.stringify({
      contacts: mappedContacts,
      searchAfter: nextSearchAfter,
      nextPageUrl: nextSearchAfter, // for backward compatibility
      hasMore: hasMore,
      totalCount: totalCount,
      isSearch: !!(search && search.trim()),
      success: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error("Error in fetch-ghl-contacts function:", error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
};

serve(handler);