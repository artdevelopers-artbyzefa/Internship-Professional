import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create completely generic storage that accepts everything and keeps original filenames
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Generate a clean filename without extension
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

export const uploadCloudinary = multer({ storage: storage });
export { cloudinary };
