
import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PDFThumbnailProps {
  file: File;
  className?: string;
}

const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ file, className }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const createPDFPreview = async () => {
      try {
        // Check file size before loading (limit to 50MB for preview)
        if (file.size > 50 * 1024 * 1024) {
          console.warn('PDF file too large for preview, using basic display');
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
          return;
        }

        // Read the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Get the first page
        const pdfPage = await pdfDoc.getPages()[0];

        // You might want to add logic to render the page as an image in the future
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Error creating PDF preview:', error);
        // Fallback to basic display even on error
        try {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
        } catch (fallbackError) {
          console.error('Error creating fallback preview:', fallbackError);
        }
      }
    };

    if (file) {
      createPDFPreview();

      return () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }
  }, [file]);

  return (
    <div className={`flex items-center gap-2 p-2 bg-gray-50 rounded-md ${className}`}>
      {previewUrl ? (
        <iframe
          src={previewUrl}
          title="PDF Preview"
          className="w-24 h-32 object-cover rounded-md shadow-sm border"
          frameBorder="0"
        />
      ) : (
        <FileText className="h-5 w-5 text-red-500" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
    </div>
  );
};

export default PDFThumbnail;
