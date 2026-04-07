/**
 * @fileoverview Cloudinary Storage Integration Utility.
 * This module configures Cloudinary for media storage and provides functions 
 * for direct buffer uploads or using Multer for request-based file handling.
 */

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment configuration for standalone scripts
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

/**
 * Configure Cloudinary global instance
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Generic storage engine for Multer using Cloudinary.
 * Preserves original file types (raw) and adds unique timestamps to filenames.
 */
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const ext = path.extname(file.originalname);
        const cleanName = encodeURIComponent(path.basename(file.originalname, ext).replace(/\s+/g, '_'));
        const uniqueFilename = `${Date.now()}-${cleanName}`;

        return {
            folder: 'dims', 
            resource_type: 'raw', 
            type: 'upload', 
            upload_preset: 'public_preset', 
            public_id: uniqueFilename, 
        };
    },
});

/**
 * Uploads a raw buffer directly to Cloudinary.
 * Ideal for generated PDFs or system-level binary data.
 * 
 * @param {Buffer} buffer - Content to upload.
 * @param {string} filename - Base filename for the public_id.
 * @param {string} folder - Destination folder on Cloudinary.
 * @returns {Promise<Object>} The Cloudinary upload result object.
 */
export const uploadCloudinaryBuffer = (buffer, filename, folder = 'dims/archives') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                resource_type: 'raw', 
                public_id: filename.split('.')[0] + '_' + Date.now(),
                folder: folder,
                format: filename.split('.').pop()
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(buffer);
    });
};

/**
 * Multer middleware instance for Cloudinary uploads.
 */
export const uploadCloudinary = multer({ storage: storage });

export { cloudinary };

