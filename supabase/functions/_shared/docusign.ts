import { SignJWT, importPKCS8 } from "npm:jose@5.2.0";

const GHL_API_BASE = "https://services.leadconnectorhq.com";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePem(raw: string): string {
  let s = raw.replace(/\\n/g, "\n").trim();
  // Strip accidental wrapping quotes from secret managers
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).replace(/\\n/g, "\n").trim();
  }
  return s;
}

/**
 * DocuSign often provides PKCS#1 PEM (`BEGIN RSA PRIVATE KEY`); `jose` needs PKCS#8.
 * Use Node's `createPrivateKey` (available with Supabase Edge node compat) to convert;
 * `node-forge`'s `wrapRsaPrivateKey` can throw in this runtime (undefined ASN.1 parts).
 */
async function rsaPemToPkcs8ForImport(pem: string): Promise<string> {
  if (pem.includes("BEGIN PRIVATE KEY") && !pem.includes("BEGIN RSA PRIVATE KEY")) {
    return pem;
  }
  if (
    !pem.includes("BEGIN RSA PRIVATE KEY") && !pem.includes("BEGIN PRIVATE KEY")
  ) {
    throw new Error(
      "DOCUSIGN_RSA_PRIVATE_KEY must be unencrypted PEM: BEGIN PRIVATE KEY (PKCS#8) or BEGIN RSA PRIVATE KEY (PKCS#1)",
    );
  }
  try {
    const { createPrivateKey } = await import("node:crypto");
    const keyObject = createPrivateKey(pem);
    const exported = keyObject.export({ format: "pem", type: "pkcs8" });
    if (typeof exported === "string") return exported;
    if (exported instanceof Uint8Array) {
      return new TextDecoder().decode(exported);
    }
    const maybeBuf = exported as { toString?: (enc: string) => string };
    if (typeof maybeBuf?.toString === "function") {
      return maybeBuf.toString("utf8");
    }
    throw new Error("Unexpected PEM export type from node:crypto");
  } catch (e) {
    throw new Error(
      `Could not normalize RSA key to PKCS#8: ${e instanceof Error ? e.message : String(e)}. ` +
        "Try: openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in key.pem",
    );
  }
}

/** One-time JWT consent URL (user in `sub` must complete this while logged into DocuSign). */
function buildJwtConsentUrl(
  integrationKey: string,
  authServer: string,
  redirectUri: string,
): string {
  const host = authServer.startsWith("http")
    ? new URL(authServer).host
    : authServer;
  const params = new URLSearchParams({
    response_type: "code",
    scope: "signature impersonation",
    client_id: integrationKey,
    redirect_uri: redirectUri,
  });
  return `https://${host}/oauth/auth?${params.toString()}`;
}

