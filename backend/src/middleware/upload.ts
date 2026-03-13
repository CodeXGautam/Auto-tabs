/**
 * backend/src/middleware/upload.ts — Multer config for PDF uploads
 *
 * Uses memory storage so the buffer can be forwarded to both
 * pdf-parse (text extraction) and Cloudinary (storage).
 */
import multer from "multer";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10 MB

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
}).single("pdfFile");
