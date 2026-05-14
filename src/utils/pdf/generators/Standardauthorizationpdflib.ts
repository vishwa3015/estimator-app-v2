
import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { calculateTabTotals } from "@/utils/quoteCalculations";

export const DOCUSIGN_ANCHOR_SIG            = "/DS_SIG/";
export const DOCUSIGN_ANCHOR_DATE           = "/DS_DATE/";
export const DOCUSIGN_CUSTOMER_NOTES_ANCHOR = "/DS_CUST_NOTES/";
export const docusignOfferRadioAnchor = (indexZeroBased: number) =>
  `/DS_ROPT_${indexZeroBased + 1}/`;

const A4_W   = 595.28;
const A4_H   = 841.89;
const MARGIN = 40;

const RED         = rgb(220 / 255,  53 / 255,  69 / 255);
const WHITE       = rgb(1, 1, 1);
const BLACK       = rgb(0.1,  0.1,  0.1);
const GRAY_DARK   = rgb(0.28, 0.28, 0.28);
const GRAY_MED    = rgb(0.50, 0.50, 0.50);
const GRAY_BG     = rgb(0.96, 0.96, 0.96);
const GRAY_BORDER = rgb(0.82, 0.82, 0.82);
const GRAY_SIGBG  = rgb(0.93, 0.93, 0.93);
const INVISIBLE   = rgb(1, 1, 1);

const LAYOUT = {
  bannerH:        30,
  selectH:        22,
  rowH:           28,
  notesHeaderH:   22,
  notesAreaH:     90,
  sigBoxH:        50,
  col2Ratio:      0.65,
  colGap:         24,
  lineHeight:     13,
  padding:        10,
} as const;

const FONT_SZ_BODY   = 9;
const FONT_SZ_ANCHOR = 6;
const FONT_SZ_LABEL  = 8;
const FONT_SZ_TITLE  = 14;
const FONT_SZ_CONTACT = 11;

export interface AuthFormValues {
  disclaimer?:   string;
  footer_notes?: string;
}

export interface TabTotal {
  title?: string;
  total?: number | string;
}

export interface SectionUpdate {
  id: string;
  [key: string]: unknown;
}

export interface BuildStandardAuthInput {
  formValues:     Record<string, unknown>;
  sectionUpdates: SectionUpdate[];
  sectionTitle?:  string;
  contactName?:   string;
}

type State = {
  doc:      PDFDocument;
  page:     PDFPage;
  font:     PDFFont;
  fontBold: PDFFont;
  y:        number;
  xMin:     number;
  xMax:     number;
};

function ensureSpace(s: State, need: number): void {
  if (s.y < MARGIN + need) {
    s.page = s.doc.addPage([A4_W, A4_H]);
    s.y    = A4_H - MARGIN;
  }
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function safeTotal(raw: number | string | undefined): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? "0"));
  return isNaN(n) ? 0 : n;
}

function drawBanner(s: State, sectionTitle: string | undefined): void {
  const W  = s.xMax - s.xMin;
  const xL = s.xMin;
  ensureSpace(s, LAYOUT.bannerH + 10);

  s.page.drawRectangle({ x: xL, y: s.y - LAYOUT.bannerH, width: W, height: LAYOUT.bannerH, color: RED });

  const title = (sectionTitle || "AUTHORIZATION PAGE").toUpperCase();
  const tW    = s.fontBold.widthOfTextAtSize(title, FONT_SZ_TITLE);
  s.page.drawText(title, {
    x:    xL + (W - tW) / 2,
    y:    s.y - LAYOUT.bannerH + (LAYOUT.bannerH - FONT_SZ_TITLE) / 2 + 1,
    size: FONT_SZ_TITLE,
    font: s.fontBold,
    color: WHITE,
  });

  s.y -= LAYOUT.bannerH + 14;
}

function drawSelectHeader(s: State): void {
  const W  = s.xMax - s.xMin;
  const xL = s.xMin;

  ensureSpace(s, LAYOUT.selectH + 4);

  s.page.drawRectangle({
    x: xL, y: s.y - LAYOUT.selectH, width: W, height: LAYOUT.selectH,
    color: GRAY_BG, borderColor: GRAY_BORDER, borderWidth: 0.5,
  });
  s.page.drawText("SELECT ONE OPTION BELOW:", {
    x: xL + 8, y: s.y - LAYOUT.selectH + 7,
    size: FONT_SZ_BODY, font: s.fontBold, color: BLACK,
  });

  s.y -= LAYOUT.selectH;
}

