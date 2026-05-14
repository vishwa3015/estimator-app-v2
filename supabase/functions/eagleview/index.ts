console.info('eagleview function started');
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { create, verify, decode } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import type { Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// Permissive CORS for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin'
};

const API_BASE_URL = 'https://rest.gohighlevel.com/v1';
const EAGLEVIEW_API_BASE_URL = 'https://apicenter.eagleview.com';
const EAGLEVIEW_JWKS_URL = 'https://evkeys.eagleview.com/auth/jwks.json';
const EAGLEVIEW_ISSUER = 'https://auth.eagleview.com';
const EAGLEVIEW_TOKEN_URL = "https://apicenter.eagleview.com/oauth2/v1/token";

// EagleView JWKS (JSON Web Key Set) for JWT signature verification
const EAGLEVIEW_JWKS = {
  "keys": [
    {
      "alg": "RS256",
      "e": "AQAB",
      "kid": "e3141e89-4a48-4ff4-ae0b-08889e3d0798",
      "kty": "RSA",
      "n": "2SJQ5KfKseDZuxD6CK-5hOUxV2vwYTOFz5zE1ao6MOtgSDEokz9XipzQqdOcGn3Dfwk_3MvOGWHU67pr_39hmeftRJdA49zRctwlgK2vSZyCw778hLELLTIIldzMkOWc7BqLYawO4BqJIAvY57Xs-weFO4SQDP7zJ_m0bB7OQhkO_HfMsdXMu0tDr0aWRiZjbvnThS1-9bLkzdyV8hJTX3Jy7y2wFHNo5pQSLu5_OBMKBFlOtzdY7paGx8-FQjM0VucBJey7VQBgy9Oi_tMH2SEqy7OY_uh9HOvsq6gY4XXf6dIe9E9VZ4yYX_xonPI64wyHRdU0NSJnS_iUoids3fIEfVMF0VdSfSb1FeW288TVh4PCOsKINVr1SSbpoWSU_NtFOFOoxbMX4G1Q43JbK5aADHWDhlwbFXQu6Wp4ItI-5nY6g48MefO6kwqx8-SC734L9KAfpTFPxcJhyd9dE4Jzl-qxE00Ed71LoLIyuknX4EXV7CApWVJ7C22ZOR-k_2lWXKlNlYJ-cPjbtow_QT5BpnDI40-JNDEg98nok5_WRCCIJFxNJbi_Iva3qnBk-fyF_tqVMsAspMFZ_DET7HtnF9gE1IV1wua2s_DRPfVkN3TAugwv2nyfvuGrnhY_4oKkYRmMsL0UFP6PDrXCWezdAWzfc_J9XPhLJKxetBM"
    },
    {
      "alg": "RS256",
      "e": "AQAB",
      "kid": "6958615c-f159-402c-b511-30f35bd58ab1",
      "kty": "RSA",
      "n": "l3SKRrnm3rmdOf90Mn6GmSopo5zK6rqQWPixVljcpxp8mbU-DVHtybe241uowPYv1LaA9oxr7Niwcmtg8qXqXt2DOnJV7UkmyJMfSUhkN8HCiamugjXXMg4IBhNe55VERN7w6-NFOH6miapRRKAn_KnCuvAufQz_qtP-gwL4XlGPHYpNILJkYyZzYrNhTXdmjDG47X9hxqN_o5ICZEMwtyWhJYydcxT8bOQDsKR9suiChxkeaUP7FqCy_zKl3iegS_7jF__baDHzffRi6-5lCm6HROmgb9y72mPuaQJLwEUQvR6xHQGTfPYVZgCC-6DRQcRW3JoRFHHxJHgflqagPkWKcQei5ujXwXvGzhf6U5-SXN6Fa7vJX4oKRsjPYAYB6hrOg9rbIUc4MVDYHJxlP_DOycG3_24cxfEwqWyUCd0GefImurM3NimajdyoxwAdkSWCfnFonaHuItbJyHReyfTLINKWT81BZPv0qb43eBY5ygvXTWTLa7cDIuBELZwLoDJ3L3TD9bN6D62VawbNobhn8Ub-d_gHfiF6Bw20-t1OMDnB1LEi9O7vvhdQQTXmybALTpqrHWJ6DUHlsCFQxZNgcUfeZpLwh64rHbJgOzW4isI6JN6UY0SgXSq1L5SLkQ30IDTqIvk1ImG2ic2mV-T7R7cqSfggSubAYLe7JqU"
    }
  ]
};

