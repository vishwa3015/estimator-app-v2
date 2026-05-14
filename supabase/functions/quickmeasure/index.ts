import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface RoofMeasurementData {
  Area?: number | string | null;
  Facets?: number | string | null;
  Pitch?: number | string | null;
  Ridges?: number | string | null;
  Hips?: number | string | null;
  Valleys?: number | string | null;
  Rakes?: number | string | null;
  Eaves?: number | string | null;
  Bends?: number | string | null;
  Step?: number | string | null;
  Perimeter?: number | string | null;
  Stories?: number | string | null;
  LeakBarrier?: number | string | null;
  Assets?: { Report?: string | null };
}

const QUICKMEASURE_TOKEN_URL =
  "https://ssoext.gaf.com/oauth2/ausclyogeZBNESNcI4x6/v1/token";

const GHL_API_BASE_URL = "https://services.leadconnectorhq.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  Vary: "Origin",
};

const createGHLHeaders = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  Accept: "application/json",
  Version: "2021-07-28",
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}


const TOKEN_BUFFER_MS = 5 * 60 * 1000;

function isTokenValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - TOKEN_BUFFER_MS > Date.now();
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const SMTP_USER = "rajan.vasani@smartroofing.ai";
const SMTP_PASS = "dujg ydyr ljxg anma";

async function sendOtpEmail(toEmail: string, otp: string): Promise<void> {
  const nodemailer = await import("https://esm.sh/nodemailer@6.9.9");

  const transporter = nodemailer.default.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });

  await transporter.sendMail({
    from: `"QuickMeasure" <${SMTP_USER}>`,
    to: toEmail,
    subject: "Your QuickMeasure Verification Code",
    text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it.`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a1a; margin-bottom: 8px;">Email Verification</h2>
  <p style="color: #555; margin-bottom: 24px;">Use the code below to verify your GAF QuickMeasure account email.</p>
  <div style="background: #f4f4f4; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
    <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
  </div>
  <p style="color: #888; font-size: 13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
  <p style="color: #aaa; font-size: 12px; margin-top: 16px;">If you did not request this, ignore this email.</p>
</body>
</html>`,
  });
}

async function fetchAndCacheToken(
  supabase: ReturnType<typeof createClient>,
  location_id: string,
  creds: {
    quickmeasure_client_id: string;
    quickmeasure_client_secret: string;
    quickmeasure_audience: string;
    quickmeasure_scope: string | null;
  }
): Promise<string> {
  const defaultScope =
    "Subscriber:GetSubscriberDetails Subscriber:SiteStatus Subscriber:AccountCheck " +
    "Subscriber:CoverageCheck Subscriber:OrderHistory Subscriber:OrderSearch " +
    "Subscriber:Order Subscriber:Download";
  const scopeToUse = creds.quickmeasure_scope || defaultScope;

  const formData = new URLSearchParams();
  formData.append("grant_type", "client_credentials");
  formData.append("client_id", creds.quickmeasure_client_id);
  formData.append("client_secret", creds.quickmeasure_client_secret);
  formData.append("audience", creds.quickmeasure_audience);
  formData.append("scope", scopeToUse);

  const tokenResponse = await fetch(QUICKMEASURE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("Okta token request failed:", tokenResponse.status, errorText);
    throw new Error(`Failed to obtain access token from Okta: ${tokenResponse.status}`);
  }

  const tokenData: { access_token?: string; expires_in?: number } =
    await tokenResponse.json();

  if (!tokenData.access_token || !tokenData.expires_in) {
    throw new Error("Invalid token response from Okta");
  }

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  const { error: saveError } = await supabase
    .from("user_profiles")
    .update({
      quickmeasure_access_token: tokenData.access_token,
      quickmeasure_token_expires_at: expiresAt,
    })
    .eq("location_id", location_id);

  if (saveError) {
    console.error("Failed to cache token in Supabase:", saveError.message);
  } else {
    console.log("QuickMeasure token cached until:", expiresAt);
  }

  return tokenData.access_token;
}

async function getValidToken(
  supabase: ReturnType<typeof createClient>,
  location_id: string
): Promise<string> {
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select(
      "quickmeasure_client_id, quickmeasure_client_secret, quickmeasure_audience, " +
      "quickmeasure_scope, quickmeasure_access_token, quickmeasure_token_expires_at"
    )
    .eq("location_id", location_id)
    .single();

  if (error || !profile) {
    throw new Error("QuickMeasure credentials not found for this location");
  }

  const {
    quickmeasure_client_id,
    quickmeasure_client_secret,
    quickmeasure_audience,
    quickmeasure_scope,
    quickmeasure_access_token,
    quickmeasure_token_expires_at,
  } = profile;

  if (!quickmeasure_client_id || !quickmeasure_client_secret || !quickmeasure_audience) {
    throw new Error("QuickMeasure credentials incomplete");
  }

  if (quickmeasure_access_token && isTokenValid(quickmeasure_token_expires_at)) {
    return quickmeasure_access_token;
  }

  return fetchAndCacheToken(supabase, location_id, {
    quickmeasure_client_id,
    quickmeasure_client_secret,
    quickmeasure_audience,
    quickmeasure_scope,
  });
}

