import Resource from '../models/Resource.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Create resource (Admin/Moderator) - with file upload
export const createResource = async (req, res) => {
  try {
    const { songTitle, description, resourceType, visibility, fileUrl } = req.body;
    const file = req.file;
    
    // Validation
    if (!songTitle || !description || !resourceType) {
      return res.status(400).json({
        success: false,
        message: 'Song title, description, and resource type are required'
      });
    }

    let finalFileUrl = fileUrl || '';
    let fileType = null;
    let fileSize = null;
    let cloudinaryPublicId = null;

    // Handle file upload for sheet music and audio
    if (file && ['sheet_music', 'audio_soprano', 'audio_alto', 'audio_tenor', 'audio_bass'].includes(resourceType)) {
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const folder = resourceType.startsWith('audio_') ? 'audio' : 'sheet_music';
      const uploadResult = await uploadToCloudinary(base64File, `resources/${folder}`);

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to upload file: ' + uploadResult.error
        });
      }

      finalFileUrl = uploadResult.url;
      cloudinaryPublicId = uploadResult.publicId;
      fileType = file.mimetype.split('/')[1];
      fileSize = file.size;
    } else if (['google_drive_link', 'youtube_link'].includes(resourceType)) {
      // For links, use the provided URL
      if (!fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'File URL is required for link resources'
        });
      }
      fileType = 'link';
    }

    const resource = new Resource({
      songTitle,
      description,
      resourceType,
      fileUrl: finalFileUrl,
      fileType,
      fileSize,
      cloudinaryPublicId,
      visibility: visibility || 'all_members',
      uploadedBy: req.user.id,
      status: 'active'
    });

    await resource.save();
    await resource.populate('uploadedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource
    });
  } catch (error) {
    console.error('Create resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resource'
    });
  }
};

// Get all resources with filters
export const getAllResources = async (req, res) => {
  try {
    const { search, resourceType, visibility, status } = req.query;
    const userRole = req.user.role;
    
    const filter = { status: status || 'active' };
    
    // Filter by visibility based on user role
    if (userRole === 'member') {
      filter.$or = [
        { visibility: 'all_members' },
        { uploadedBy: req.user.id } // Members can see their own uploads
      ];
    }
    
    // Resource type filter
    if (resourceType) {
      filter.resourceType = resourceType;
    }
    
    // Visibility filter (admin/moderator only)
    if (visibility && ['admin', 'moderator'].includes(userRole)) {
      filter.visibility = visibility;
    }
    
    // Text search
    if (search) {
      filter.$text = { $search: search };
    }
    
    const resources = await Resource.find(filter)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('Get all resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources'
    });
  }
};

// Get single resource
export const getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email');
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Check visibility permissions
    if (resource.visibility === 'admin_moderator_only' && 
        req.user.role === 'member' && 
        resource.uploadedBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this resource'
      });
    }
    
    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    console.error('Get resource by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource'
    });
  }
};

// Update resource (Admin/Moderator)
export const updateResource = async (req, res) => {
  try {
    const { songTitle, description, visibility, status, fileUrl } = req.body;
    
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Update fields
    if (songTitle) resource.songTitle = songTitle;
    if (description) resource.description = description;
    if (visibility) resource.visibility = visibility;
    if (status) resource.status = status;
    if (fileUrl && ['google_drive_link', 'youtube_link'].includes(resource.resourceType)) {
      resource.fileUrl = fileUrl;
    }
    
    await resource.save();
    await resource.populate('uploadedBy', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Resource updated successfully',
      data: resource
    });
  } catch (error) {
    console.error('Update resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update resource'
    });
  }
};

// Delete resource (Admin/Moderator)
export const deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Delete from Cloudinary if it's an uploaded file
    if (resource.cloudinaryPublicId) {
      await deleteFromCloudinary(resource.cloudinaryPublicId);
    }
    
    await Resource.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource'
    });
  }
};

// Get resources grouped by song
export const getResourcesBySong = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    const filter = { status: 'active' };
    
    // Filter by visibility based on user role
    if (userRole === 'member') {
      filter.$or = [
        { visibility: 'all_members' },
        { uploadedBy: req.user.id }
      ];
    }
    
    const resources = await Resource.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ songTitle: 1, createdAt: -1 });
    
    // Group by song
    const groupedResources = resources.reduce((acc, resource) => {
      if (!acc[resource.songTitle]) {
        acc[resource.songTitle] = [];
      }
      acc[resource.songTitle].push(resource);
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: groupedResources
    });
  } catch (error) {
    console.error('Get resources by song error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resources'
    });
  }
};