export async function getDocusignAccessToken(): Promise<{
  accessToken: string;
  basePath: string;
  accountId: string;
}> {
  // const integrationKey = Deno.env.get("DOCUSIGN_INTEGRATION_KEY");
  // const userId = Deno.env.get("DOCUSIGN_USER_ID");
  // const rsaKey = Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY");
  const authServer = Deno.env.get("DOCUSIGN_AUTH_SERVER") ?? "account-d.docusign.com";
  // const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
  const basePath = Deno.env.get("DOCUSIGN_BASE_PATH") ??
    "https://demo.docusign.net/restapi";



  const integrationKey = Deno.env.get("DOCUSIGN_INTEGRATION_KEY");
  const userId = Deno.env.get("DOCUSIGN_USER_ID");
  const rsaKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAoLqudobL6WugkfhZW3OcVOsZqxZtzsKMvQiSY3G+Ife4iIt6
l+jrnUqq85B1J2wEic/V64BdWr8Ti0KT1LL3DUjRL4v3zpDfOtHw7bjEGaB27WRE
mi84TEpzJ+5oUkcygP81WCWLSVS+geRWF5ZhEvPR2vBRAMJlWZApksRftRdhHxdc
OFY3Y3LDnzLjVlhbqWHd5Lo+KHF/mmSPHss/L88hmUsqh0cUu3Hx4/yjl9IJquBL
tjIHT+J9cLlYi913Bhj3cENmKqk0aD9G4tZ4Np/K9gev1Pv1R8gKLvf2lirR7bov
VL7N/hlZn+NNmCe6MeJi1ffXwOwiIRLqsDTevQIDAQABAoIBAAa7oJCj15Q7nJ+r
a52CcPYNsybmQEtSUwWdf6RddhLY3F4RRF1rYGitDA7lP5hwf0WBSKYeMSBFXig4
mGtnOSTRUWdQfFz8LJ27gFWKUTdRmtRu8tYSoaUbKUpu7j0kG7V+UK8UmN/FhlrN
RIilwANEkMc/HJA6PyH1VrMojr8jM50/bagzPHfS5f2E3YqMsNV/niNp0d9XCEgG
Xh3uXyF9UTb2nbR+ojzknLWIamJ3dXDMKZzyCHmJqb5vv44GMnRalYQEnHIO5Dra
GmymvboFrXWWChyUAjs+V/lGLjMwMp8EFotW5YRM5qpuR1NGsY0/wNrAcL3PaxQf
NeVIZoECgYEA9TJmaZxJYMpKAHY/lHeNpDq9mDSz/qKDVfp3afDMT+6X2ofUgj+A
AZ6JziYdBTttAOMj0lgHWIoB0efGU81Amkk9HRjOkH2w6LxtNKRK2PXhD+riDqbL
XJOEFMOYDo+WnZmb24k/uMXPOkLfFhlAWLMAJBqQBLJ4DUSqoryUEpUCgYEAp8+P
+jp9i5bbIlwIiD3yT8idt2rmTJgfbvc1jjZnpcmRCr2t7D+qGV+n9YnsDzwFTqGK
hDSsOo/3fWX/RBzxHWa5XOV+fUZ1KRGOMPI4mFftJ6d6s3Y6p3HxWcqJW6a+btaJ
+lRAdsVuBs7RE6raf1c5dFWUwXCpNnk5t45U+YkCgYBpOq4VGQuszGQh+p2ivAQ/
vS3tCoFNALXYyltBTiSBEWZ+VNjw5QuspjuCC31c53oKbXDMLxdH+kJ5sTy+blIR
ZOkjeaf8/tRTrbo4Y2Hz5uImEKnfm9me63g96QtzBFChZnErMKX2SH59BIH1W/Tv
nDKtS/EO8wDuwM9yc/ggWQKBgBfDDGAiaCSb9+ulnI+uNeGWRr7yJCo0YD8WQj8g
9QxEvoUG1tndKfjt0pqyLPr7RMUdmr+dtcWVHTZkewDqGDpRkW3WEVMr5usp0Tid
E+Z+jNZQoM9IroWHXOWaCFkyA0Uum9sWkwo+apYMMw7V4pqlfz054RaDHXLZN5MG
VIIBAoGBALE3f3ugo7rDwd7LD7z/vtVQfMe3DJiuVL+uCPA/pEhv2LbagqkuRVkn
g0VM2+CRLMxPbBZmNAJ+9bCdLN3VR36Nib2MOB+KlFhiaU6emew7S3hU6H1GXmf0
ZDX8DA2+RYTj+3Q5P65pjuiIeOzMiu8dqFRPVkRP61tyHMucPKiu
-----END RSA PRIVATE KEY-----`; // Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY");
const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
  if (!integrationKey || !userId || !rsaKey || !accountId) {
    throw new Error(
      "Missing DocuSign env: DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_RSA_PRIVATE_KEY, DOCUSIGN_ACCOUNT_ID",
    );
  }

  const pkcs8Pem = await rsaPemToPkcs8ForImport(normalizePem(rsaKey));
  const privateKey = await importPKCS8(pkcs8Pem, "RS256");

  const jwt = await new SignJWT({ scope: "signature impersonation" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(integrationKey)
    .setSubject(userId)
    .setAudience(authServer)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);

  const tokenUrl = authServer.startsWith("http")
    ? `${authServer}/oauth/token`
    : `https://${authServer}/oauth/token`;

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    let oauthErr = "";
    try {
      const j = JSON.parse(errText) as { error?: string };
      oauthErr = j.error ?? "";
    } catch {
      /* plain text body */
    }
    if (oauthErr === "consent_required") {
      const redirectUri =
        Deno.env.get("DOCUSIGN_CONSENT_REDIRECT_URI") ?? "http://localhost";
      const consentUrl = buildJwtConsentUrl(
        integrationKey,
        authServer,
        redirectUri,
      );
      throw new Error(
        `DocuSign JWT consent_required: complete a one-time consent as the DocuSign user whose GUID is DOCUSIGN_USER_ID (${userId}). ` +
          `Open this URL in a browser (while logged into the correct DocuSign account): ${consentUrl} ` +
          `The redirect_uri (${redirectUri}) must exactly match a value under your Integration Key's Additional settings → Redirect URIs. ` +
          `Override with secret DOCUSIGN_CONSENT_REDIRECT_URI if needed. ` +
          `Docs: https://developers.docusign.com/platform/auth/jwt/jwt-get-token/`,
      );
    }
    throw new Error(`DocuSign token error ${tokenRes.status}: ${errText}`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token: string };
  if (!tokenJson.access_token) {
    throw new Error("DocuSign token response missing access_token");
  }

  return {
    accessToken: tokenJson.access_token,
    basePath: basePath.replace(/\/$/, ""),
    accountId,
  };
}

