import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/currency";
import { PDFDocument } from "pdf-lib";
import { fileUploadService } from "@/services/estimates/file-upload-service";
import { buildStandardAuthorizationPdfBytes } from "./Standardauthorizationpdflib";
import { buildAuthorizationSectionPdfBytes, buildHiredGunAuthorizationPdfBytes } from "@/utils/pdf/generators/authorizationPagePdfLib";
import { HIRED_GUNS_LOCATIONID } from "@/components/pdf/QuoteTemplate";
import { locationService } from "@/services/estimates/location-service";
import { FormValues, SectionConfig } from "@/types/estimate-items";

export interface EstimateDataV2 {
  formValues: FormValues;
  sectionUpdates: SectionConfig[];
  opportunityId: string;
  contactId?: string;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const CUSTOM_LOCATION_ID = "wU1scGTN2FmZvVfEKqBe";

// const locationId = await locationService.getLocationContext();

export const generatePDFCustom = async (
  element,
  filename,
  download = false,
  formValues,
  sections,
  returnBlob = false,
) => {
  if (!window.html2pdf) {
    alert('html2pdf library not loaded.');
    return;
  }

  const opt = {
    margin: 8,
    filename: filename,
    image: { type: 'jpeg', quality: 0.78 },
    html2canvas: {
      scale: 1,
      useCORS: true,
      letterRendering: true
    },
    pageBreak: { before: ['#first-page', '#second-page', '.page-break'] },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  // ── Helper: check if element has renderable content ──
  const hasRenderableContent = (el: HTMLElement): boolean => {
    if (!el) return false;
    // Check text content
    const text = el.innerText?.trim() || '';
    if (text.length > 5) return true;
    // Check images
    const images = el.querySelectorAll('img');
    if (images.length > 0) return true;
    // Check canvas
    const canvases = el.querySelectorAll('canvas');
    if (canvases.length > 0) return true;
    // Check actual rendered height
    const rect = el.getBoundingClientRect();
    if (rect.height > 50) return true;
    // Check children with content
    const allChildren = el.querySelectorAll('*');
    for (let i = 0; i < allChildren.length; i++) {
      const child = allChildren[i] as HTMLElement;
      const childText = child.innerText?.trim() || '';
      if (childText.length > 3) return true;
    }
    return false;
  };

  const finalPdf = await PDFDocument.create();

  const isCustomTemplate = !!document.getElementById('pdfPreview-auth') ||
    !!document.querySelector('[id^="pdfPreview-tab-"]');

  if (isCustomTemplate) {
    const previewEl = document.getElementById('pdfPreview');
    if (!previewEl) {
      console.error('generatePDFCustom: #pdfPreview element not found');
      return;
    }

    const enabledSections = sections
      ?.filter((sec) => sec.enabled)
      ?.sort((a, b) => a.sortOrder - b.sortOrder)

    for (const section of enabledSections) {
      if (section.id === 'lead-details-entry') continue;

      const values = formValues?.[section.id];

      if (section.type === 'custom') {
        if (!values) continue;

        if (values.content_type === 'single_use_pdf' && values.file_storage_path) {
          try {
            const pdfUrl = fileUploadService.getFileUrl(values.file_storage_path);
            const response = await fetch(pdfUrl);
            if (!response.ok) {
              console.error(`Failed to fetch PDF for section ${section.id}`);
              continue;
            }
            const pdfBytes = await response.arrayBuffer();
            const extPdf = await PDFDocument.load(pdfBytes);
            const extPages = await finalPdf.copyPages(extPdf, extPdf.getPageIndices());
            extPages.forEach(p => finalPdf.addPage(p));
            await sleep(100);
          } catch (error) {
            console.error(`Error embedding PDF for section ${section.id}:`, error);
            continue;
          }

        } else if (values.textHtml) {
          try {
            const el = document.getElementById(`pdfPreview-${section.id}`);
            if (!el || !hasRenderableContent(el)) continue;

            const htmlPdfBlob = await window.html2pdf()
              .set(opt)
              .from(el)
              .outputPdf("blob") as Blob;

            const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
            const copiedPages = await finalPdf.copyPages(htmlPdf, htmlPdf.getPages().map((_, i) => i));
            copiedPages.forEach(page => finalPdf.addPage(page));
            await sleep(100);
          } catch (error) {
            console.error(`Error generating text page for section ${section.id}:`, error);
            continue;
          }
        }

      } else {
        const sectionId = section.id;
        const isQuoteSection = sectionId === 6 || sectionId === '6';
        const isAuthSection = sectionId === 7 || sectionId === '7';

        if (isQuoteSection) {
          const tabElements = document.querySelectorAll('[id^="pdfPreview-tab-"]');
          if (tabElements.length === 0) continue;

          for (let i = 0; i < tabElements.length; i++) {
            const tabEl = tabElements[i] as HTMLElement;
            if (!tabEl || !hasRenderableContent(tabEl)) continue;

            try {
              const htmlPdfBlob = await window.html2pdf()
                .set(opt)
                .from(tabEl)
                .outputPdf("blob") as Blob;

              const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
              const copiedPages = await finalPdf.copyPages(htmlPdf, htmlPdf.getPages().map((_, i) => i));
              copiedPages.forEach(page => finalPdf.addPage(page));
              await sleep(100);
            } catch (error) {
              console.error(`Error generating tab PDF:`, error);
              continue;
            }
          }

        } else if (isAuthSection && document.getElementById("pdfPreview-auth")) {

          try {
            const locationId = await locationService.getLocationContext();
            const isHiredGun = locationId === HIRED_GUNS_LOCATIONID;
            const authBytes = isHiredGun
              ? await buildHiredGunAuthorizationPdfBytes({
                formValues,
                sectionUpdates: sections
              })
              : await buildAuthorizationSectionPdfBytes({
                formValues,
                sectionUpdates: sections
              });
            const authPdf = await PDFDocument.load(authBytes);
            const copied = await finalPdf.copyPages(
              authPdf,
              authPdf.getPageIndices(),
            );
            copied.forEach((p) => finalPdf.addPage(p));
            await sleep(100);
            continue;
          } catch (error) {
            console.error("Error building authorization PDF (pdf-lib), falling back to HTML:", error);
          }

          const sectionEl = document.getElementById('pdfPreview-auth');
          if (!sectionEl || !hasRenderableContent(sectionEl)) continue;

          try {
            const htmlPdfBlob = await window.html2pdf()
              .set(opt)
              .from(sectionEl)
              .outputPdf("blob") as Blob;

            const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
            const copiedPages = await finalPdf.copyPages(htmlPdf, htmlPdf.getPages().map((_, i) => i));
            copiedPages.forEach(page => finalPdf.addPage(page));
            await sleep(100);
          } catch (error) {
            console.error(`Error generating HTML fallback for auth section:`, error);
            continue;
          }

        } else {
          const elementId = `pdfPreview-${sectionId}`;
          const sectionEl = document.getElementById(elementId);

          // ← Use hasRenderableContent instead of innerText check
          if (!sectionEl || !hasRenderableContent(sectionEl)) continue;

          try {
            const htmlPdfBlob = await window.html2pdf()
              .set(opt)
              .from(sectionEl)
              .outputPdf("blob") as Blob;

            const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
            const copiedPages = await finalPdf.copyPages(htmlPdf, htmlPdf.getPages().map((_, i) => i));
            copiedPages.forEach(page => finalPdf.addPage(page));
            await sleep(100);
          } catch (error) {
            console.error(`Error generating PDF for section ${sectionId}:`, error);
            continue;
          }
        }
      }

      await sleep(100);
    }

  } else {
    for (const section of sections) {
      if (!section.enabled || section.id === 'lead-details-entry') continue;

      const sectionId = section.id;
      const isAuthSection = sectionId === 7 || sectionId === '7';
      const isQuoteSection = sectionId === 6 || sectionId === '6';

      if (section.type === 'custom') {
        const values = formValues[section.id];
        if (!values) continue;

        if (values.content_type === "single_use_pdf" && values.file_storage_path) {
          try {
            const response = await fetch(fileUploadService.getFileUrl(values.file_storage_path));
            if (!response.ok) continue;

            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) continue;

            const pdfBytes = await response.arrayBuffer();
            const extPdf = await PDFDocument.load(pdfBytes);
            const extPages = await finalPdf.copyPages(extPdf, extPdf.getPageIndices());
            await sleep(100);
            extPages.forEach(p => finalPdf.addPage(p));
          } catch (error) {
            console.error(`Error loading external PDF for section ${section.id}:`, error);
            continue;
          }
        } else if (values.textHtml) {
          try {
            const el = document.getElementById(`pdfPreview-${section.id}`);
            if (!el || !hasRenderableContent(el)) continue;

            const htmlPdfBlob = await window.html2pdf()
              .set(opt)
              .from(el)
              .outputPdf("blob") as Blob;

            const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
            const copiedPages = await finalPdf.copyPages(htmlPdf, htmlPdf.getPages().map((_, i) => i));
            await sleep(100);
            copiedPages.forEach(page => finalPdf.addPage(page));
          } catch (error) {
            console.error(`Error generating HTML PDF for section ${section.id}:`, error);
            continue;
          }
        }

      } else if (isAuthSection) {
        const authSection = sections.find((s) => s.id === 7 || s.id === '7');
        const sectionTitleText = authSection?.title || "Authorization";

        const sec1 = formValues?.[1] || {};
        const resolvedContactName = [sec1.first_name, sec1.last_name]
          .filter(Boolean).join(" ").trim() || "";

        const locationId = await locationService.getLocationContext();
        const isHiredGun = locationId === HIRED_GUNS_LOCATIONID;

        try {
          const authBytes = isHiredGun
            ? await buildHiredGunAuthorizationPdfBytes({ formValues, sectionUpdates: sections })
            : await buildStandardAuthorizationPdfBytes({
              formValues,
              sectionUpdates: sections,
              sectionTitle: sectionTitleText,
              contactName: resolvedContactName,
            });
          const authPdf = await PDFDocument.load(authBytes);
          const copied = await finalPdf.copyPages(authPdf, authPdf.getPageIndices());
          copied.forEach((p) => finalPdf.addPage(p));
          await sleep(100);
          continue;
        } catch (error) {
          console.error("Standard template: vector auth PDF failed, falling back to HTML:", error);
        }

        const authEl = document.getElementById(`pdfPreview-${sectionId}`);
        if (!authEl || !hasRenderableContent(authEl)) continue;

        try {
          const htmlPdfBlob = await window.html2pdf()
            .set(opt)
            .from(authEl)
            .outputPdf("blob") as Blob;
          const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
          const copiedPages = await finalPdf.copyPages(
            htmlPdf,
            htmlPdf.getPages().map((_, i) => i),
          );
          await sleep(100);
          copiedPages.forEach((page) => finalPdf.addPage(page));
        } catch (err) {
          console.error("Standard template: HTML fallback also failed for auth section:", err);
        }

      } else if (isQuoteSection) {
        const el = document.getElementById(`pdfPreview-${sectionId}`);
        if (!el || !hasRenderableContent(el)) continue;

        try {
          const htmlPdfBlob = await window.html2pdf()
            .set(opt)
            .from(el)
            .outputPdf("blob") as Blob;
          const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
          const copiedPages = await finalPdf.copyPages(htmlPdf, htmlPdf.getPages().map((_, i) => i));
          await sleep(100);
          copiedPages.forEach(page => finalPdf.addPage(page));
        } catch (error) {
          console.error(`Error generating quote section PDF:`, error);
          continue;
        }

      } else {
        const el = document.getElementById(`pdfPreview-${sectionId}`);
        if (!el || !hasRenderableContent(el)) continue;

        try {
          const htmlPdfBlob = await window.html2pdf()
            .set(opt)
            .from(el)
            .outputPdf("blob") as Blob;
          const htmlPdf = await PDFDocument.load(await htmlPdfBlob.arrayBuffer());
          const copiedPages = await finalPdf.copyPages(htmlPdf, htmlPdf.getPages().map((_, i) => i));
          await sleep(100);
          copiedPages.forEach(page => finalPdf.addPage(page));
        } catch (error) {
          console.error(`Error generating PDF for section ${sectionId}:`, error);
          continue;
        }
      }
      await sleep(100);
    }
  }

  // ── Save / Download ──
  if (download) {
    const finalBytes = await finalPdf.save();
    const blob = new Blob([new Uint8Array(finalBytes)], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  } else if (returnBlob) {
    const finalBytes = await finalPdf.save();
    return new Blob([new Uint8Array(finalBytes)], { type: "application/pdf" });
  } else {
    const finalBytes = await finalPdf.save();
    const blob = new Blob([new Uint8Array(finalBytes)], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.target = '_blank';
    link.click();
  }
};

export const generateEstimateV2PDF = async (estimateData: EstimateDataV2): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ESTIMATE", pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Estimate details
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Opportunity ID: ${estimateData.opportunityId}`, 15, yPos);
  doc.text(`Date: ${format(new Date(), 'MM/dd/yyyy')}`, pageWidth - 15, yPos, { align: "right" });
  yPos += 10;

  if (estimateData.contactId) {
    doc.text(`Contact ID: ${estimateData.contactId}`, 15, yPos);
    yPos += 10;
  }

  yPos += 10;

  // Form data section
  if (estimateData.formValues && Object.keys(estimateData.formValues).length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Form Data:", 15, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    Object.entries(estimateData.formValues).forEach(([key, value]) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = 20;
      }

      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const lines = doc.splitTextToSize(`${key}: ${displayValue}`, pageWidth - 30);
      doc.text(lines, 20, yPos);
      yPos += lines.length * 4;
    });

    yPos += 10;
  }

  // Sections
  if (estimateData.sectionUpdates && estimateData.sectionUpdates.length > 0) {
    const enabledSections = estimateData.sectionUpdates.filter(section => section.enabled !== false);

    for (const section of enabledSections) {
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }

      // Section header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(section.title || section.section_id || 'Section', 15, yPos);
      yPos += 10;

      // Section content
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      if (section.section_data || section.data) {
        const sectionData = section.section_data || section.data;
        Object.entries(sectionData).forEach(([key, value]) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }

          const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
          const lines = doc.splitTextToSize(`${key}: ${displayValue}`, pageWidth - 30);
          doc.text(lines, 20, yPos);
          yPos += lines.length * 4;
        });
      }

      yPos += 15;
    }
  }

  // Footer
  const footerYPos = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'MM/dd/yyyy HH:mm')}`, pageWidth / 2, footerYPos, { align: "center" });

  return doc.output('blob');
};

export const downloadEstimateV2PDF = async (estimateData: EstimateDataV2, filename?: string) => {
  const pdfBlob = await generateEstimateV2PDF(estimateData);
  const url = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `estimate-${estimateData.opportunityId}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};