import Gallery from '../models/Gallery.js';
import Member from '../models/Member.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Create gallery item (Admin/Moderator)
export const createGalleryItem = async (req, res) => {
  try {
    const { title, description, fileType, year, month } = req.body;
    const file = req.file;
    
    // Validation
    if (!title || !fileType || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Title, fileType, year, and month are required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'A file must be uploaded'
      });
    }

    // Upload to Cloudinary
    const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const folder = fileType === 'video' ? 'gallery/videos' : 'gallery/images';
    
    // Determine resource_type for Cloudinary based on fileType
    const resourceType = fileType === 'video' ? 'video' : 'image';
    
    // Using uploadToCloudinary which might default to auto or image if not specified, 
    // but we can pass resource_type through it if supported or assume it figures it out via 'auto'
    const uploadResult = await uploadToCloudinary(base64File, folder, { resource_type: 'auto' });

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload file: ' + uploadResult.error
      });
    }

    const galleryItem = new Gallery({
      title,
      description,
      fileType,
      fileUrl: uploadResult.url,
      cloudinaryPublicId: uploadResult.publicId,
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      uploadedBy: req.user.id,
      status: 'active'
    });

    await galleryItem.save();
    await galleryItem.populate('uploadedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Gallery item created successfully',
      data: galleryItem
    });
  } catch (error) {
    console.error('Create gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create gallery item'
    });
  }
};

// Get all gallery items with filters
export const getAllGalleryItems = async (req, res) => {
  try {
    const { fileType, year, month, search } = req.query;
    
    const filter = { status: 'active' };
    
    if (fileType) {
      filter.fileType = fileType;
    }
    if (year) {
      filter.year = parseInt(year, 10);
    }
    if (month) {
      filter.month = parseInt(month, 10);
    }
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }
    
    const galleryItems = await Gallery.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ year: -1, month: -1, createdAt: -1 });
    
    res.json({
      success: true,
      data: galleryItems
    });
  } catch (error) {
    console.error('Get gallery items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch gallery items'
    });
  }
};

// Delete gallery item (Admin/Moderator)
export const deleteGalleryItem = async (req, res) => {
  try {
    const galleryItem = await Gallery.findById(req.params.id);
    
    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }
    
    if (galleryItem.cloudinaryPublicId) {
      await deleteFromCloudinary(galleryItem.cloudinaryPublicId);
    }
    
    await Gallery.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Gallery item deleted successfully'
    });
  } catch (error) {
    console.error('Delete gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete gallery item'
    });
  }
};

// Update gallery item (Admin/Moderator)
export const updateGalleryItem = async (req, res) => {
  try {
    const { title, description, fileType, year, month } = req.body;
    const file = req.file;

    const galleryItem = await Gallery.findById(req.params.id);

    if (!galleryItem) {
      return res.status(404).json({
        success: false,
        message: 'Gallery item not found'
      });
    }

    if (title) galleryItem.title = title;
    if (description !== undefined) galleryItem.description = description;
    if (year) galleryItem.year = parseInt(year, 10);
    if (month) galleryItem.month = parseInt(month, 10);
    
    // If a new file is uploaded, upload to Cloudinary and replace the old one
    if (file) {
      const type = fileType || galleryItem.fileType;
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const folder = type === 'video' ? 'gallery/videos' : 'gallery/images';
      
      const uploadResult = await uploadToCloudinary(base64File, folder, { resource_type: 'auto' });
      
      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload new file: ' + uploadResult.error
        });
      }
      
      // Delete old file from Cloudinary
      if (galleryItem.cloudinaryPublicId) {
        await deleteFromCloudinary(galleryItem.cloudinaryPublicId);
      }
      
      galleryItem.fileUrl = uploadResult.url;
      galleryItem.cloudinaryPublicId = uploadResult.publicId;
      if (fileType) galleryItem.fileType = fileType;
    } else if (fileType && fileType !== galleryItem.fileType) {
       // Cannot just change fileType without uploading a new file of that type
       return res.status(400).json({
         success: false,
         message: 'You must upload a new file if you want to change the file type'
       });
    }

    await galleryItem.save();
    await galleryItem.populate('uploadedBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Gallery item updated successfully',
      data: galleryItem
    });
  } catch (error) {
    console.error('Update gallery item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update gallery item'
    });
  }
};
