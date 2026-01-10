/**
 * Cloudflare R2 Upload Service
 * 
 * Handles file uploads to Cloudflare R2 for public access
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '37fe66534312238914af0ff34d128ac3';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'capstone-ppt';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-264a609783284c7eb8735c64cda5c298.r2.dev';

// Create S3 client configured for R2
const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

/**
 * Upload a file to R2
 * @param filePath - Local file path
 * @param fileName - Name to use in R2 (will be prefixed with 'ppt/')
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(filePath: string, fileName: string): Promise<string> {
    const key = `ppt/${fileName}`;

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Determine content type
    const ext = path.extname(fileName).toLowerCase();
    const contentType = getContentType(ext);

    console.log(`[R2] Uploading ${fileName} to R2...`);

    // Upload to R2
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
    });

    await s3Client.send(command);

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    console.log(`[R2] ✅ Uploaded successfully: ${publicUrl}`);

    return publicUrl;
}

/**
 * Get content type based on file extension
 */
function getContentType(ext: string): string {
    const types: Record<string, string> = {
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
    };
    return types[ext] || 'application/octet-stream';
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
    return !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/**
 * Get the public URL for a file in R2
 */
export function getR2PublicUrl(fileName: string): string {
    return `${R2_PUBLIC_URL}/ppt/${fileName}`;
}
