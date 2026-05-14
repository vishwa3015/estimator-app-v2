import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Get API configuration based on credentials
const getApiConfig = (credentials) => {
  // Priority 1: Services API (PIT)
  if (credentials.pit) {
    return {
      type: 'services',
      baseUrl: 'https://services.leadconnectorhq.com',
      authHeader: `Bearer ${credentials.pit}`,
      version: '2021-07-28'
    };
  }

  // Priority 2: V1 API
  if (credentials.apiKey) {
    return {
      type: 'v1',
      baseUrl: 'https://rest.gohighlevel.com/v1',
      authHeader: `Bearer ${credentials.apiKey}`,
      version: null
    };
  }

  throw new Error('Missing required credentials (pit or apiKey)');
};

const createHeaders = (apiConfig) => {
  const headers = {
    Authorization: apiConfig.authHeader,
    Accept: 'application/json'
  };

  if (apiConfig.version) {
    headers['Version'] = apiConfig.version;
  }

  return headers;
};

const handler = async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { credentials, contactId } = await req.json();

    if (!credentials) {
      return new Response(
        JSON.stringify({ error: 'Missing credentials' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!contactId) {
      return new Response(
        JSON.stringify({ error: 'Missing contactId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const apiConfig = getApiConfig(credentials);

    let url;


    // Services API (PIT)
    if (apiConfig.type === 'services') {
      url = `${apiConfig.baseUrl}/contacts/${contactId}`;
    }

    // V1 API (API Key)
    if (apiConfig.type === 'v1') {
      url = `${apiConfig.baseUrl}/contacts/?id=${contactId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders(apiConfig)
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: data,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalize response
    const contact =
      apiConfig.type === 'services'
        ? data.contact
        : data.contacts?.[0] || null;

    return new Response(
      JSON.stringify({
        success: true,
        contact,
        traceId: data.traceId || null,
        apiUsed: apiConfig.type
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in fetch-ghl-contact-by-id:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
