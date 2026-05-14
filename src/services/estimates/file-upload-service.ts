import { supabase } from "@/integrations/supabase/client";

export interface FileUploadResult {
  success: boolean;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  error?: string;
}

export interface FileReference {
  storagePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

/** Flattened object from storage listing (recursive walk). */
export interface ListedStorageFile {
  storagePath: string;
  fileName: string;
  fileSize: number;
  updatedAt?: string;
  mimeType?: string;
}

function normalizeStoragePrefix(path: string): string {
  return path.replace(/^\/+/g, "").replace(/\/+$/g, "");
}

/** Basename rules for File Library: timestamp uploads or safe renamed files (no generated estimate PDFs). */
export function isUserLibraryFilename(base: string): boolean {
  if (!base || base.endsWith("-estimate.pdf")) return false;
  if (/^\d{10,}\.[A-Za-z0-9]+$/.test(base)) return true;
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}\.[A-Za-z0-9]{1,20}$/.test(base);
}

/**
 * True for user-managed library objects: `{locationId}/…/{file}`, `estimates/{contactId}/{file}` (3 segments),
 * excluding system `*-estimate.pdf` and nested estimate PDF folders (handled when listing).
 */
export function isEditorUserUploadStoragePath(storagePath: string): boolean {
  const normalized = normalizeStoragePrefix(storagePath);
  const segments = normalized.split("/").filter(Boolean);
  const base = segments[segments.length - 1] ?? "";
  if (!isUserLibraryFilename(base)) return false;
  if (segments[0] === "estimates") {
    return segments.length === 3;
  }
  return segments.length === 3;
}

function guessMimeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
    heic: "image/heic",
    avif: "image/avif",
    ico: "image/x-icon",
  };
  return map[ext] || "application/octet-stream";
}