export async function verifyDocusignConnectHmac(
  rawBody: string,
  headerSig: string | null,
  secret: string,
): Promise<boolean> {
  if (!headerSig || !secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const actual = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (actual.length !== headerSig.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ headerSig.charCodeAt(i);
  }
  return diff === 0;
}

export function extractTextCustomFields(obj: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node !== "object") return;
    const rec = node as Record<string, unknown>;
    const tcf = rec.textCustomFields;
    if (Array.isArray(tcf)) {
      for (const f of tcf) {
        if (f && typeof f === "object") {
          const ff = f as Record<string, unknown>;
          if (typeof ff.name === "string" && ff.value != null) {
            out[ff.name] = String(ff.value);
          }
        }
      }
    }
    for (const v of Object.values(rec)) walk(v);
  };
  walk(obj);
  return out;
}

export function findEnvelopeId(payload: Record<string, unknown>): string | null {
  const direct = payload.envelopeId;
  if (typeof direct === "string" && direct.length > 0) return direct;
  const data = payload.data as Record<string, unknown> | undefined;
  if (data) {
    const e1 = data.envelopeId;
    if (typeof e1 === "string" && e1.length > 0) return e1;
    const summary = data.envelopeSummary as Record<string, unknown> | undefined;
    const e2 = summary?.envelopeId;
    if (typeof e2 === "string" && e2.length > 0) return e2;
  }
  return null;
}

export function isCompletedEnvelopeEvent(
  payload: Record<string, unknown>,
): boolean {
  const event = typeof payload.event === "string" ? payload.event.toLowerCase() : "";
  if (event === "envelope-completed" || event.endsWith("/envelope-completed")) return true;
  const data = payload.data as Record<string, unknown> | undefined;
  const summary = data?.envelopeSummary as Record<string, unknown> | undefined;
  const s2 = typeof summary?.status === "string" ? summary.status.toLowerCase() : "";
  if (s2 === "completed") return true;
  const status = typeof payload.status === "string" ? payload.status.toLowerCase() : "";
  return status === "completed";
}

