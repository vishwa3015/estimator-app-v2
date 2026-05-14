import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { calculateTabTotals, QuoteSectionUpdate } from "@/utils/quoteCalculations";
import { SectionConfig } from "@/components/estimates/section-configs";
import { FormValues } from "@/types/estimate-items";

const QUOTE_SECTION_ID = 6;
const AUTH_SECTION_ID = 7;

const A4_W = 595.28;
const A4_H = 841.89;
const MARGIN = 48;
const BLACK = rgb(0.15, 0.15, 0.15);
const GRAY = rgb(0.28, 0.28, 0.28);
const GRAY_MED = rgb(0.45, 0.45, 0.45);
const GRAY_LIGHT = rgb(0.55, 0.55, 0.55);
const GRAY_BG = rgb(0.94, 0.94, 0.94);
const BLUE = rgb(16 / 255, 99 / 255, 160 / 255);
const BORDER = rgb(0.75, 0.75, 0.75);
// Invisible color — white on white, so anchor text is hidden but still matchable by DocuSign
const INVISIBLE = rgb(1, 1, 1);

export const DOCUSIGN_ANCHOR_SIG = "/DS_SIG/";
export const DOCUSIGN_ANCHOR_DATE = "/DS_DATE/";
/** DocuSign radio anchors — one per quote tab (max one selected when signing) */
export const docusignOfferRadioAnchor = (indexZeroBased: number) =>
  `/DS_ROPT_${indexZeroBased + 1}/`;
/** DocuSign multiline text tab for customer notes while signing */
export const DOCUSIGN_CUSTOMER_NOTES_ANCHOR = "/DS_CUST_NOTES/";

export type AuthorizationSigningTabOption = {
  tabId: number;
  tabUuid: string;
  title: string;
  total: number;
};

/** Build payload for docusign-create-envelope (radio + text tab configuration) */
export function getAuthorizationSigningTabOptionsForEnvelope(
  formValues: FormValues,
  sectionUpdates: SectionConfig[],
): AuthorizationSigningTabOption[] {
  const totals = calculateTabTotals(sectionUpdates as unknown as QuoteSectionUpdate[], formValues);

  return totals.map((t) => ({
    tabId: t.tabId,
    tabUuid: t.tabUuid,
    title: t.title || `Option ${t.tabId}`,
    total: Number(t.total) || 0,
  }));
}

function stripHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  try {
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
  } catch {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}

function wrapLines(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function resolveContactDisplayName(formValues: FormValues): string {
  const v = formValues?.[1] || {};
  const joined = [v.first_name, v.last_name].filter(Boolean).join(" ").trim();
  if (joined) return joined;
  if (v.customer_name) return String(v.customer_name).trim();
  const auth = document.getElementById("pdfPreview-auth");
  if (auth) {
    const row = auth.querySelector(".flex.justify-between.items-end");
    const p = row?.querySelector("p.font-semibold");
    const t = p?.textContent?.trim();
    if (t) return t;
  }
  return "";
}

function buildFooterLines(formValues: FormValues): string[] {
  const v = formValues?.[1] || {};
  const lines: string[] = [];
  const person = [v.first_name, v.last_name].filter(Boolean).join(" ").trim();
  if (person) lines.push(person);
  if (v.company_name) lines.push(String(v.company_name));
  const addr = [v.address, v.city, v.state, v.zip_code].filter(Boolean).join(", ").trim();
  if (addr) lines.push(addr);
  if (v.phone) lines.push(String(v.phone));
  if (lines.length > 0) return lines;
  const auth = document.getElementById("pdfPreview-auth");
  if (!auth) return [];
  const foot = Array.from(auth.querySelectorAll("div")).find(
    (d) => d.classList.contains("border-t") && d.classList.contains("pt-6"),
  );
  if (!foot) return [];
  return Array.from(foot.querySelectorAll("p"))
    .map((p) => p.textContent?.trim() || "")
    .filter(Boolean);
}

type DrawState = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  fontBold: PDFFont;
  y: number;
  readonly xMin: number;
  readonly xMax: number;
};