export const fileUploadService = {
  // Validate ID to prevent path traversal attacks
  validateId: (id: string, paramName: string): { valid: boolean; error?: string } => {
    if (!id) {
      return { valid: false, error: `${paramName} is required` };
    }

    // Only allow alphanumeric characters, hyphens, and underscores
    // Reject any path traversal attempts
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return {
        valid: false,
        error: `${paramName} contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.`,
      };
    }

    // Additional check for common path traversal patterns
    if (id.includes("..") || id.includes("/") || id.includes("\\")) {
      return { valid: false, error: `${paramName} contains invalid path characters` };
    }

    // Reasonable length limit
    if (id.length > 100) {
      return { valid: false, error: `${paramName} is too long (max 100 characters)` };
    }

    return { valid: true };
  },

  // Upload a file to Supabase storage
  uploadFile: async (file: File, estimateId: string, sectionId: string): Promise<FileUploadResult> => {
    try {
      // Validate inputs
      if (!file || !estimateId || !sectionId) {
        return {
          success: false,
          error: "Missing required parameters: file, estimateId, or sectionId",
        };
      }

      // Validate IDs to prevent path traversal
      const estimateIdValidation = fileUploadService.validateId(estimateId, "estimateId");
      if (!estimateIdValidation.valid) {
        return {
          success: false,
          error: estimateIdValidation.error,
        };
      }

      const sectionIdValidation = fileUploadService.validateId(sectionId, "sectionId");
      if (!sectionIdValidation.valid) {
        return {
          success: false,
          error: sectionIdValidation.error,
        };
      }

      // Validate file size (max 10MB)
      const maxSize = 50 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size of 50MB`,
        };
      }

      // Validate file type (only PDFs for now)
      if (file.type !== "application/pdf") {
        return {
          success: false,
          error: "Only PDF files are currently supported",
        };
      }

      // Generate unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop() || "pdf";
      const fileName = `${estimateId}/${sectionId}/${timestamp}.${fileExtension}`;

      // Upload file to storage
      const { data, error } = await supabase.storage.from("estimate-files").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        console.error("Error uploading file to storage:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Get file metadata
      const { data: metadata } = await supabase.storage.from("estimate-files").getPublicUrl(fileName);

      return {
        success: true,
        storagePath: fileName,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    } catch (error) {
      console.error("Error in file upload service:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },

  // Upload a file to Supabase storage
  uploadFileByLocation: async (
    file: File,
    location_id: string,
    isEstimateFile?: boolean,
    contactId?: string,
  ): Promise<FileUploadResult> => {
    try {
      // Validate inputs
      if (!file || !location_id) {
        return {
          success: false,
          error: "Missing required parameters: file or locationId",
        };
      }

      // Validate location_id to prevent path traversal
      const locationIdValidation = fileUploadService.validateId(location_id, "location_id");
      if (!locationIdValidation.valid) {
        return {
          success: false,
          error: locationIdValidation.error,
        };
      }

      // Validate contactId if provided
      if (contactId) {
        const contactIdValidation = fileUploadService.validateId(contactId, "contactId");
        if (!contactIdValidation.valid) {
          return {
            success: false,
            error: contactIdValidation.error,
          };
        }
      }

      // Validate file size (max 10MB)
      const maxSize = 50 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size of 50MB`,
        };
      }

      // Validate file type (only PDFs for now)
      // if (file.type !== 'application/pdf') {
      //   return {
      //     success: false,
      //     error: 'Only PDF files are currently supported'
      //   };
      // }

      // Generate unique filename to avoid conflicts
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop() || "pdf";
      const fileName = `${isEstimateFile ? `/estimates/${contactId}` : `${location_id}/${contactId}`}/${timestamp}.${fileExtension}`;

      // Upload file to storage
      const { data, error } = await supabase.storage.from("estimate-files").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        console.error(`Error uploading file ${fileName} to storage:`, error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        storagePath: fileName,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    } catch (error) {
      console.error("Error in file upload service:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },

  /**
   * Upload into `{locationId}/library/{timestamp}.{ext}` for shared files (settings Files manager).
   */
  uploadLocationLibraryFile: async (file: File, location_id: string): Promise<FileUploadResult> => {
    try {
      if (!file || !location_id) {
        return { success: false, error: "Missing file or location" };
      }
      const locValidation = fileUploadService.validateId(location_id, "location_id");
      if (!locValidation.valid) {
        return { success: false, error: locValidation.error };
      }
      const vf = fileUploadService.validateFile(file, true);
      if (!vf.valid) {
        return { success: false, error: vf.error };
      }
      const timestamp = Date.now();
      const fileExtension = file.name.split(".").pop() || "bin";
      const storagePath = `${location_id}/library/${timestamp}.${fileExtension}`;
      const { error } = await supabase.storage.from("estimate-files").upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return {
        success: true,
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  },

  /** Rename/move an object within the same bucket (paths relative to bucket root). */
  moveStorageFile: async (
    fromPath: string,
    toPath: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const from = normalizeStoragePrefix(fromPath);
    const to = normalizeStoragePrefix(toPath);
    if (!from || !to) {
      return { success: false, error: "Invalid path" };
    }
    if (from.includes("..") || to.includes("..")) {
      return { success: false, error: "Invalid path" };
    }
    const { error } = await supabase.storage.from("estimate-files").move(from, to);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // Delete a file from storage
  deleteFile: async (storagePath: string): Promise<boolean> => {
    try {
      if (!storagePath) {
        console.error("No storage path provided for deletion");
        return false;
      }

      const { error } = await supabase.storage.from("estimate-files").remove([storagePath]);

      if (error) {
        console.error("Error deleting file from storage:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in file delete service:", error);
      return false;
    }
  },

  // Get public URL for a file
  getFileUrl: (storagePath: string): string => {
    if (!storagePath) {
      console.warn("No storage path provided for URL generation");
      return "";
    }

    const { data } = supabase.storage.from("estimate-files").getPublicUrl(storagePath);

    return data.publicUrl;
  },

  // Download a file
  downloadFile: async (storagePath: string, fileName: string): Promise<void> => {
    try {
      if (!storagePath || !fileName) {
        console.error("Missing storage path or filename for download");
        return;
      }

      const { data, error } = await supabase.storage.from("estimate-files").download(storagePath);

      if (error) {
        console.error("Error downloading file:", error);
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error in file download service:", error);
    }
  },

  // Check if file exists in storage
  fileExists: async (storagePath: string): Promise<boolean> => {
    try {
      if (!storagePath) {
        return false;
      }

      const { data, error } = await supabase.storage
        .from("estimate-files")
        .list(storagePath.split("/").slice(0, -1).join("/"));

      if (error) {
        console.error("Error checking file existence:", error);
        return false;
      }

      const fileName = storagePath.split("/").pop();
      return data.some((file) => file.name === fileName);
    } catch (error) {
      console.error("Error in file existence check:", error);
      return false;
    }
  },

  // Validate file before upload
  validateFile: (file: File, skipPdfCheck?: boolean): { valid: boolean; error?: string } => {
    if (!file) {
      return { valid: false, error: "No file provided" };
    }

    // Check file size (max 10MB)
    const maxSize = 50 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size of 50MB`,
      };
    }

    // Check file type
    if (!skipPdfCheck && file.type !== "application/pdf") {
      return { valid: false, error: "Only PDF files are currently supported" };
    }

    return { valid: true };
  },

  /**
   * Lists user-uploaded files from the estimate editor / settings (`uploadFileByLocation`):
   * `{locationId}/{contactId}/{timestamp}.ext` and `estimates/{contactId}/{timestamp}.ext`.
   * Omits system-generated estimate PDFs (e.g. `estimates/.../.../*-estimate.pdf`) and other paths.
   */
  listFilesForLocation: async (
    locationId: string,
    contactId?: string | null,
  ): Promise<{ files: ListedStorageFile[]; error?: string }> => {
    const locValidation = fileUploadService.validateId(locationId, "location_id");
    if (!locValidation.valid) {
      return { files: [], error: locValidation.error };
    }

    if (contactId) {
      const cValidation = fileUploadService.validateId(contactId, "contactId");
      if (!cValidation.valid) {
        return { files: [], error: cValidation.error };
      }
    }

    const bucket = "estimate-files";
    const roots: string[] = [normalizeStoragePrefix(locationId)];
    if (contactId) {
      roots.push(normalizeStoragePrefix(`estimates/${contactId}`));
    }

    const listFolderPage = async (folderPath: string, offset: number) => {
      return supabase.storage.from(bucket).list(folderPath, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    };

    const listAllImmediate = async (folderPath: string) => {
      const acc: NonNullable<Awaited<ReturnType<typeof listFolderPage>>["data"]> = [];
      let offset = 0;
      for (;;) {
        const { data, error } = await listFolderPage(folderPath, offset);
        if (error) {
          return { data: null, error };
        }
        if (!data?.length) break;
        acc.push(...data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return { data: acc, error: null as null };
    };

    const collectUnderRoot = async (root: string): Promise<ListedStorageFile[]> => {
      const out: ListedStorageFile[] = [];
      // System PDFs live under `estimates/{contactId}/{estimateId}/…`; user uploads are only files
      // directly in `estimates/{contactId}/`. Avoid listing nested estimate folders.
      const skipNestedUnderEstimatesContact =
        /^estimates\/[^/]+$/.test(root);

      const walk = async (prefix: string) => {
        const { data, error } = await listAllImmediate(prefix);
        if (error) {
          console.warn("Storage list failed:", prefix, error);
          return;
        }
        if (!data?.length) return;

        for (const item of data) {
          const childPath = prefix ? `${prefix}/${item.name}` : item.name;
          const isFolder = item.metadata === null;
          if (isFolder) {
            if (skipNestedUnderEstimatesContact && prefix === root) {
              continue;
            }
            await walk(childPath);
          } else {
            const meta = item.metadata as { size?: number; mimetype?: string } | undefined;
            const size = Number(meta?.size ?? 0);
            out.push({
              storagePath: childPath,
              fileName: item.name,
              fileSize: size,
              updatedAt: item.updated_at,
              mimeType: meta?.mimetype,
            });
          }
        }
      };

      await walk(root);
      return out;
    };

    try {
      const merged: ListedStorageFile[] = [];
      const seen = new Set<string>();
      for (const root of roots) {
        const part = await collectUnderRoot(root);
        for (const f of part) {
          const key = normalizeStoragePrefix(f.storagePath);
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push({ ...f, storagePath: key });
        }
      }
      const userOnly = merged.filter((f) => isEditorUserUploadStoragePath(f.storagePath));
      userOnly.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      return { files: userOnly };
    } catch (e) {
      return {
        files: [],
        error: e instanceof Error ? e.message : "Failed to list storage files",
      };
    }
  },

  linkedFileFieldPayload: (file: ListedStorageFile) => ({
    file_storage_path: normalizeStoragePrefix(file.storagePath),
    file_name: file.fileName,
    file_size: file.fileSize,
    file_type: file.mimeType || guessMimeFromFileName(file.fileName),
  }),
};