function drawOptionRows(s: State, tabTotals: TabTotal[]): void {
  const W      = s.xMax - s.xMin;
  const xL     = s.xMin;
  const xR     = s.xMax;
  const col2X  = xL + W * LAYOUT.col2Ratio;

  for (let i = 0; i < tabTotals.length; i++) {
    const twt = tabTotals[i];
    ensureSpace(s, LAYOUT.rowH + 2);

    const top   = s.y;
    const bot   = top - LAYOUT.rowH;
    const textY = bot + (LAYOUT.rowH - FONT_SZ_BODY) / 2 + 1;

    s.page.drawRectangle({
      x: xL, y: bot, width: W, height: LAYOUT.rowH,
      color: WHITE, borderColor: GRAY_BORDER, borderWidth: 0.5,
    });
    s.page.drawLine({
      start: { x: col2X, y: top }, end: { x: col2X, y: bot },
      thickness: 0.5, color: GRAY_BORDER,
    });

    const tabTitle = twt.title || `Option ${i + 1}`;
    const tabLines = wrapText(tabTitle, col2X - xL - 14, s.font, FONT_SZ_BODY);

    if (!tabLines.length) {
      s.y = bot;
      continue;
    }

    const blockH = tabLines.length * (FONT_SZ_BODY + 2);
    let ty       = bot + (LAYOUT.rowH + blockH) / 2 - FONT_SZ_BODY + 1;
    for (const ln of tabLines) {
      s.page.drawText(ln, { x: xL + 8, y: ty, size: FONT_SZ_BODY, font: s.font, color: BLACK });
      ty -= FONT_SZ_BODY + 2;
    }

    const amt      = `$${safeTotal(twt.total).toFixed(2)}`;
    s.page.drawText(amt, {
      x: col2X + 8, y: textY,
      size: FONT_SZ_BODY, font: s.fontBold, color: BLACK,
    });

    const anchorTxt = docusignOfferRadioAnchor(i);
    const anchorW   = s.font.widthOfTextAtSize(anchorTxt, FONT_SZ_ANCHOR);
    s.page.drawText(anchorTxt, {
      x: xR - anchorW - 4, y: textY,
      size: FONT_SZ_ANCHOR, font: s.font, color: INVISIBLE,
    });

    s.y = bot;
  }

  s.y -= 16;
}

function drawDisclaimer(s: State, disclaimer: string): void {
  const W   = s.xMax - s.xMin;
  const xL  = s.xMin;
  const LH  = LAYOUT.lineHeight;
  const PAD = LAYOUT.padding;

  const text  = disclaimer.trim();
  const lines = wrapText(text, W - 22, s.fontBold, FONT_SZ_BODY);
  const boxH  = lines.length * LH + PAD * 2;

  ensureSpace(s, boxH + 14);

  s.page.drawRectangle({
    x: xL, y: s.y - boxH, width: W, height: boxH,
    color: GRAY_BG, borderColor: GRAY_BORDER, borderWidth: 0.5,
  });

  let dy = s.y - PAD - 1;
  for (const ln of lines) {
    s.page.drawText(ln, { x: xL + 10, y: dy, size: FONT_SZ_BODY, font: s.fontBold, color: GRAY_DARK });
    dy -= LH;
  }

  s.y -= boxH + 18;
}

function drawNotesBox(s: State): void {
  const W          = s.xMax - s.xMin;
  const xL         = s.xMin;
  const xR         = s.xMax;
  const notesTotal = LAYOUT.notesHeaderH + LAYOUT.notesAreaH;

  ensureSpace(s, notesTotal + 30);

  const notesTop = s.y;

  s.page.drawRectangle({
    x: xL, y: notesTop - notesTotal, width: W, height: notesTotal,
    color: WHITE, borderColor: GRAY_BORDER, borderWidth: 0.75,
  });

  s.page.drawRectangle({
    x: xL + 0.75, y: notesTop - LAYOUT.notesHeaderH,
    width: W - 1.5, height: LAYOUT.notesHeaderH,
    color: GRAY_BG,
  });

  const nhTxt = "Customer Comments / Notes";
  const nhW   = s.fontBold.widthOfTextAtSize(nhTxt, FONT_SZ_BODY);
  s.page.drawText(nhTxt, {
    x: xL + (W - nhW) / 2,
    y: notesTop - LAYOUT.notesHeaderH + (LAYOUT.notesHeaderH - FONT_SZ_BODY) / 2,
    size: FONT_SZ_BODY, font: s.fontBold, color: BLACK,
  });

  const dividerY = notesTop - LAYOUT.notesHeaderH;
  s.page.drawLine({
    start: { x: xL, y: dividerY }, end: { x: xR, y: dividerY },
    thickness: 0.75, color: GRAY_BORDER,
  });

  s.page.drawText(DOCUSIGN_CUSTOMER_NOTES_ANCHOR, {
    x: xL + 6, y: dividerY - 20,
    size: FONT_SZ_ANCHOR, font: s.font, color: INVISIBLE,
  });

  s.y -= notesTotal + 30;
}

