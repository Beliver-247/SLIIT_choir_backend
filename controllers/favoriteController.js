import Favorite from '../models/Favorite.js';
import Resource from '../models/Resource.js';

// Add resource to favorites
export const addFavorite = async (req, res) => {
  try {
    const { resourceId } = req.body;
    
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource ID is required'
      });
    }
    
    // Check if resource exists
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }
    
    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      memberId: req.user.id,
      resourceId
    });
    
    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Resource already in favorites'
      });
    }
    
    const favorite = new Favorite({
      memberId: req.user.id,
      resourceId
    });
    
    await favorite.save();
    
    res.status(201).json({
      success: true,
      message: 'Resource added to favorites',
      data: favorite
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add favorite'
    });
  }
};

// Remove resource from favorites
export const removeFavorite = async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    const favorite = await Favorite.findOneAndDelete({
      memberId: req.user.id,
      resourceId
    });
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Resource removed from favorites'
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove favorite'
    });
  }
};

// Get member's favorites
export const getMyFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ memberId: req.user.id })
      .populate({
        path: 'resourceId',
        populate: { path: 'uploadedBy', select: 'firstName lastName' }
      })
      .sort({ createdAt: -1 });
    
    // Filter out any favorites where resource was deleted
    const validFavorites = favorites.filter(fav => fav.resourceId !== null);
    
    res.json({
      success: true,
      data: validFavorites
    });
  } catch (error) {
    console.error('Get my favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites'
    });
  }
};

// Check if resource is favorited
export const checkFavorite = async (req, res) => {
  try {
    const { resourceId } = req.params;
    
    const favorite = await Favorite.findOne({
      memberId: req.user.id,
      resourceId
    });
    
    res.json({
      success: true,
      data: { isFavorited: !!favorite }
    });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check favorite status'
    });
  }
};
