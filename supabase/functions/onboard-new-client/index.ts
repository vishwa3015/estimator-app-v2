import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
  return simpleResponse(200, JSON.stringify({
    error: message,
    success: false
  }));
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

const validatePassword = (password: string) => {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }

  if (!/[!@$*_]/.test(password)) {
    return 'Password must contain at least one special character (!@$*_)';
  }

  return null;
};

const handler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  try {
    const { locationId, pit, email, password, company_name, company_logo_url } = await req.json();

    // Validate credentials object exists
    if (!locationId || !pit || !email || !password) {
      return errorResponse(400, 'Missing required fields: locationId, pit, email, and password are required');
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return errorResponse(400, passwordError);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user already exists in auth by email
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return errorResponse(500, 'Failed to check existing users');
    }

    const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());

    if (userExists) {
      console.error('User already exists with this email in auth');
      return errorResponse(400, 'User already exists with this email');
    }

    // Get API configuration based on available credentials
    let apiConfig;
    try {
      apiConfig = getApiConfig({ pit });
    } catch (error) {
      return errorResponse(400, error.message);
    }

    let url = `${apiConfig.baseUrl}/opportunities/pipelines?locationId=${locationId}`;

    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }

    const response = await fetch(url, {
      method: "GET",
      headers: createHeaders(apiConfig)
    });

    if (!response.ok) {
      console.error(`GHL pipeline API error: ${response.status} ${response.statusText}`);
      return errorResponse(400, `Failed to fetch pipelines: Invalid credentials or location ID`);
    }

    const pipelineAPIResponse = await response.json();

    const cashPipelineId = pipelineAPIResponse?.pipelines?.find(pl => pl.name === '003. Roofing - CASH / REPAIRS')?.id;
    const insurancePipelineId = pipelineAPIResponse?.pipelines?.find(pl => pl.name === '004. Roofing - INSURANCE')?.id;

    // Fetch both API key and EagleView credentials from user_profiles table
    const { data: existingUser, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('name', email)
      .single();

    if ((profileError && profileError?.details !== 'The result contains 0 rows') || existingUser?.id) {
      console.error('Error User already exists with this email:', profileError);
      return errorResponse(400, 'User already exists with this email');
    }

    const { data: createdUser, error: userCreationError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {},
      email_confirm: true,
    });

    if (userCreationError) {
      console.error('Error while creating user in auth system:', {
        message: userCreationError.message,
        status: userCreationError.status,
      });
      return errorResponse(400, `Failed to create user: ${userCreationError.message}`);
    }

    if (!createdUser?.user?.id) {
      console.error('User created but no ID returned');
      return errorResponse(500, 'User creation failed: No user ID returned');
    }

    const userId = createdUser.user.id;
    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Prepare user profile payload
    const payload = {
      id: userId,
      name: email,
      account_type: 'Admin',
      api_key: pit,
      location_id: locationId,
      cash_pipeline_id: cashPipelineId,
      insurance_pipeline_id: insurancePipelineId,
      company_name,
      company_logo_url,
      private_integration_token: pit,
    }
    const { data: updatedUser, error: updatedUserError } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('name', email)
      .single();

    if (updatedUserError) {
      console.error('Error updating user profile:', updatedUserError);
      await supabase.auth.admin.deleteUser(userId);
      return errorResponse(400, `Failed to create user profile: ${updatedUserError.message}`);
    }

    // Optional: Create test contact
    let contactCreationResult = null;

    try {
      const contactData = {
        firstName: "Test User",
        email: "success@smartroofing.ai",
        locationId: locationId
      };

      const contactUrl = `${apiConfig.baseUrl}/contacts/`;
      const contactResponse = await fetch(contactUrl, {
        method: 'POST',
        headers: createHeaders(apiConfig),
        body: JSON.stringify(contactData)
      });

      if (contactResponse.ok) {
        contactCreationResult = await contactResponse.json();
      } else {
        const errorText = await contactResponse.text();
        console.error(`Failed to create contact: ${contactResponse.status}`, errorText);
      }
    } catch (contactError) {
      console.error('Error creating contact:', contactError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'User onboarded successfully',
      userId: userId,
      updatedUser
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error("Error in onboard-new-client function:", error);
    return errorResponse(500, `Server error: ${error.message}`);
  }
};

serve(handler);