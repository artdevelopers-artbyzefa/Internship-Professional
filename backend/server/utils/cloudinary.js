import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

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
            folder: 'dims', // Store all files in a 'dims' folder
            resource_type: 'auto', // Accept any file type (image, video, raw pdf, docx, etc.)
            public_id: uniqueFilename, // Set our own clean filename
        };
    },
});

export const uploadCloudinary = multer({ storage: storage });
export { cloudinary };
