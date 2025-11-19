import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary (images, PDFs, audio)
 * @param {string} fileBuffer - Base64 encoded file or file buffer
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<Object>} Upload result with URL
 */
export const uploadToCloudinary = async (fileBuffer, folder = 'receipts') => {
  try {
    const result = await cloudinary.uploader.upload(fileBuffer, {
      folder: `sliit-choir/${folder}`,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'mp3', 'wav', 'ogg'],
      access_control: [{ access_type: 'anonymous' }]
    });

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete file from Cloudinary (images, PDFs, audio, video)
 * @param {string} publicId - Public ID of the file
 * @param {string} resourceType - Type of resource ('image', 'video', 'raw', 'auto')
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'auto') => {
  try {
    // For audio files, we need to specify resource_type as 'video'
    const type = resourceType === 'auto' ? (publicId.includes('/audio/') ? 'video' : 'image') : resourceType;
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: type });
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default cloudinary;
