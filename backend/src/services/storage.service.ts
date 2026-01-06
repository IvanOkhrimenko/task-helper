import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

// Storage configuration
const isCloudStorage = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

// Initialize S3 client for Cloudflare R2 (only if configured)
const s3Client = isCloudStorage ? new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
}) : null;

const bucketName = process.env.R2_BUCKET_NAME || '';

// Local uploads directory (fallback)
const uploadsDir = path.join(process.cwd(), 'uploads');

/**
 * Storage service that supports both local filesystem and Cloudflare R2
 * Falls back to local storage if R2 is not configured
 */
export const StorageService = {
  /**
   * Check if cloud storage is enabled
   */
  isCloudEnabled(): boolean {
    return isCloudStorage;
  },

  /**
   * Upload a file to storage
   * @param fileBuffer - File content as Buffer
   * @param fileName - Name of the file
   * @param contentType - MIME type (default: application/pdf)
   * @returns URL or path to the stored file
   */
  async uploadFile(fileBuffer: Buffer, fileName: string, contentType = 'application/pdf'): Promise<string> {
    if (isCloudStorage && s3Client) {
      // Upload to Cloudflare R2
      const key = `invoices/${fileName}`;

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
      }));

      // Return the key (not full URL, we'll generate signed URLs for access)
      return `r2://${key}`;
    } else {
      // Fallback to local storage
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, fileBuffer);

      return filePath;
    }
  },

  /**
   * Get a file from storage
   * @param filePathOrKey - Local path or R2 key (r2://...)
   * @returns File buffer or null if not found
   */
  async getFile(filePathOrKey: string): Promise<Buffer | null> {
    if (filePathOrKey.startsWith('r2://') && isCloudStorage && s3Client) {
      // Fetch from Cloudflare R2
      const key = filePathOrKey.replace('r2://', '');

      try {
        const response = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        }));

        if (response.Body) {
          const chunks: Uint8Array[] = [];
          for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          return Buffer.concat(chunks);
        }
        return null;
      } catch (error) {
        console.error('R2 getFile error:', error);
        return null;
      }
    } else {
      // Local file
      const localPath = filePathOrKey.startsWith('r2://')
        ? path.join(uploadsDir, path.basename(filePathOrKey))
        : filePathOrKey;

      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
      return null;
    }
  },

  /**
   * Get a signed URL for temporary access to a file
   * @param filePathOrKey - Local path or R2 key
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns Signed URL or local path
   */
  async getSignedUrl(filePathOrKey: string, expiresIn = 3600): Promise<string | null> {
    if (filePathOrKey.startsWith('r2://') && isCloudStorage && s3Client) {
      const key = filePathOrKey.replace('r2://', '');

      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        return await getSignedUrl(s3Client, command, { expiresIn });
      } catch (error) {
        console.error('R2 getSignedUrl error:', error);
        return null;
      }
    } else {
      // For local files, return the path (will be served by the download endpoint)
      return filePathOrKey;
    }
  },

  /**
   * Delete a file from storage
   * @param filePathOrKey - Local path or R2 key
   */
  async deleteFile(filePathOrKey: string): Promise<boolean> {
    if (filePathOrKey.startsWith('r2://') && isCloudStorage && s3Client) {
      const key = filePathOrKey.replace('r2://', '');

      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        }));
        return true;
      } catch (error) {
        console.error('R2 deleteFile error:', error);
        return false;
      }
    } else {
      // Local file
      const localPath = filePathOrKey.startsWith('r2://')
        ? path.join(uploadsDir, path.basename(filePathOrKey))
        : filePathOrKey;

      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        return true;
      }
      return false;
    }
  },

  /**
   * Check if a file exists in storage
   * @param filePathOrKey - Local path or R2 key
   */
  async fileExists(filePathOrKey: string): Promise<boolean> {
    if (filePathOrKey.startsWith('r2://') && isCloudStorage && s3Client) {
      const key = filePathOrKey.replace('r2://', '');

      try {
        await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        }));
        return true;
      } catch {
        return false;
      }
    } else {
      const localPath = filePathOrKey.startsWith('r2://')
        ? path.join(uploadsDir, path.basename(filePathOrKey))
        : filePathOrKey;
      return fs.existsSync(localPath);
    }
  },

  /**
   * Get file name from path or key
   */
  getFileName(filePathOrKey: string): string {
    if (filePathOrKey.startsWith('r2://')) {
      return path.basename(filePathOrKey.replace('r2://', ''));
    }
    return path.basename(filePathOrKey);
  }
};