function ensureSpace(s: DrawState, needFromBottom: number): void {
  if (s.y < MARGIN + needFromBottom) {
    s.page = s.doc.addPage([A4_W, A4_H]);
    s.y = A4_H - MARGIN;
  }
}

function drawTextLines(
  s: DrawState,
  lines: string[],
  size: number,
  opts?: { bold?: boolean; color?: ReturnType<typeof rgb> },
): void {
  const font = opts?.bold ? s.fontBold : s.font;
  const color = opts?.color ?? BLACK;
  const lh = size * 1.25;
  for (const line of lines) {
    ensureSpace(s, lh + 8);
    s.page.drawText(line, { x: s.xMin, y: s.y, size, font, color });
    s.y -= lh;
  }
}

/**
 * Authorization / Summary page (CustomTemplate section 7) as vector PDF for DocuSign anchor text.
 */
export async function buildAuthorizationSectionPdfBytes(input: {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
}): Promise<Uint8Array> {
  const { formValues, sectionUpdates } = input;
  const tabTotals = calculateTabTotals(sectionUpdates as unknown as QuoteSectionUpdate[], formValues);
  const authValues = formValues?.[AUTH_SECTION_ID] || {};
  const quoteTabs = formValues?.[QUOTE_SECTION_ID]?.tabs || {};

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([A4_W, A4_H]);
  const s: DrawState = {
    doc,
    page,
    font,
    fontBold,
    y: A4_H - MARGIN,
    xMin: MARGIN,
    xMax: A4_W - MARGIN,
  };

  const contentW = s.xMax - s.xMin;

  // Progress bar
  ensureSpace(s, 24);
  const barTop = s.y;
  s.page.drawLine({
    start: { x: s.xMin, y: barTop },
    end: { x: s.xMax, y: barTop },
    thickness: 0.5,
    color: rgb(0.88, 0.88, 0.88),
  });
  s.page.drawRectangle({
    x: s.xMin,
    y: barTop - 7,
    width: contentW * 0.35,
    height: 7,
    color: BLUE,
  });
  s.y = barTop - 20;

  ensureSpace(s, 40);
  s.page.drawText("Summary", { x: s.xMin, y: s.y, size: 18, font: fontBold, color: BLACK });
  s.y -= 26;
  const sub =
    "Please select exactly one option below, add any notes, then sign.";
  drawTextLines(s, wrapLines(sub, contentW, font, 10), 10, { color: GRAY_LIGHT });
  s.y -= 8;


  const ANCHOR_FONT_SIZE = 6;
  const ANCHOR_X = s.xMin;
  const labelStartX = s.xMin + 28;

  // Tab totals with radio (vector + DocuSign anchor per row)
  for (let i = 0; i < tabTotals.length; i++) {
    const twt = tabTotals[i];
    const tabData = quoteTabs?.[twt.tabUuid] ?? quoteTabs?.[String(twt.tabId)];
    const rawDesc = tabData?.description || "";
    const description = stripHtml(rawDesc);
    const descMaxW = Math.max(120, s.xMax - labelStartX - 80);
    const descLines = description ? wrapLines(description, descMaxW, font, 9) : [];
    const rowMinH = 22 + (descLines.length ? descLines.length * 11 + 6 : 0);
    ensureSpace(s, rowMinH + 8);

    const rowTopY = s.y;

    const anchorStr = docusignOfferRadioAnchor(i);
    s.page.drawText(anchorStr, {
      x: ANCHOR_X,
      y: rowTopY - 3,
      size: ANCHOR_FONT_SIZE,
      font,
      color: INVISIBLE, 
    });

    const amt = `$${Number(twt.total || 0).toFixed(2)}`;
    const amtW = fontBold.widthOfTextAtSize(amt, 11);
    s.page.drawText(twt.title || "", {
      x: labelStartX,
      y: rowTopY,
      size: 11,
      font: fontBold,
      color: BLACK,
    });
    s.page.drawText(amt, {
      x: s.xMax - amtW,
      y: rowTopY,
      size: 11,
      font: fontBold,
      color: BLACK,
    });
    s.y = rowTopY - 14;
    if (descLines.length > 0) {
      for (const ln of descLines) {
        ensureSpace(s, 12);
        s.page.drawText(ln, { x: labelStartX, y: s.y, size: 9, font, color: GRAY_MED });
        s.y -= 11;
      }
    }
    s.y -= 10;
  }

  // Disclaimer
if (authValues.disclaimer) {
  const disc = String(authValues.disclaimer).trim();
    const lines = wrapLines(disc, contentW - 16, fontBold, 10);
    const lineHeight = 12;
    const pad = 10;
    const blockH = lines.length * lineHeight + pad * 2;
    ensureSpace(s, blockH + 16);
    const topY = s.y;
    const boxBottom = topY - blockH;
    s.page.drawRectangle({
      x: s.xMin,
      y: boxBottom,
      width: contentW,
      height: blockH,
      color: GRAY_BG,
    });
    let ty = topY - pad - 2;
    for (const ln of lines) {
      s.page.drawText(ln, { x: s.xMin + 8, y: ty, size: 10, font: fontBold, color: GRAY });
      ty -= lineHeight;
    }
    s.y = boxBottom - 12;
  }

  // Customer notes — DocuSign multiline text field anchored inside box
  ensureSpace(s, 120);
  s.page.drawText("Customer notes", {
    x: s.xMin,
    y: s.y,
    size: 9,
    font: fontBold,
    color: GRAY_MED,
  });
  s.y -= 12;
  s.page.drawText("Type additional information while signing (DocuSign):", {
    x: s.xMin,
    y: s.y,
    size: 8,
    font,
    color: GRAY_LIGHT,
  });
  s.y -= 16;
  const notesH = 96;
  const notesBoxBottom = s.y - notesH;
  s.page.drawRectangle({
    x: s.xMin,
    y: notesBoxBottom,
    width: contentW,
    height: notesH,
    borderColor: BORDER,
    borderWidth: 0.75,
    color: rgb(1, 1, 1),
  });
  s.page.drawText(DOCUSIGN_CUSTOMER_NOTES_ANCHOR, {
    x: s.xMin + 6,
    y: notesBoxBottom + notesH - 14,
    size: 6,
    font,
    color: INVISIBLE, 
  });
  s.y = notesBoxBottom - 18;

  // Signature row (vector text including DocuSign anchors)
  ensureSpace(s, 72);
  const contactName = resolveContactDisplayName(formValues);
  const colGap = 24;
  const leftW = (contentW - colGap) / 2;
  const rightX = s.xMin + leftW + colGap;
  const lineY = s.y - 28;

  if (contactName) {
    s.page.drawText(contactName, {
      x: s.xMin,
      y: s.y,
      size: 10,
      font: fontBold,
      color: BLACK,
    });
  }
  s.y -= 16;

  s.page.drawLine({
    start: { x: s.xMin, y: lineY },
    end: { x: s.xMin + leftW, y: lineY },
    thickness: 0.6,
    color: BORDER,
  });
  s.page.drawLine({
    start: { x: rightX, y: lineY },
    end: { x: s.xMax, y: lineY },
    thickness: 0.6,
    color: BORDER,
  });

  const anchorSize = 7;
  const sigW = font.widthOfTextAtSize(DOCUSIGN_ANCHOR_SIG, anchorSize);
  const dateW = font.widthOfTextAtSize(DOCUSIGN_ANCHOR_DATE, anchorSize);
  s.page.drawText(DOCUSIGN_ANCHOR_SIG, {
    x: s.xMin + (leftW - sigW) / 2,
    y: lineY + 10,
    size: anchorSize,
    font,
    color: INVISIBLE,
  });
  s.page.drawText(DOCUSIGN_ANCHOR_DATE, {
    x: rightX + (s.xMax - rightX - dateW) / 2,
    y: lineY + 10,
    size: anchorSize,
    font,
    color: INVISIBLE,
  });

  s.page.drawText("Signature", {
    x: s.xMin,
    y: lineY - 14,
    size: 9,
    font,
    color: GRAY_LIGHT,
  });
  s.page.drawText("Date", {
    x: rightX,
    y: lineY - 14,
    size: 9,
    font,
    color: GRAY_LIGHT,
  });
  s.y = lineY - 36;

  if (authValues.footer_notes) {
    const fn = String(authValues.footer_notes).trim();
    const fnLines = wrapLines(fn, contentW, font, 9);
    drawTextLines(s, fnLines, 9, { color: GRAY });
    s.y -= 4;
  }

  // Footer
  const footerLines = buildFooterLines(formValues);
  if (footerLines.length > 0) {
    ensureSpace(s, footerLines.length * 11 + 24);
    s.y -= 8;
    const ftTop = s.y + 6;
    s.page.drawLine({
      start: { x: s.xMin, y: ftTop },
      end: { x: s.xMax, y: ftTop },
      thickness: 0.5,
      color: BORDER,
    });
    s.y = ftTop - 14;
    for (const ln of footerLines) {
      ensureSpace(s, 12);
      s.page.drawText(ln, { x: s.xMin, y: s.y, size: 8, font: fontBold, color: BLACK });
      s.y -= 11;
    }
  }

  return doc.save();
}