const createHeaders = (apiKey: string) => ({
  'Authorization': `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
});

/**
 * Format URL for Google Docs Viewer
 */
const formatGoogleViewerUrl = (url: string, embedded: boolean): string => {
  if (!url) return '';
  if (url.startsWith('https://docs.google.com/viewer')) {
    return url;
  }
  const embeddedParam = embedded ? '&embedded=true' : '';
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}${embeddedParam}`;
};

const simpleResponse = (status: number, respObj: string | null = null) => {
  return new Response(respObj, {
    headers: {
      ...corsHeaders,
      ...respObj !== null && {
        'Content-Type': 'application/json'
      }
    },
    status
  });
};

const errorResponse = (status: number, message: string) => {
  return simpleResponse(status, JSON.stringify({
    error: message
  }));
};

/**
 * Fetch JWKS (JSON Web Key Set) from EagleView
 * Uses constant JWKS by default, fetches fresh on force refresh
 */
interface JWKSet {
  keys: Array<{
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
  }>;
}
const fetchJWKS = async (forceRefresh = false): Promise<JWKSet> => {  // If force refresh, fetch from URL
  if (forceRefresh) {
    console.log('Fetching fresh JWKS from EagleView');
    try {
      const response = await fetch(EAGLEVIEW_JWKS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching JWKS:', error);
      // Fallback to constant JWKS if fetch fails
      console.log('Falling back to constant JWKS');
      return EAGLEVIEW_JWKS;
    }
  }

  // Use constant JWKS by default
  console.log('Using constant JWKS');
  return EAGLEVIEW_JWKS;
};

/**
 * Convert JWK to CryptoKey for verification
 */
const jwkToCryptoKey = async (jwk: JWKSet["keys"][number]): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
};

/**
 * Validate JWT token from EagleView webhook
 */
const validateJWT = async (token: string, queryString: string, retryCount = 0): Promise<boolean> => {
  try {
    // Decode token header to get the kid (key ID)
    const [headerPart] = token.split('.');
    const header = JSON.parse(atob(headerPart));
    const kid = header.kid;

    if (!kid) {
      console.error('No kid found in JWT header');
      return false;
    }

    // Fetch JWKS
    const jwks = await fetchJWKS(retryCount > 0);

    // Find matching key by kid
    const jwk = jwks.keys?.find((key) => key.kid === kid);
    if (!jwk) {
      // Retry once with fresh JWKS if first attempt fails
      if (retryCount === 0) {
        console.log(`Retrying with fresh JWKS for missing kid: ${kid}`);
        return await validateJWT(token, queryString, retryCount + 1);
      }
      return false;
    }

    // Convert JWK to CryptoKey
    const cryptoKey = await jwkToCryptoKey(jwk);

    // Verify token signature
    const payload = await verify(token, cryptoKey) as Payload & {
      iss?: string;
      exp?: number;
      x_target_client?: string;
      x_query_parameter?: string;
    };

    // Validate issuer
    if (payload.iss !== EAGLEVIEW_ISSUER) {
      console.error(`Invalid issuer: ${payload.iss}`);
      return false;
    }

    // Validate expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.error('Token has expired');
      // Retry once with fresh JWKS if first attempt fails
      if (retryCount === 0) {
        console.log('Retrying with fresh JWKS for expired token');
        return await validateJWT(token, queryString, retryCount + 1);
      }
      return false;
    }

    // Validate query parameters (optional but recommended)
    if (payload.x_query_parameter) {
      const decodedQueryParams = atob(payload.x_query_parameter);
      // Decode the received query string to match encoded characters like %3A -> :
      const decodedReceivedQuery = decodeURIComponent(queryString);
      // Verify that the decoded query parameters match the actual request
      if (decodedQueryParams !== decodedReceivedQuery) {
        console.warn('Query parameter mismatch - potential tampering detected');
        console.log(`Expected: ${decodedQueryParams}`);
        console.log(`Received: ${decodedReceivedQuery}`);
      } else {
        console.log('Query parameters verified successfully');
      }
    }

    console.log('JWT validation successful');
    return true;
  } catch (error) {
    console.error('JWT validation error:', error);

    // Retry once with fresh JWKS if first attempt fails
    if (retryCount === 0) {
      console.log('Retrying JWT validation with fresh JWKS');
      return await validateJWT(token, queryString, retryCount + 1);
    }
    return false;
  }
};

