import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fileUploadService, type ListedStorageFile } from "@/services/estimates/file-upload-service";
import { File, FolderOpen, Loader2, Upload, X } from "lucide-react";

export interface LinkedLibraryFilePayload {
  file_storage_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
}

interface FileLibraryContext {
  locationId: string;
  contactId?: string | null;
}

interface FileDropzoneProps {
  label?: string;
  accept?: string; // e.g. "image/*,.pdf"
  valueDataUrl?: string; // Can be data URL or file URL
  onChange: (file: File | null, dataUrl?: string) => void;
  className?: string;
  multiple?: boolean;
  /** When set, shows "File library" for prior editor/settings uploads only (not generated estimate PDFs). */
  fileLibrary?: FileLibraryContext | null;
  onLinkFromLibrary?: (payload: LinkedLibraryFilePayload) => void;
}

function formatBytes(n: number): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageListedFile(f: ListedStorageFile): boolean {
  const m = (f.mimeType || "").toLowerCase();
  if (m.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp|tiff?|heic|avif|ico)$/i.test(f.fileName);
}

function isPdfListedFile(f: ListedStorageFile): boolean {
  const m = (f.mimeType || "").toLowerCase();
  if (m === "application/pdf") return true;
  return f.fileName.toLowerCase().endsWith(".pdf");
}

function isLikelyImageHttpUrl(url: string): boolean {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  return /\.(png|jpe?g|svg|webp|gif|bmp|tiff?|heic|avif|ico)$/i.test(path);
}

function isLikelyPdfHttpUrl(url: string): boolean {
  const lower = url.toLowerCase();
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  return path.endsWith(".pdf") || lower.includes("application/pdf");
}

function withPdfViewerFragment(url: string): string {
  if (url.includes("#")) return url;
  return `${url}#page=1&toolbar=0&navpanes=0`;
}

