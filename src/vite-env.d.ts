/// <reference types="vite/client" />

// Declare html2pdf global library
interface Html2PdfOptions {
  margin?: number | number[];
  filename?: string;
  image?: { type: string; quality: number };
  html2canvas?: {
    scale?: number;
    useCORS?: boolean;
    letterRendering?: boolean;
  };
  pageBreak?: { before?: string[] };
  jsPDF?: {
    unit: string;
    format: string;
    orientation: string;
  };
}

interface Html2PdfInstance {
  from(element: HTMLElement | null): Html2PdfInstance;
  set(options: Html2PdfOptions): Html2PdfInstance;
  save(): Promise<void>;
  outputPdf(type: 'blob' | 'arraybuffer' | 'dataurlstring'): Promise<Blob | ArrayBuffer | string>;
}

interface Html2Pdf {
  (): Html2PdfInstance;
}

interface Window {
  html2pdf: Html2Pdf;
}