async function handleSendOtp(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { location_id?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { location_id, email } = body;

  if (!location_id || !email || !email.includes("@")) {
    return jsonResponse({ error: "location_id and a valid email are required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("location_id")
    .eq("location_id", location_id)
    .single();

  if (profileError || !profile) {
    return jsonResponse({ error: "Location not found" }, 404);
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: upsertError } = await supabase
    .from("quickmeasure_otp_verifications")
    .upsert({
      location_id,
      email: email.toLowerCase().trim(),
      otp_code: otp,
      expires_at: expiresAt,
      verified: false,
    }, { onConflict: "location_id,email" });

  if (upsertError) {
    console.error("Failed to store OTP:", upsertError);
    return jsonResponse({ error: "Failed to generate OTP" }, 500);
  }

  try {
    await sendOtpEmail(email, otp);
  } catch (e) {
    console.error("Failed to send OTP email:", e);
    return jsonResponse({ error: "Failed to send OTP email. Check SMTP config." }, 500);
  }

  return jsonResponse({ success: true, message: "OTP sent to " + email });
}

async function handleVerifyOtp(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { location_id?: string; email?: string; otp?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { location_id, email, otp } = body;

  if (!location_id || !email || !otp) {
    return jsonResponse({ error: "location_id, email, and otp are required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  const { data: record, error } = await supabase
    .from("quickmeasure_otp_verifications")
    .select("*")
    .eq("location_id", location_id)
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !record) {
    return jsonResponse({ success: false, error: "OTP not found. Please request a new one." }, 400);
  }

  if (record.verified) {
    return jsonResponse({ success: false, error: "OTP already used. Please request a new one." }, 400);
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return jsonResponse({ success: false, error: "OTP has expired. Please request a new one." }, 400);
  }

  if (record.otp_code !== otp.trim()) {
    return jsonResponse({ success: false, error: "Incorrect OTP. Please try again." }, 400);
  }

  await supabase
    .from("quickmeasure_otp_verifications")
    .update({ verified: true })
    .eq("location_id", location_id)
    .eq("email", email.toLowerCase().trim());

  return jsonResponse({ success: true, message: "OTP verified successfully" });
}

interface QuickMeasureWebhookPayload {
  GAFOrderNumber?: number;
  gafOrderNumber?: number;
  SubscriberOrderNumber?: string | null;
  subscriberOrderNumber?: string | null;
  OrderStatus?: string;
  orderStatus?: string;
  GroupOrderStatus?: string;
  groupOrderStatus?: string;
  ReportUrl?: string | null;
  reportUrl?: string | null;
  SubscriberCustomField1?: string | null;
  subscriberCustomField1?: string | null;
  SubscriberReference?: string | null;
  OrderId?: number;
  orderId?: number;
  Status?: string;
  status?: string;
  RoofMeasurement?: Record<string, unknown> | null;
  roofMeasurement?: Record<string, unknown> | null;
  TrackingId?: string | null;
  ProblemCode?: string | null;
}

async function handleWebhook(req: Request): Promise<Response> {
  if (req.method === "GET") {
    return jsonResponse({ status: "ok", service: "quickmeasure-webhook" });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: QuickMeasureWebhookPayload;
  let rawBody = "";
  try {
    rawBody = await req.text();
    console.log("QM Webhook raw body:", rawBody);
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Invalid JSON body:", rawBody);
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const expectedSecret = Deno.env.get("QUICKMEASURE_WEBHOOK_SECRET");
  if (expectedSecret) {
    const incomingSecret =
      req.headers.get("x-webhook-secret") ||
      req.headers.get("x-quickmeasure-secret") ||
      req.headers.get("authorization");
    if (incomingSecret !== expectedSecret) {
      console.error("Webhook secret mismatch");
      return jsonResponse({ received: true, warning: "Secret mismatch" }, 200);
    }
  }

  const gafOrderNumber =
    payload.GAFOrderNumber ?? payload.gafOrderNumber ?? payload.OrderId ?? payload.orderId ?? null;

  const subscriberOrderNumber = payload.SubscriberOrderNumber ?? payload.subscriberOrderNumber ?? null;

  const rawOrderStatus =
    payload.OrderStatus ?? payload.orderStatus ?? payload.Status ?? payload.status ?? "";

  const rawGroupOrderStatus = payload.GroupOrderStatus ?? payload.groupOrderStatus ?? "";

  const roofMeasurement = payload.RoofMeasurement ?? payload.roofMeasurement ?? null;
  const reportUrl = payload.ReportUrl ?? payload.reportUrl ?? null;
  const trackingId = payload.TrackingId ?? null;
  const problemCode = payload.ProblemCode ?? null;

const rmTyped = roofMeasurement as RoofMeasurementData | null;
const isCompleted =
  ["success", "completed"].includes(rawOrderStatus.toLowerCase()) ||
  ["success", "completed"].includes(rawGroupOrderStatus.toLowerCase()) ||
  (rmTyped != null && Number(rmTyped.Area ?? 0) > 0);

  const resolvedStatus = isCompleted
    ? "Completed"
    : rawOrderStatus || rawGroupOrderStatus || "Placed";

  const assetReportFilename = rmTyped?.Assets?.Report ?? null;
  const resolvedReportUrl = reportUrl || assetReportFilename || null;

  console.log("QM Webhook parsed:", {
    gafOrderNumber,
    subscriberOrderNumber,
    rawOrderStatus,
    rawGroupOrderStatus,
    resolvedStatus,
    isCompleted,
    hasRoofMeasurement: !!roofMeasurement,
    roofArea: rmTyped?.Area,
    resolvedReportUrl,
    trackingId,
  });

  if (!gafOrderNumber) {
    console.warn("Missing gafOrderNumber — cannot route webhook");
    return jsonResponse({ received: true, warning: "No gafOrderNumber" }, 200);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase env vars");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: rows, error: rowsError } = await supabase
    .rpc("find_estimate_by_qm_order", {
      p_gaf_order_number: String(gafOrderNumber),
      p_subscriber_order_number: subscriberOrderNumber ?? null,
    });

  const row = rows?.[0];

  if (!row) {
    console.error(
      "estimate_documents_v2 lookup failed for gafOrderNumber:",
      gafOrderNumber,
      "subscriberOrderNumber:",
      subscriberOrderNumber,
      rowsError,
    );
    return jsonResponse({ received: true, warning: "Estimate not found for this order" }, 200);
  }

  const { id: estimateId, location_id: crmLocationId, contact_id: crmContactId, selected_opportunity_id: crmOpportunityId } = row;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("private_integration_token")
    .eq("location_id", crmLocationId)
    .single();

  if (!profile?.private_integration_token) {
    console.error("No API key for location:", crmLocationId);
    return jsonResponse({ received: true, warning: "API key not found" }, 200);
  }

  const customFields: Array<{ key: string; field_value: string }> = [
    { key: "quickmeasure_order_status", field_value: resolvedStatus },
    { key: "quickmeasure_gaf_order_number", field_value: String(gafOrderNumber) },
  ];

  if (subscriberOrderNumber) {
    customFields.push({
      key: "quickmeasure_subscriber_order_number",
      field_value: subscriberOrderNumber,
    });
  }

  if (resolvedReportUrl) {
    customFields.push({ key: "quickmeasure_report_url", field_value: resolvedReportUrl });
  }

  if (roofMeasurement) {
    customFields.push({
      key: "quickmeasure_measurement_data",
      field_value: JSON.stringify(roofMeasurement),
    });
  }

try {
  if (!crmOpportunityId) {
    console.warn("No opportunity ID found — skipping GHL update");
  } else {
    const ghlRes = await fetch(`${GHL_API_BASE_URL}/opportunities/${crmOpportunityId}`, {
      method: "PUT",
      headers: createGHLHeaders(profile.private_integration_token),
      body: JSON.stringify({ customFields }),
    });

    if (!ghlRes.ok) {
      const err = await ghlRes.json().catch(() => ({}));
      console.error("GHL opportunity update failed:", ghlRes.status, err);
      return jsonResponse(
        {
          received: true,
            warning: `GHL update failed: ${err instanceof Object && "message" in err ? (err as { message: string }).message : ghlRes.statusText}`,
        },
        200,
      );
    }
    console.log("GHL opportunity updated:", crmOpportunityId);
  }
} catch (e) {
  console.error("GHL update threw:", e);
  return jsonResponse({ received: true, warning: "GHL update exception" }, 200);
}

  const existingFormData = (row.form_data as Record<string, unknown>) || {};
  const existingSection4 = (existingFormData["4"] as Record<string, unknown>) || {};
  const existingManualMeasurements = (existingSection4.manualMeasurements as Record<string, unknown>) || {};

  const updatedManualMeasurements: Record<string, unknown> = { ...existingManualMeasurements };

  if (roofMeasurement && isCompleted) {
    const rm = roofMeasurement as RoofMeasurementData;

    if (rm.Area != null && Number(rm.Area) > 0) {
      updatedManualMeasurements.roof_area_sqft = String(rm.Area);
    }

    if (rm.Facets != null) {
      updatedManualMeasurements.roof_facets = String(rm.Facets);
    }

    if (rm.Pitch != null) {
      const pitchVal = String(rm.Pitch).includes("/")
        ? String(rm.Pitch).split("/")[0]
        : String(rm.Pitch);
      updatedManualMeasurements.pitch = pitchVal;
    }

    const ridgesVal = Number(rm.Ridges ?? 0);
    const hipsVal = Number(rm.Hips ?? 0);
    if (ridgesVal > 0 || hipsVal > 0) {
      updatedManualMeasurements.ridges_hips_ft = String(ridgesVal + hipsVal);
    }

    if (rm.Valleys != null) {
      updatedManualMeasurements.valleys_ft = String(rm.Valleys);
    }

    if (rm.Rakes != null) {
      updatedManualMeasurements.rakes_ft = String(rm.Rakes);
    }

    if (rm.Eaves != null) {
      updatedManualMeasurements.eaves_ft = String(rm.Eaves);
    }

    const bendsVal = rm.Bends ?? rm.Step ?? rm.Perimeter ?? null;
    if (bendsVal != null) {
      updatedManualMeasurements.bends_ft = String(bendsVal);
    }

    if (rm.Stories != null) {
      updatedManualMeasurements.stories = String(rm.Stories);
    }

    if (rm.LeakBarrier != null && Number(rm.LeakBarrier) > 0) {
      updatedManualMeasurements.attic_sqft = String(rm.LeakBarrier);
    }
  }

  const updatedSection4: Record<string, unknown> = {
    ...existingSection4,
    quickmeasure_order_status: resolvedStatus,
    quickmeasure_report_url: resolvedReportUrl ?? existingSection4.quickmeasure_report_url ?? null,
    ...(roofMeasurement ? { quickmeasure_measurement_data: roofMeasurement } : {}),
    ...(subscriberOrderNumber ? { quickmeasure_subscriber_order_number: subscriberOrderNumber } : {}),
    ...(trackingId ? { quickmeasure_tracking_id: trackingId } : {}),
    ...(problemCode ? { quickmeasure_problem_code: problemCode } : {}),
    ...(isCompleted && roofMeasurement ? { manualMeasurements: updatedManualMeasurements } : {}),
  };

  const { error: updateError } = await supabase
    .from("estimate_documents_v2")
    .update({
      form_data: {
        ...existingFormData,
        "4": updatedSection4,
      },
    })
    .eq("id", estimateId);

  return jsonResponse({ success: true, received: true });
}

async function handleTokenProxy(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    console.error("Method not allowed:", req.method);
    return jsonResponse({ error: "Method not allowed", allowed: ["POST"] }, 405);
  }

  let body: { location_id?: string };
  try {
    body = await req.json();
  } catch (e) {
    console.error("Invalid JSON body:", e);
    return jsonResponse({ error: "Invalid JSON in request body" }, 400);
  }

  const { location_id } = body;

  if (!location_id || typeof location_id !== "string") {
    console.error("Missing or invalid location_id:", location_id);
    return jsonResponse(
      { error: "location_id is required and must be a string" },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const access_token = await getValidToken(supabase, location_id);
    return jsonResponse({ access_token, token_type: "Bearer" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to obtain access token";
    console.error("handleTokenProxy error:", e);
    return jsonResponse({ error: msg }, 500);
  }
}

async function handleGafProxy(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { location_id?: string; path?: string; method?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { location_id, path, method = "GET", payload } = body;

  if (!location_id || path === undefined) {
    return jsonResponse({ error: "location_id and path are required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);


  let accessToken: string;
  try {
    accessToken = await getValidToken(supabase, location_id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("handleGafProxy: failed to obtain token:", msg);
    return jsonResponse({ error: `Failed to obtain QuickMeasure token: ${msg}` }, 500);
  }

  const gafUrl = path
    ? `https://gafapis.gaf.com/partner/SMT/${path}`
    : `https://gafapis.gaf.com/partner/SMT`;

  const gafRes = await fetch(gafUrl, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });

  const data = await gafRes.json();
  return jsonResponse(data, gafRes.status);
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (url.pathname.endsWith("/webhook")) {
    return await handleWebhook(req);
  }
  if (url.pathname.endsWith("/gaf-proxy")) {
    return await handleGafProxy(req);
  }
  if (url.pathname.endsWith("/send-otp")) {
      return await handleSendOtp(req);
  } 
  if (url.pathname.endsWith("/verify-otp")) { 
    return await handleVerifyOtp(req);
  }

  try {
    return await handleTokenProxy(req);
  } catch (error) {
    console.error("Unhandled error in quickmeasure-token-proxy:", error);
    return jsonResponse(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});