function drawSignatureBlock(s: State, contactName: string | undefined): void {
  const W        = s.xMax - s.xMin;
  const xL       = s.xMin;
  const xR       = s.xMax;
  const halfW    = (W - LAYOUT.colGap) / 2;
  const rightX   = xL + halfW + LAYOUT.colGap;

  ensureSpace(s, 90);

  if (contactName) {
    s.page.drawText(contactName, {
      x: xL, y: s.y,
      size: FONT_SZ_CONTACT, font: s.fontBold, color: BLACK,
    });
    s.y -= 18;
  }

  const sigBoxTop = s.y;
  const sigBoxBot = sigBoxTop - LAYOUT.sigBoxH;

  // Signature box
  s.page.drawRectangle({
    x: xL, y: sigBoxBot, width: halfW, height: LAYOUT.sigBoxH,
    color: GRAY_SIGBG, borderColor: GRAY_BORDER, borderWidth: 0.75,
  });

  const phTxt  = "Signature";
  const phTxtW = s.font.widthOfTextAtSize(phTxt, FONT_SZ_BODY);
  s.page.drawText(phTxt, {
    x: xL + (halfW - phTxtW) / 2,
    y: sigBoxBot + 10,
    size: FONT_SZ_BODY, font: s.font, color: GRAY_MED,
  });

  const sigAnchorW = s.font.widthOfTextAtSize(DOCUSIGN_ANCHOR_SIG, FONT_SZ_ANCHOR);
  s.page.drawText(DOCUSIGN_ANCHOR_SIG, {
    x:    xL + (halfW - sigAnchorW) / 2,
    y:    sigBoxBot + 6,
    size: FONT_SZ_ANCHOR, font: s.font, color: INVISIBLE,
  });

  s.y = sigBoxBot;


  const underlineY = s.y - 2;
  s.page.drawLine({
    start: { x: xL,          y: underlineY },
    end:   { x: xL + halfW,  y: underlineY },
    thickness: 1.2, color: GRAY_DARK,
  });

  const sigLblW = s.fontBold.widthOfTextAtSize("Signature", FONT_SZ_LABEL);
  s.page.drawText("Signature", {
    x: xL + (halfW - sigLblW) / 2, y: underlineY - 13,
    size: FONT_SZ_LABEL, font: s.fontBold, color: GRAY_DARK,
  });

  s.page.drawLine({
    start: { x: rightX, y: underlineY },
    end:   { x: xR,     y: underlineY },
    thickness: 1.2, color: GRAY_DARK,
  });

  const dateAnchorW = s.font.widthOfTextAtSize(DOCUSIGN_ANCHOR_DATE, FONT_SZ_ANCHOR);
  s.page.drawText(DOCUSIGN_ANCHOR_DATE, {
    x:    rightX + (halfW - dateAnchorW) / 2,
    y:    underlineY + 10,
    size: FONT_SZ_ANCHOR, font: s.font, color: INVISIBLE,
  });

  const dateLblW = s.fontBold.widthOfTextAtSize("Date", FONT_SZ_LABEL);
  s.page.drawText("Date", {
    x: rightX + (halfW - dateLblW) / 2, y: underlineY - 13,
    size: FONT_SZ_LABEL, font: s.fontBold, color: GRAY_DARK,
  });

  s.y -= 40;
}

function drawFooterNotes(s: State, footerNotes: string): void {
  const W   = s.xMax - s.xMin;
  const xL  = s.xMin;
  const LH  = 11;

  const text  = footerNotes.trim();
  const lines = wrapText(text, W, s.font, FONT_SZ_LABEL);

  ensureSpace(s, lines.length * LH + 8);

  for (const ln of lines) {
    s.page.drawText(ln, { x: xL, y: s.y, size: FONT_SZ_LABEL, font: s.font, color: GRAY_MED });
    s.y -= LH;
  }
}

export async function buildStandardAuthorizationPdfBytes(
  input: BuildStandardAuthInput,
): Promise<Uint8Array> {
  if (!input?.formValues) {
    throw new Error("buildStandardAuthorizationPdfBytes: formValues is required");
  }
  if (!Array.isArray(input?.sectionUpdates)) {
    throw new Error("buildStandardAuthorizationPdfBytes: sectionUpdates must be an array");
  }

  try {
    const { formValues, sectionUpdates, sectionTitle, contactName } = input;

    const authValues = (formValues[7] ?? {}) as AuthFormValues;
    const tabTotals  = calculateTabTotals(sectionUpdates, formValues) as TabTotal[];

    const doc      = await PDFDocument.create();
    const font     = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const s: State = {
      doc,
      page: doc.addPage([A4_W, A4_H]),
      font,
      fontBold,
      y:    A4_H - MARGIN,
      xMin: MARGIN,
      xMax: A4_W - MARGIN,
    };

    drawBanner(s, sectionTitle);
    drawSelectHeader(s);
    drawOptionRows(s, tabTotals);

    if (authValues.disclaimer) {
      drawDisclaimer(s, authValues.disclaimer);
    }

    drawNotesBox(s);
    drawSignatureBlock(s, contactName);

    if (authValues.footer_notes) {
      drawFooterNotes(s, authValues.footer_notes);
    }

    return await doc.save();
  } catch (err) {
    throw new Error(
      `Failed to build authorization PDF: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}