function wrapText(
  text: string,
  maxWidth: number,
  font: PDFFont,
  fontSize: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);

  return lines;
}


export async function buildHiredGunAuthorizationPdfBytes(input: {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
}): Promise<Uint8Array> {
  const { formValues, sectionUpdates } = input;
  const tabTotals = calculateTabTotals(sectionUpdates as unknown as QuoteSectionUpdate[], formValues);
  const authValues = formValues?.[AUTH_SECTION_ID] || {};

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([A4_W, A4_H]);
  const s: DrawState = {
    doc,
    page,
    font,
    fontBold,
    y: A4_H - MARGIN,
    xMin: MARGIN,
    xMax: A4_W - MARGIN,
  };

  const contentW = s.xMax - s.xMin;

  // ── Header ────────────────────────────────────────────────────────────────
  ensureSpace(s, 40);
  s.page.drawText("AUTHORIZATION PAGE", {
    x: s.xMin,
    y: s.y,
    size: 22,
    font: fontBold,
    color: rgb(198 / 255, 40 / 255, 40 / 255),
  });
  s.y -= 36;
  for (let i = 0; i < tabTotals.length; i++) {
    const twt = tabTotals[i];
    const tabData =
      formValues?.[QUOTE_SECTION_ID]?.tabs?.[twt.tabId] ??
      formValues?.[QUOTE_SECTION_ID]?.tabs?.[twt.tabUuid];
    const description = stripHtml(tabData?.description || "");
    const descLines = description
      ? wrapLines(description, contentW - 30, font, 9)
      : [];
    const rowH =
      20 + (descLines.length > 0 ? descLines.length * 12 + 4 : 0) + 8;

    ensureSpace(s, rowH + 8);

    const rowTopY = s.y;

    // Title (left-aligned)
    s.page.drawText(twt.title || `Option ${i + 1}`, {
      x: s.xMin,
      y: rowTopY,
      size: 11,
      font: fontBold,
      color: BLACK,
    });

    const price = `$${Number(twt.total || 0).toFixed(2)}`;
    const priceW = fontBold.widthOfTextAtSize(price, 11);
    const priceX = s.xMax - priceW - 26;
    s.page.drawText(price, {
      x: priceX,
      y: rowTopY,
      size: 11,
      font: fontBold,
      color: BLACK,
    });

    s.page.drawText(docusignOfferRadioAnchor(i), {
      x: s.xMax - 18,   // far-right edge
      y: rowTopY,
      size: 6,
      font,
      color: INVISIBLE,
    });

    s.y = rowTopY - 16;

    for (const ln of descLines) {
      ensureSpace(s, 14);
      s.page.drawText(ln, {
        x: s.xMin + 8,
        y: s.y,
        size: 9,
        font,
        color: GRAY,
      });
      s.y -= 12;
    }

    s.y -= 8; 
  }

  const disclaimerText =
    (authValues.disclaimer as string) ||
    "Estimates valid for 15 days from date of estimate / A 30% deposit is required one week before day of project. Remaining Balance is due in full within 3 days of completion.";

  const discLines = wrapLines(disclaimerText, contentW - 20, font, 9);
  const discPad    = 6;   // tight vertical padding
  const discLineH  = 12;  // tight line height
  const discH = discLines.length * discLineH + discPad * 2;

  ensureSpace(s, discH + 16);
  s.y -= 12;

  const discBoxBottom = s.y - discH;
  s.page.drawRectangle({
    x: s.xMin,
    y: discBoxBottom,
    width: contentW,
    height: discH,
    color: GRAY_BG,
  });

  let discY = s.y - discPad - 2;
  for (const ln of discLines) {
    s.page.drawText(ln, {
      x: s.xMin + 10,
      y: discY,
      size: 9,
      font,
      color: GRAY,
    });
    discY -= discLineH;
  }
  s.y = discBoxBottom - 16;

  ensureSpace(s, 200);

  s.page.drawText("Customer Comments / Notes", {
    x: s.xMin,
    y: s.y,
    size: 13,
    font: fontBold,
    color: BLACK,
  });
  s.y -= 18;

  const notesBoxH      = 140;
  const notesBoxBottom = s.y - notesBoxH;

  s.page.drawRectangle({
    x: s.xMin,
    y: notesBoxBottom,
    width: contentW,
    height: notesBoxH,
    borderColor: BORDER,
    borderWidth: 1.5,
    color: rgb(1, 1, 1),
  });

  s.page.drawText(DOCUSIGN_CUSTOMER_NOTES_ANCHOR, {
    x: s.xMin + 8,
    y: notesBoxBottom + notesBoxH - 14,
    size: 7,
    font,
    color: INVISIBLE,
  });

  s.y = notesBoxBottom - 56; 

  ensureSpace(s, 60);

  const sigLineY   = s.y;
  const sigLineLen = 240;

  // Signature underline (left)
  s.page.drawLine({
    start: { x: s.xMin, y: sigLineY },
    end:   { x: s.xMin + sigLineLen, y: sigLineY },
    thickness: 1.2,
    color: BORDER,
  });

  // Date underline (right)
  s.page.drawLine({
    start: { x: s.xMax - sigLineLen, y: sigLineY },
    end:   { x: s.xMax, y: sigLineY },
    thickness: 1.2,
    color: BORDER,
  });

  s.page.drawText(DOCUSIGN_ANCHOR_SIG, {
    x: s.xMin + sigLineLen / 2 - font.widthOfTextAtSize(DOCUSIGN_ANCHOR_SIG, 8) / 2,
    y: sigLineY + 12,
    size: 8,
    font,
    color: INVISIBLE,
  });

  s.page.drawText(DOCUSIGN_ANCHOR_DATE, {
    x: s.xMax - sigLineLen / 2 - font.widthOfTextAtSize(DOCUSIGN_ANCHOR_DATE, 8) / 2,
    y: sigLineY + 12,
    size: 8,
    font,
    color: INVISIBLE,
  });

  s.page.drawText("Signature", {
    x: s.xMin,
    y: sigLineY - 16,
    size: 9,
    font,
    color: GRAY_MED,
  });

  s.page.drawText("Date", {
    x: s.xMax - sigLineLen,
    y: sigLineY - 16,
    size: 9,
    font,
    color: GRAY_MED,
  });

  s.y = sigLineY - 40;

  const footerLines = buildFooterLines(formValues);
  if (footerLines.length > 0) {
    ensureSpace(s, footerLines.length * 12 + 20);
    s.y -= 8;
    const ftTop = s.y + 6;
    s.page.drawLine({
      start: { x: s.xMin, y: ftTop },
      end:   { x: s.xMax, y: ftTop },
      thickness: 0.5,
      color: BORDER,
    });
    s.y = ftTop - 14;
    for (const ln of footerLines) {
      ensureSpace(s, 14);
      s.page.drawText(ln, {
        x: s.xMin,
        y: s.y,
        size: 8,
        font: fontBold,
        color: BLACK,
      });
      s.y -= 12;
    }
  }

  return doc.save();
}