export function extractFirstSigner(
  payload: Record<string, unknown>,
): { email?: string; name?: string; signedDateTime?: string } {
  const walkSigners = (node: unknown): { email?: string; name?: string; signedDateTime?: string } => {
    if (!node || typeof node !== "object") return {};
    const rec = node as Record<string, unknown>;
    if (rec.signers && Array.isArray(rec.signers)) {
      for (const s of rec.signers) {
        if (s && typeof s === "object") {
          const sg = s as Record<string, unknown>;
          if (sg.status === "completed" || sg.signedDateTime) {
            return {
              email: typeof sg.email === "string" ? sg.email : undefined,
              name: typeof sg.name === "string" ? sg.name : undefined,
              signedDateTime: typeof sg.signedDateTime === "string"
                ? sg.signedDateTime
                : undefined,
            };
          }
        }
      }
      const first = rec.signers[0] as Record<string, unknown> | undefined;
      if (first) {
        return {
          email: typeof first.email === "string" ? first.email : undefined,
          name: typeof first.name === "string" ? first.name : undefined,
          signedDateTime: typeof first.signedDateTime === "string"
            ? first.signedDateTime
            : undefined,
        };
      }
    }
    for (const v of Object.values(rec)) {
      const found = walkSigners(v);
      if (found.email || found.name) return found;
    }
    return {};
  };
  return walkSigners(payload);
}

