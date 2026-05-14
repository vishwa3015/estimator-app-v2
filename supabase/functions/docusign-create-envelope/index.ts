import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  corsHeaders,
  getDocusignAccessToken,
  jsonResponse,
} from "../_shared/docusign.ts";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnon) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwtMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const jwt = jwtMatch?.[1]?.trim();
  if (!jwt) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  // getUser() without args does not use global headers in this runtime; pass the JWT explicitly.
  const { data: userData, error: authErr } = await supabaseUser.auth.getUser(jwt);
  if (authErr || !userData.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: {
    estimateId?: string;
    pdfUrl?: string;
    recipientEmail?: string;
    recipientName?: string;
    emailSubject?: string;
    authorizationSigning?: {
      tabs: { tabId: number; tabUuid?: string; title: string; total: number }[];
    };
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const estimateId = body.estimateId?.trim();
  const pdfUrl = body.pdfUrl?.trim();
  const recipientEmail = body.recipientEmail?.trim();
  const recipientName = (body.recipientName ?? "Customer").trim();
  const emailSubject = (body.emailSubject ?? "Please sign your estimate").slice(0, 200);

  if (!estimateId || !pdfUrl || !recipientEmail) {
    return jsonResponse(
      { error: "Missing estimateId, pdfUrl, or recipientEmail" },
      400,
    );
  }

  const { data: est, error: estErr } = await supabaseUser
    .from("estimate_documents_v2")
    .select("id, location_id, opportunity_id, contact_id, status")
    .eq("id", estimateId)
    .single();

  if (estErr || !est) {
    return jsonResponse({ error: "Estimate not found or access denied" }, 404);
  }

  const pdfRes = await fetch(pdfUrl);
  if (!pdfRes.ok) {
    return jsonResponse(
      { error: `Failed to fetch PDF: ${pdfRes.status} ${pdfRes.statusText}` },
      502,
    );
  }
  const pdfBuf = new Uint8Array(await pdfRes.arrayBuffer());

  const { accessToken, basePath, accountId } = await getDocusignAccessToken();

  const authTabs = body.authorizationSigning?.tabs ?? [];

  const signerTabs: Record<string, unknown> = {
    signHereTabs: [
      {
        anchorString: "/DS_SIG/",
        anchorUnits: "pixels",
        anchorXOffset: "0",
        anchorYOffset: "-8",
      },
    ],
    dateSignedTabs: [
      {
        anchorString: "/DS_DATE/",
        anchorUnits: "pixels",
        anchorXOffset: "0",
        anchorYOffset: "-8",
      },
    ],
    textTabs: [
      {
        documentId: "1",
        anchorString: "/DS_CUST_NOTES/",
        anchorUnits: "pixels",
        anchorXOffset: "0",
        anchorYOffset: "-6",
        tabLabel: "CustomerNotes",
        name: "CustomerNotes",
        locked: "false",
        required: "false",
        width: "480",
        height: "90",
        multiline: "true",
      },
    ],
  };

  if (authTabs.length > 0) {
    signerTabs.radioGroupTabs = [
      {
        documentId: "1",
        groupName: "estimate_offer_choice",
        radios: authTabs.map((opt, i) => ({
          documentId: "1",
          anchorString: `/DS_ROPT_${i + 1}/`,
          anchorUnits: "pixels",
          anchorXOffset: "0",
          anchorYOffset: "-4",
          value: String(opt.tabUuid ?? opt.tabId),
          selected: authTabs.length === 1 ? "true" : "false",
          required: authTabs.length > 1 ? "true" : "false",
        })),
      },
    ];
  }

  const envelopeDef = {
    emailSubject,
    status: "sent",
    customFields: {
      textCustomFields: [
        { name: "estimate_id", value: estimateId, required: "false", show: "false" },
        { name: "location_id", value: String(est.location_id ?? ""), required: "false", show: "false" },
        // Keep existing numeric key
        ...authTabs.map((tab) => ({
          name: `tab_title_${String(tab.tabId)}`,
          value: String(tab.title ?? ""),
          required: "false",
          show: "false",
        })),
        // ADD: also store by UUID so webhook lookup matches the radio value
        ...authTabs.map((tab) => ({
          name: `tab_title_${String(tab.tabUuid ?? tab.tabId)}`,
          value: String(tab.title ?? ""),
          required: "false",
          show: "false",
        })),
      ],
    },
    documents: [
      {
        documentBase64: uint8ToBase64(pdfBuf),
        name: "estimate.pdf",
        fileExtension: "pdf",
        documentId: "1",
      },
    ],
    recipients: {
      signers: [
        {
          email: recipientEmail,
          name: recipientName,
          recipientId: "1",
          routingOrder: "1",
          tabs: signerTabs,
        },
      ],
    },
  };

  const envRes = await fetch(
    `${basePath}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelopeDef),
    },
  );

  const envJson = await envRes.json().catch(() => ({}));
  if (!envRes.ok) {
    console.error("DocuSign envelope error:", envJson);
    return jsonResponse(
      { error: "DocuSign envelope failed", details: envJson },
      502,
    );
  }

  const envelopeId = (envJson as { envelopeId?: string }).envelopeId;
  if (!envelopeId) {
    return jsonResponse(
      { error: "DocuSign did not return envelopeId", details: envJson },
      502,
    );
  }

  const sentAt = new Date().toISOString();
  const { error: updErr } = await supabaseUser
    .from("estimate_documents_v2")
    .update({
      docusign_envelope_id: envelopeId,
      docusign_status: "sent",
      docusign_sent_at: sentAt,
      status: "sent",
    })
    .eq("id", estimateId);

  if (updErr) {
    console.error("DB update after DocuSign:", updErr);
    return jsonResponse(
      {
        error: "Envelope created but failed to save envelope id on estimate",
        envelopeId,
      },
      500,
    );
  }

  return jsonResponse({ success: true, envelopeId, status: "sent" });
});
