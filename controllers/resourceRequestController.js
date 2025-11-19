import ResourceRequest from '../models/ResourceRequest.js';
import Resource from '../models/Resource.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

// Create resource request (Member)
export const createResourceRequest = async (req, res) => {
  try {
    const { songTitle, description, resourceType, visibility, fileUrl } = req.body;
    const file = req.file;
    
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

    // Handle file upload
    if (file && ['sheet_music', 'audio_soprano', 'audio_alto', 'audio_tenor', 'audio_bass'].includes(resourceType)) {
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const folder = resourceType.startsWith('audio_') ? 'audio' : 'sheet_music';
      const uploadResult = await uploadToCloudinary(base64File, `resources/pending/${folder}`);

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
      if (!fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'File URL is required for link resources'
        });
      }
      fileType = 'link';
    }

    const request = new ResourceRequest({
      songTitle,
      description,
      resourceType,
      fileUrl: finalFileUrl,
      fileType,
      fileSize,
      cloudinaryPublicId,
      visibility: visibility || 'all_members',
      requestedBy: req.user.id,
      status: 'pending'
    });

    await request.save();
    await request.populate('requestedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Resource request submitted successfully',
      data: request
    });
  } catch (error) {
    console.error('Create resource request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create resource request'
    });
  }
};

// Get all resource requests (Admin/Moderator)
export const getAllResourceRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const requests = await ResourceRequest.find(filter)
      .populate('requestedBy', 'firstName lastName email studentId')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get all resource requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource requests'
    });
  }
};

// Get member's own requests
export const getMyResourceRequests = async (req, res) => {
  try {
    const requests = await ResourceRequest.find({ requestedBy: req.user.id })
      .populate('reviewedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get my resource requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your resource requests'
    });
  }
};

// Approve resource request (Admin/Moderator)
export const approveResourceRequest = async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Resource request not found'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }
    
    // Create the actual resource
    const resource = new Resource({
      songTitle: request.songTitle,
      description: request.description,
      resourceType: request.resourceType,
      fileUrl: request.fileUrl,
      fileType: request.fileType,
      fileSize: request.fileSize,
      cloudinaryPublicId: request.cloudinaryPublicId,
      visibility: request.visibility,
      uploadedBy: request.requestedBy,
      status: 'active'
    });
    
    await resource.save();
    
    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();
    
    await request.populate('requestedBy', 'firstName lastName email');
    await request.populate('reviewedBy', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Resource request approved',
      data: { request, resource }
    });
  } catch (error) {
    console.error('Approve resource request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve resource request'
    });
  }
};

// Reject resource request (Admin/Moderator)
export const rejectResourceRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    const request = await ResourceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Resource request not found'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`
      });
    }
    
    // Delete from Cloudinary if file was uploaded
    if (request.cloudinaryPublicId) {
      await deleteFromCloudinary(request.cloudinaryPublicId);
    }
    
    request.status = 'rejected';
    request.rejectionReason = reason.trim();
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();
    
    await request.populate('requestedBy', 'firstName lastName email');
    await request.populate('reviewedBy', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Resource request rejected',
      data: request
    });
  } catch (error) {
    console.error('Reject resource request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject resource request'
    });
  }
};

// Delete resource request
export const deleteResourceRequest = async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Resource request not found'
      });
    }
    
    // Members can only delete their own pending requests
    if (req.user.role === 'member') {
      if (request.requestedBy.toString() !== req.user.id || request.status !== 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this request'
        });
      }
    }
    
    // Delete from Cloudinary if file exists
    if (request.cloudinaryPublicId) {
      await deleteFromCloudinary(request.cloudinaryPublicId);
    }
    
    await ResourceRequest.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Resource request deleted successfully'
    });
  } catch (error) {
    console.error('Delete resource request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource request'
    });
  }
};