export async function downloadCombinedPdf(
  accessToken: string,
  basePath: string,
  accountId: string,
  envelopeId: string,
): Promise<Uint8Array> {
  const url =
    `${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/pdf",
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DocuSign download failed ${res.status}: ${t}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function uploadPdfToGhlContact(
  pitToken: string,
  contactId: string,
  pdfBytes: Uint8Array,
  fileName: string,
): Promise<{ url?: string; raw: unknown }> {
  const form = new FormData();
  form.append("contactId", contactId);
  form.append(
    "fileAttachment",
    new Blob([pdfBytes], { type: "application/pdf" }),
    fileName,
  );

  const res = await fetch(`${GHL_API_BASE}/conversations/messages/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pitToken}`,
      Accept: "application/json",
      Version: "2021-07-28",
    },
    body: form,
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `GHL upload failed ${res.status}: ${JSON.stringify(raw)}`,
    );
  }
  const r = raw as Record<string, unknown>;
  let url: string | undefined;
  if (typeof r.url === "string") url = r.url;
  else if (typeof r.fileUrl === "string") url = r.fileUrl;
  else if (Array.isArray(r.uploadedFiles) && r.uploadedFiles[0] &&
    typeof r.uploadedFiles[0] === "object") {
    const u = (r.uploadedFiles[0] as Record<string, unknown>).url;
    if (typeof u === "string") url = u;
  }
  return { url, raw };
}

export type SignerCompletionExtract = {
  selectedTabId: string | null;
  customerNotes: string | null;
};

function tabSelected(v: unknown): boolean {
  return v === true || v === "true" || v === "True";
}

/** Read signer radio + text tab values after envelope is completed (Recipients API). */
export async function fetchEnvelopeSignerCompletionData(
  accessToken: string,
  basePath: string,
  accountId: string,
  envelopeId: string,
): Promise<SignerCompletionExtract> {
  const url =
    `${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/recipients?include_tabs=true`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    console.error("DocuSign recipients include_tabs failed:", res.status, await res.text());
    return { selectedTabId: null, customerNotes: null };
  }
  const data = (await res.json()) as Record<string, unknown>;
  const signers = data.signers as unknown[] | undefined;
  const signer = signers?.[0] as Record<string, unknown> | undefined;
  const tabs = signer?.tabs as Record<string, unknown> | undefined;
  if (!tabs) return { selectedTabId: null, customerNotes: null };

  let selectedTabId: string | null = null;
  const radioGroups = tabs.radioGroupTabs as unknown[] | undefined;
  if (Array.isArray(radioGroups)) {
    for (const g of radioGroups) {
      if (!g || typeof g !== "object") continue;
      const radios = (g as Record<string, unknown>).radios as unknown[] | undefined;
      if (!Array.isArray(radios)) continue;
      for (const r of radios) {
        if (!r || typeof r !== "object") continue;
        const rec = r as Record<string, unknown>;
        if (tabSelected(rec.selected)) {
          const val = rec.value;
          if (val != null && String(val).length > 0) selectedTabId = String(val);
          break;
        }
      }
      if (selectedTabId) break;
    }
  }

  let customerNotes: string | null = null;
  const textTabs = tabs.textTabs as unknown[] | undefined;
  if (Array.isArray(textTabs)) {
    for (const tt of textTabs) {
      if (!tt || typeof tt !== "object") continue;
      const rec = tt as Record<string, unknown>;
      const label = String(rec.tabLabel ?? rec.name ?? "");
      if (label === "CustomerNotes") {
        const v = rec.value ?? rec.tabValue;
        if (typeof v === "string") customerNotes = v.trim() || null;
        break;
      }
    }
  }

  return { selectedTabId, customerNotes };
}

export async function fetchEnvelopeCustomFields(
  accessToken: string,
  basePath: string,
  accountId: string,
  envelopeId: string,
): Promise<Record<string, string>> {
  const url =
    `${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/custom_fields`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    console.error(
      "DocuSign custom_fields fetch failed:",
      res.status,
      await res.text(),
    );
    return {};
  }
  const data = (await res.json()) as Record<string, unknown>;
  const out: Record<string, string> = {};
  const textFields = data.textCustomFields as unknown[] | undefined;
  if (Array.isArray(textFields)) {
    for (const f of textFields) {
      if (!f || typeof f !== "object") continue;
      const ff = f as Record<string, unknown>;
      if (typeof ff.name === "string" && ff.value != null) {
        out[ff.name] = String(ff.value);
      }
    }
  }
  return out;
}

export function buildSignerCompletionPayload(
  formData: unknown,
  ext: SignerCompletionExtract,
  customFields?: Record<string, string>,
): Record<string, unknown> {
  const selectedQuoteTabId: string | null =
    ext.selectedTabId && String(ext.selectedTabId).length > 0
      ? String(ext.selectedTabId)
      : null;

  const customerNotes = ext.customerNotes ?? "";

  let selectedQuoteTabTitle: string | null = null;

  if (selectedQuoteTabId && customFields) {
    const exactKey = `tab_title_${selectedQuoteTabId}`;
    if (customFields[exactKey]) {
      selectedQuoteTabTitle = customFields[exactKey];
    }

    if (!selectedQuoteTabTitle) {
      const allTitleFields = Object.entries(customFields).filter(([k]) =>
        k.startsWith("tab_title_")
      );
    }
  }

  if (!selectedQuoteTabTitle && selectedQuoteTabId) {
    const fd = formData as Record<string, unknown> | null | undefined;
    if (fd) {
      const six = fd["6"] ?? fd[6];
      if (six && typeof six === "object") {
        const tabs = (six as Record<string, unknown>).tabs as Record<string, unknown> | undefined;
        if (tabs) {
          const tab = tabs[selectedQuoteTabId] as Record<string, unknown> | undefined;
          if (tab?.title && typeof tab.title === "string") {
            selectedQuoteTabTitle = tab.title;
          }
        }
      }
    }
  }

  return {
    selectedQuoteTabId,
    selectedQuoteTabTitle,
    customerNotes,
    capturedAt: new Date().toISOString(),
  };
}

export type SignerCompletionData = {
  selectedQuoteTabId: string | null;
  selectedQuoteTabTitle: string | null;
  customerNotes: string;
  capturedAt: string;
};

export function buildSignerCompletionPayloadLegacy(
  formData: unknown,
  ext: SignerCompletionExtract,
): Record<string, unknown> {
  const rawId = ext.selectedTabId;
  let selectedQuoteTabId: number | string | null = null;
  if (rawId != null && String(rawId).length > 0) {
    const n = Number.parseInt(String(rawId), 10);
    selectedQuoteTabId = Number.isFinite(n) ? n : String(rawId);
  }
  return { selectedQuoteTabId, customerNotes: ext.customerNotes ?? "", capturedAt: new Date().toISOString() };
}