export function LibraryFileThumb({ file }: { file: ListedStorageFile }) {
  const url = fileUploadService.getFileUrl(file.storagePath);
  const [imgError, setImgError] = useState(false);

  if (isImageListedFile(file) && !imgError) {
    return (
      <img
        src={url}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  if (isPdfListedFile(file)) {
    return (
      <div className="relative flex h-full w-full items-stretch justify-center overflow-hidden bg-muted">
        <iframe
          title=""
          src={withPdfViewerFragment(url)}
          className="pointer-events-none absolute left-1/2 top-0 h-[200px] w-[min(100%,200px)] max-w-none -translate-x-1/2 border-0"
          loading="lazy"
        />
        <span className="pointer-events-none absolute bottom-0 right-0 rounded-tl bg-background/90 px-1 py-px text-[9px] font-medium text-muted-foreground">
          PDF
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
      <File className="h-7 w-7" />
    </div>
  );
}

function libraryMatchesAccept(accept: string | undefined, file: ListedStorageFile): boolean {
  if (!accept || accept === "*/*") return true;
  const mime = (file.mimeType || "").toLowerCase();
  const name = file.fileName.toLowerCase();
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase());
  for (const t of tokens) {
    if (t === "image/*") {
      if (mime.startsWith("image/")) return true;
      if (/\.(png|jpe?g|gif|webp|svg|bmp|tiff?|heic|avif|ico)$/.test(name)) return true;
    } else if (t === "application/pdf" || t === ".pdf") {
      if (mime === "application/pdf" || name.endsWith(".pdf")) return true;
    } else if (t.endsWith("/*")) {
      const base = t.slice(0, -2);
      if (mime.startsWith(`${base}/`)) return true;
    } else if (t.startsWith(".")) {
      if (name.endsWith(t)) return true;
    } else if (mime && t === mime) {
      return true;
    }
  }
  return false;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  label,
  accept = "image/*",
  valueDataUrl,
  onChange,
  className,
  multiple = false,
  fileLibrary,
  onLinkFromLibrary,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [libraryFiles, setLibraryFiles] = useState<ListedStorageFile[]>([]);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => onChange(file, reader.result as string);
      reader.readAsDataURL(file);
    },
    [onChange],
  );

  useEffect(() => {
    if (!libraryOpen || !fileLibrary?.locationId) return;
    let cancelled = false;
    setLibraryLoading(true);
    setLibraryError(null);
    fileUploadService
      .listFilesForLocation(fileLibrary.locationId, fileLibrary.contactId)
      .then(({ files, error }) => {
        if (cancelled) return;
        if (error) {
          setLibraryError(error);
          setLibraryFiles([]);
        } else {
          setLibraryFiles(files);
        }
        setLibraryLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLibraryError("Could not load files");
        setLibraryFiles([]);
        setLibraryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [libraryOpen, fileLibrary?.locationId, fileLibrary?.contactId]);

  const filteredLibraryFiles = useMemo(() => {
    const byAccept = libraryFiles.filter((f) => libraryMatchesAccept(accept, f));
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return byAccept;
    return byAccept.filter(
      (f) =>
        f.fileName.toLowerCase().includes(q) ||
        f.storagePath.toLowerCase().includes(q),
    );
  }, [libraryFiles, libraryQuery, accept]);

  const showLibrary = Boolean(fileLibrary?.locationId && onLinkFromLibrary);

  return (
    <div className={cn("w-full", className)}>
      {label && <div className="mb-2 text-sm font-medium">{label}</div>}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-md p-4 text-center bg-muted/30",
          dragOver && "border-primary",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {!valueDataUrl ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Upload className="h-5 w-5" />
            <div>Drag & drop or click to upload</div>
            <div className="text-xs">Accepted: {accept}</div>
          </div>
        ) : (
          <div className="relative">
            {valueDataUrl.startsWith("data:image") ||
            [
              ".png",
              ".jpg",
              ".jpeg",
              ".svg",
              ".webp",
              ".gif",
              ".bmp",
              ".tif",
              ".tiff",
              ".ico",
              ".avif",
              ".heic",
            ].some((str) => valueDataUrl.endsWith(str)) ? (
              <img src={valueDataUrl} alt="Uploaded preview" className="max-h-48 mx-auto rounded" />
            ) : valueDataUrl.startsWith("http") && isLikelyPdfHttpUrl(valueDataUrl) ? (
              <iframe
                title="PDF preview"
                src={withPdfViewerFragment(valueDataUrl)}
                className="mx-auto h-48 w-full max-w-md rounded-md border bg-background"
              />
            ) : valueDataUrl.startsWith("http") && isLikelyImageHttpUrl(valueDataUrl) ? (
              <img src={valueDataUrl} alt="Uploaded preview" className="max-h-48 mx-auto rounded object-contain" />
            ) : valueDataUrl.startsWith("http") ? (
              <div className="p-6 text-center">
                <div className="text-sm font-medium mb-2">File uploaded</div>
                <div className="text-xs text-muted-foreground">Click to replace</div>
              </div>
            ) : valueDataUrl.startsWith("data:application/pdf") ? (
              <iframe
                title="PDF preview"
                src={valueDataUrl}
                className="mx-auto h-48 w-full max-w-md rounded-md border bg-background"
              />
            ) : (
              <div className="p-6">PDF uploaded</div>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {showLibrary && (
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setLibraryQuery("");
              setLibraryOpen(true);
            }}
          >
            <FolderOpen className="h-4 w-4" />
            File library
          </Button>
        </div>
      )}

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent
          className="max-w-lg"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Choose from uploaded files</DialogTitle>
            <DialogDescription>
              Search by name or path, then pick
              one to link—no re-upload.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search…"
            value={libraryQuery}
            onChange={(e) => setLibraryQuery(e.target.value)}
            className="mb-2"
          />
          {libraryLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading files…
            </div>
          ) : libraryError ? (
            <p className="text-sm text-destructive py-6">{libraryError}</p>
          ) : filteredLibraryFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">
              No matching files. Upload something first, or adjust your search / file type filter.
            </p>
          ) : (
            <ScrollArea className="h-[min(50vh,360px)] pr-3">
              <ul className="space-y-2">
                {filteredLibraryFiles.map((f) => (
                  <li key={f.storagePath}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "flex gap-3 rounded-lg border border-transparent p-2 text-sm transition-colors",
                        "cursor-pointer hover:bg-muted",
                        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      )}
                      onClick={() => {
                        onLinkFromLibrary?.(fileUploadService.linkedFileFieldPayload(f));
                        setLibraryOpen(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onLinkFromLibrary?.(fileUploadService.linkedFileFieldPayload(f));
                          setLibraryOpen(false);
                        }
                      }}
                    >
                      <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md border bg-background shadow-sm">
                        <LibraryFileThumb file={f} />
                      </div>
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="font-medium truncate" title={f.fileName}>
                          {f.fileName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate" title={f.storagePath}>
                          {f.storagePath}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{formatBytes(f.fileSize)}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileDropzone;
