/**
 * backend/src/services/cloudinaryService.ts — Cloudinary PDF storage
 *
 * Uploads PDF buffers to Cloudinary for persistent storage,
 * keeping the local app lightweight.
 */
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export function uploadPdfBuffer(
  buffer: Buffer,
  originalName: string
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "etabs-pdfs",
        public_id: `${Date.now()}-${originalName.replace(/\.pdf$/i, "")}`,
        format: "pdf",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
        } else {
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      }
    );
    stream.end(buffer);
  });
}
