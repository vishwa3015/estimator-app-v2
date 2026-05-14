import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LibraryFileThumb } from "@/components/ui/file-dropzone";
import {
  fileUploadService,
  isUserLibraryFilename,
  type ListedStorageFile,
} from "@/services/estimates/file-upload-service";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Pencil, Trash2, Upload } from "lucide-react";

function formatBytes(n: number): string {
  if (!n || n <= 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeRenameBasename(input: string): string | null {
  const trimmed = input.trim().replace(/^.*[/\\]/, "");
  if (!trimmed || trimmed.includes("..") || trimmed.includes("/")) return null;
  if (!isUserLibraryFilename(trimmed)) return null;
  return trimmed;
}

function buildRenamedPath(currentPath: string, newBasename: string): string | null {
  const parts = currentPath.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  parts[parts.length - 1] = newBasename;
  return parts.join("/");
}

interface EstimateFilesManagerPanelProps {
  locationId: string | null;
}

export function EstimateFilesManagerPanel({ locationId }: EstimateFilesManagerPanelProps) {
  const { toast } = useToast();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ListedStorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ListedStorageFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ListedStorageFile | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const { files: list, error } = await fileUploadService.listFilesForLocation(locationId, null);
      if (error) {
        toast({ title: "Could not load files", description: error, variant: "destructive" });
        setFiles([]);
        return;
      }
      setFiles(list);
    } finally {
      setLoading(false);
    }
  }, [locationId, toast]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleUploadPick = () => uploadInputRef.current?.click();

  const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !locationId) return;
    const validation = fileUploadService.validateFile(file, true);
    if (!validation.valid) {
      toast({ title: "Invalid file", description: validation.error, variant: "destructive" });
      return;
    }
    setUploading(true);
    const { success, error, fileName } = await fileUploadService.uploadLocationLibraryFile(file, locationId);
    setUploading(false);
    if (!success) {
      toast({ title: "Upload failed", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Uploaded",
      description: fileName ? `"${fileName}" is in your library (shared folder).` : "File added to library.",
    });
    await loadFiles();
  };

  const openRename = (f: ListedStorageFile) => {
    setRenameTarget(f);
    setRenameValue(f.fileName);
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const nextBase = sanitizeRenameBasename(renameValue);
    if (!nextBase) {
      toast({
        title: "Invalid name",
        description:
          "Use a safe file name with an extension (letters, numbers, dot, underscore, hyphen). Same rules as uploads.",
        variant: "destructive",
      });
      return;
    }
    if (nextBase === renameTarget.fileName) {
      setRenameTarget(null);
      return;
    }
    const newPath = buildRenamedPath(renameTarget.storagePath, nextBase);
    if (!newPath) {
      toast({ title: "Rename failed", description: "Could not build path.", variant: "destructive" });
      return;
    }
    setRenameBusy(true);
    const { success, error } = await fileUploadService.moveStorageFile(renameTarget.storagePath, newPath);
    setRenameBusy(false);
    if (!success) {
      toast({ title: "Rename failed", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Renamed",
      description: "Existing estimates still point at the old path until you re-link fields if needed.",
    });
    setRenameTarget(null);
    await loadFiles();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    const ok = await fileUploadService.deleteFile(deleteTarget.storagePath);
    setDeleteBusy(false);
    setDeleteTarget(null);
    if (!ok) {
      toast({ title: "Delete failed", description: "Could not remove file from storage.", variant: "destructive" });
      return;
    }
    toast({ title: "Deleted", description: "File removed from storage." });
    await loadFiles();
  };

  if (!locationId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Location is not loaded. You cannot manage files yet.
      </div>
    );
  }

  return (
    <div className="space-y-6 pr-2">
      <Card>
        <CardHeader>
          <CardTitle>Files manager</CardTitle>
          <CardDescription>
            Upload, rename, or delete files stored under this location. They appear in the estimate{" "}
            <strong>File library</strong> (along with per-contact uploads when editing an estimate).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.pdf,.png,.jpg,.jpeg,.webp,.gif,.svg"
              onChange={handleUploadChange}
            />
            <Button type="button" size="sm" onClick={handleUploadPick} disabled={uploading || loading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload to library
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => loadFiles()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-muted-foreground text-sm">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading files…
            </div>
          ) : files.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No library files yet. Upload one to get started.</p>
          ) : (
            <ScrollArea className="h-[min(60vh,480px)] rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur border-b">
                  <tr className="text-left">
                    <th className="p-3 w-20 font-medium">Preview</th>
                    <th className="p-3 font-medium">File</th>
                    <th className="p-3 font-medium w-24">Size</th>
                    <th className="p-3 font-medium w-36 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.storagePath} className="border-b border-border/60 hover:bg-muted/40">
                      <td className="p-2 align-middle">
                        <div className="relative h-14 w-12 overflow-hidden rounded-md border bg-background mx-auto">
                          <LibraryFileThumb file={f} />
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <div className="font-medium truncate max-w-[280px] md:max-w-md" title={f.fileName}>
                          {f.fileName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[320px] md:max-w-lg" title={f.storagePath}>
                          {f.storagePath}
                        </div>
                      </td>
                      <td className="p-3 align-middle text-muted-foreground whitespace-nowrap">{formatBytes(f.fileSize)}</td>
                      <td className="p-2 align-middle text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Download"
                            onClick={() => fileUploadService.downloadFile(f.storagePath, f.fileName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Rename"
                            onClick={() => openRename(f)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={() => setDeleteTarget(f)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
            <DialogDescription>
              Change the file name in storage. Use only the name and extension (no folders). Linked estimate fields keep
              the old path until updated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename-file-input">File name</Label>
            <Input
              id="rename-file-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitRename} disabled={renameBusy}>
              {renameBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.fileName}</span> will be removed from
                  storage. Any estimate fields still pointing at this path will break.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy}
              onClick={() => confirmDelete()}
            >
              {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
