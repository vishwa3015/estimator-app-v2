import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  buildSignerCompletionPayload,
  downloadCombinedPdf,
  extractFirstSigner,
  extractTextCustomFields,
  fetchEnvelopeCustomFields,
  fetchEnvelopeSignerCompletionData,
  findEnvelopeId,
  getDocusignAccessToken,
  isCompletedEnvelopeEvent,
  uploadPdfToGhlContact,
  verifyDocusignConnectHmac,
} from "../_shared/docusign.ts";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

// ── Update GHL Contact custom field ──
async function updateGhlContactCustomField(
  pit: string,
  contactId: string,
  url: string,
  estimateId: string,
): Promise<void> {
  try {
    const res = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${pit}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        customFields: [{ key: "signed_pdf_url", field_value: url }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `GHL contact custom field update failed (contactId=${contactId}, estimateId=${estimateId}, status=${res.status}): ${errText}`,
      );
    } else {
      console.log(
        `GHL contact custom field 'signed_pdf_url' updated for contactId=${contactId}, estimateId=${estimateId}, url=${url}`,
      );
    }
  } catch (e) {
    console.error(
      `GHL contact custom field exception (contactId=${contactId}, estimateId=${estimateId}):`,
      e,
    );
  }
}

// ── Update GHL Opportunity custom field ──
async function updateGhlOpportunityCustomField(
  pit: string,
  opportunityId: string,
  url: string,
  estimateId: string,
): Promise<void> {
  try {
    const res = await fetch(`${GHL_API_BASE}/opportunities/${opportunityId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${pit}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify({
        customFields: [{ key: "signed_pdf_url", field_value: url }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(
        `GHL opportunity custom field update failed (opportunityId=${opportunityId}, estimateId=${estimateId}, status=${res.status}): ${errText}`,
      );
    } else {
      console.log(
        `GHL opportunity custom field 'signed_pdf_url' updated for opportunityId=${opportunityId}, estimateId=${estimateId}, url=${url}`,
      );
    }
  } catch (e) {
    console.error(
      `GHL opportunity custom field exception (opportunityId=${opportunityId}, estimateId=${estimateId}):`,
      e,
    );
  }
}

serve(async (req) => {
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, service: "docusign-webhook" }),
      { headers: { "Content-Type": "application/json" } },
    );
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const hmacSecret = Deno.env.get("DOCUSIGN_CONNECT_HMAC_SECRET");
  if (hmacSecret) {
    const sig =
      req.headers.get("x-docusign-signature-1") ??
      req.headers.get("X-DocuSign-Signature-1");
    const ok = await verifyDocusignConnectHmac(rawBody, sig, hmacSecret);
    if (!ok) {
      console.error("DocuSign HMAC verification failed");
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Non-JSON webhook body, length:", rawBody.length);
    return new Response(JSON.stringify({ received: true, warning: "non-json" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isCompletedEnvelopeEvent(payload)) {
    return new Response(JSON.stringify({ received: true, ignored: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const envelopeId = findEnvelopeId(payload);
  if (!envelopeId) {
    console.error("No envelopeId in payload keys:", Object.keys(payload));
    return new Response(JSON.stringify({ received: true, warning: "no envelope id" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Extract custom fields from webhook payload (may be empty depending on Connect config)
  const fieldsFromPayload = extractTextCustomFields(payload);
  let estimateId = fieldsFromPayload.estimate_id;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!estimateId) {
    const { data: row } = await supabase
      .from("estimate_documents_v2")
      .select("id")
      .eq("docusign_envelope_id", envelopeId)
      .maybeSingle();
    estimateId = row?.id;
  }

  if (!estimateId) {
    console.error("Could not resolve estimate for envelope", envelopeId);
    return new Response(JSON.stringify({ received: true, warning: "estimate not found" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: est, error: estErr } = await supabase
    .from("estimate_documents_v2")
    .select("id, opportunity_id, contact_id, location_id, form_data, selected_opportunity_id")
    .eq("id", estimateId)
    .single();

  if (estErr || !est) {
    return new Response(JSON.stringify({ received: true, warning: "estimate row missing" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signer = extractFirstSigner(payload);
  let pdfBytes: Uint8Array;
  let signerCompletionData: Record<string, unknown> | null = null;
  try {
    const { accessToken, basePath, accountId } = await getDocusignAccessToken();
    pdfBytes = await downloadCombinedPdf(accessToken, basePath, accountId, envelopeId);
    try {
      const tabVals = await fetchEnvelopeSignerCompletionData(
        accessToken,
        basePath,
        accountId,
        envelopeId,
      );

      let resolvedFields = fieldsFromPayload;
      const hasTabTitleFields = Object.keys(fieldsFromPayload).some((k) =>
        k.startsWith("tab_title_")
      );

      if (!hasTabTitleFields) {
        try {
          const apiFields = await fetchEnvelopeCustomFields(
            accessToken,
            basePath,
            accountId,
            envelopeId,
          );
          resolvedFields = { ...fieldsFromPayload, ...apiFields };
        } catch (cfErr) {
          console.error("fetchEnvelopeCustomFields failed:", cfErr);
        }
      }

      signerCompletionData = buildSignerCompletionPayload(
        est.form_data,
        tabVals,
        resolvedFields,
      );
    } catch (tabErr) {
      console.error("DocuSign signer tab read failed:", tabErr);
    }
  } catch (e) {
    console.error("Download signed PDF failed:", e);
    return new Response(JSON.stringify({ received: true, error: String(e) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ts = Date.now();
  const storagePath =
    `estimates/${est.opportunity_id}/${estimateId}/${estimateId}-signed-${ts}.pdf`;

  const { error: upErr } = await supabase.storage
    .from("estimate-files")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (upErr) {
    console.error("Supabase storage upload failed:", upErr);
  }

  const { data: urlData } = supabase.storage
    .from("estimate-files")
    .getPublicUrl(storagePath);
  const publicStorageUrl = urlData?.publicUrl ?? null;

  if (!publicStorageUrl) {
    console.error(`getPublicUrl returned empty for storagePath=${storagePath}`);
  }

  const signedAt = signer.signedDateTime
    ? new Date(signer.signedDateTime).toISOString()
    : new Date().toISOString();

  let ghlUrl: string | null = publicStorageUrl;

  if (!est.contact_id || !est.location_id) {
    console.warn(
      `GHL upload skipped: missing contact_id=${est.contact_id} or location_id=${est.location_id} for estimateId=${estimateId}.`,
    );
  } else {
    // ── Fetch GHL credentials once — reused for contact + opportunity ──
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("private_integration_token")
      .eq("location_id", est.location_id)
      .maybeSingle();

    const pit = profile?.private_integration_token;

    if (!pit) {
      console.warn(
        `No private_integration_token for location_id=${est.location_id}, estimateId=${estimateId}.`,
      );
    } else {
      // ── Update GHL Contact ──
      if (pdfBytes.length <= 5 * 1024 * 1024) {
        try {
          const ghl = await uploadPdfToGhlContact(
            pit,
            est.contact_id,
            pdfBytes,
            `estimate-${estimateId}-signed.pdf`,
          );
          ghlUrl = ghl.url ?? publicStorageUrl;
          console.log(
            `GHL direct upload succeeded for contactId=${est.contact_id}, estimateId=${estimateId}, ghlUrl=${ghlUrl}`,
          );
        } catch (e) {
          console.error(
            `GHL direct upload failed (contactId=${est.contact_id}, estimateId=${estimateId}), falling back to public URL:`,
            e,
          );
          ghlUrl = publicStorageUrl;
        }

        if (ghlUrl) {
          await updateGhlContactCustomField(pit, est.contact_id, ghlUrl, estimateId);
        } else {
          console.error(
            `Cannot update GHL contact custom field: ghlUrl is empty for estimateId=${estimateId}`,
          );
        }
      } else {
        console.warn(
          `Signed PDF (${pdfBytes.length} bytes) exceeds GHL 5MB limit for contactId=${est.contact_id}. Storing public URL.`,
        );
        ghlUrl = publicStorageUrl;

        if (ghlUrl) {
          await updateGhlContactCustomField(pit, est.contact_id, ghlUrl, estimateId);
        } else {
          console.error(
            `Cannot update GHL contact custom field: publicStorageUrl is empty for estimateId=${estimateId}`,
          );
        }
      }

      // ── Update GHL Opportunity custom field with signed PDF URL ──
      if (ghlUrl && est.selected_opportunity_id) {
        await updateGhlOpportunityCustomField(
          pit,
          est.selected_opportunity_id,
          ghlUrl,
          estimateId,
        );
      } else if (!est.selected_opportunity_id) {
        console.warn(
          `No selected_opportunity_id on estimate ${estimateId} — skipping opportunity signed PDF update`,
        );
      }
    }
  }

  console.log(`Final ghlUrl for estimateId=${estimateId}:`, ghlUrl);

  // ── Final DB update ──
  const { error: dbErr } = await supabase
    .from("estimate_documents_v2")
    .update({
      docusign_envelope_id: envelopeId,
      docusign_status: "completed",
      signed_at: signedAt,
      signed_by_email: signer.email ?? null,
      signed_by_name: signer.name ?? null,
      signed_pdf_storage_path: upErr ? null : storagePath,
      ghl_signed_document_url: ghlUrl,
      status: "accepted",
      signer_completion_data: signerCompletionData,
    })
    .eq("id", estimateId);

  if (dbErr) {
    console.error("DB update failed:", dbErr);
  }

  return new Response(JSON.stringify({ received: true, estimateId }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