// EagleView OrderStatusUpdate webhook handler with JWT security
// Validates JWT token from authorization header before processing
const handleOrderStatusUpdate = async (url: URL, authHeader: string | null) => {
  try {
    // Validate JWT token from authorization header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return errorResponse(401, 'Unauthorized - Missing or invalid authorization header');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const queryString = url.search.substring(1); // Remove '?' prefix

    // Validate the JWT token
    const isValid = await validateJWT(token, queryString);
    if (!isValid) {
      console.error('JWT validation failed');
      return errorResponse(401, 'Unauthorized - Invalid token');
    }

    // Parse query parameters from the URL
    const eagleviewReportStatus = url.searchParams.get('StatusId');
    const refId = url.searchParams.get('RefId');
    const eagleviewReportId = url.searchParams.get('ReportId');

    if (!refId || !eagleviewReportStatus || !eagleviewReportId) {
      console.error('Missing one or more required parameters:', {
        refId,
        eagleviewReportStatus,
        eagleviewReportId
      });
      return errorResponse(400, 'Missing required parameters');
    }

    const parts = refId.split(':');
    if (parts.length !== 2) {
      console.error('Invalid RefId format:', refId);
      return errorResponse(400, 'Invalid RefId format');
    }

    const [crmLocationId, crmContactId] = parts;
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch both API key and EagleView credentials from user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('api_key, eagleview_api_client_id, eagleview_api_refresh_token')
      .eq('location_id', crmLocationId)
      .single();

    if (profileError || !profile?.api_key) {
      console.error('Error fetching API key:', profileError);
      return errorResponse(404, 'API key not found for location');
    }

    const crmToken = profile.api_key;
    if (!crmToken || crmToken.length === 0) {
      console.error('Invalid CRM API token');
      return errorResponse(400, 'Invalid CRM API token');
    }

    // Prepare custom fields to update
    const customFields = [
      {
        key: "eagleview_report_id",
        field_value: eagleviewReportId
      },
      {
        key: "eagleview_report_status",
        field_value: eagleviewReportStatus
      }
    ];

    // If status is 5 (Completed), fetch the report download URL
    if (eagleviewReportStatus === '5' && profile.eagleview_api_client_id && profile.eagleview_api_refresh_token) {
      try {
        console.log('Report completed, fetching report download URL...');

        // Get OAuth access token using refresh token
        const tokenResponse = await fetch(EAGLEVIEW_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: profile.eagleview_api_refresh_token,
            client_id: profile.eagleview_api_client_id,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error(`Failed to get EagleView access token: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Fetch the report details
        const reportResponse = await fetch(
          `${EAGLEVIEW_API_BASE_URL}/v3/Report/GetReport?reportId=${eagleviewReportId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!reportResponse.ok) {
          throw new Error(`Failed to fetch report: ${reportResponse.status}`);
        }

        const reportData = await reportResponse.json();

        if (reportData.ReportDownloadLink) {
          // Format the URL with Google Viewer (without embedded parameter for storage)
          const formattedUrl = formatGoogleViewerUrl(reportData.ReportDownloadLink, false);

          customFields.push({
            key: "eagleview_report_url",
            field_value: formattedUrl
          });

          console.log('Successfully fetched and formatted report download URL');
        }
      } catch (error) {
        console.error('Error fetching report download URL:', error);
        // Continue with status update even if report fetch fails
      }
    }

    const response = await fetch(`${API_BASE_URL}/contacts/${crmContactId}`, {
      method: "PUT",
      headers: createHeaders(crmToken),
      body: JSON.stringify({
        customFields: customFields
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to update contact: ${errorData.message || response.statusText}`);
    }

    console.log(`Successfully updated ${refId}: ${eagleviewReportId} (Status: ${eagleviewReportStatus})`);
    return simpleResponse(200, JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Error processing OrderStatusUpdate:', error);
    return errorResponse(500, 'Internal Server Error');
  }
};

const handler = async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const authHeader = req.headers.get('authorization');

  if (method === 'OPTIONS' || method === 'POST') {
    return simpleResponse(204);
  }

  if (method === 'GET') {
    // Check if this is the OrderStatusUpdate route
    if (url.pathname.includes('OrderStatusUpdate')) {
      return await handleOrderStatusUpdate(url, authHeader);
    } else {
      console.error('Unknown GET route:', url.pathname);
      return errorResponse(404, 'Not Found');
    }
  }

  return errorResponse(405, 'Method Not Allowed');
};

serve(handler);
