import Merchandise from '../models/Merchandise.js';

// Get all merchandise items (with filters)
export const getAllMerchandise = async (req, res) => {
  try {
    const { category, status } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    
    const merchandise = await Merchandise.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: merchandise
    });
  } catch (error) {
    console.error('Get merchandise error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchandise'
    });
  }
};

// Get single merchandise item
export const getMerchandiseById = async (req, res) => {
  try {
    const merchandise = await Merchandise.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!merchandise) {
      return res.status(404).json({
        success: false,
        message: 'Merchandise not found'
      });
    }
    
    res.json({
      success: true,
      data: merchandise
    });
  } catch (error) {
    console.error('Get merchandise by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch merchandise'
    });
  }
};

// Create merchandise (Admin/Moderator only)
export const createMerchandise = async (req, res) => {
  try {
    const { name, description, price, image, sizes, stock, category, status } = req.body;
    
    // Validation
    if (!name || !description || !price || !sizes || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    if (price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a positive number'
      });
    }
    
    if (!Array.isArray(sizes) || sizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one size must be provided'
      });
    }
    
    const merchandise = new Merchandise({
      name,
      description,
      price,
      image,
      sizes,
      stock: stock || 0,
      category,
      status: status || 'available',
      createdBy: req.user.id
    });
    
    await merchandise.save();
    
    res.status(201).json({
      success: true,
      message: 'Merchandise created successfully',
      data: merchandise
    });
  } catch (error) {
    console.error('Create merchandise error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create merchandise'
    });
  }
};

// Update merchandise (Admin/Moderator only)
export const updateMerchandise = async (req, res) => {
  try {
    const { name, description, price, image, sizes, stock, category, status } = req.body;
    
    const merchandise = await Merchandise.findById(req.params.id);
    
    if (!merchandise) {
      return res.status(404).json({
        success: false,
        message: 'Merchandise not found'
      });
    }
    
    // Update fields
    if (name) merchandise.name = name;
    if (description) merchandise.description = description;
    if (price !== undefined) {
      if (price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a positive number'
        });
      }
      merchandise.price = price;
    }
    if (image !== undefined) merchandise.image = image;
    if (sizes) {
      if (!Array.isArray(sizes) || sizes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one size must be provided'
        });
      }
      merchandise.sizes = sizes;
    }
    if (stock !== undefined) merchandise.stock = stock;
    if (category) merchandise.category = category;
    if (status) merchandise.status = status;
    
    await merchandise.save();
    
    res.json({
      success: true,
      message: 'Merchandise updated successfully',
      data: merchandise
    });
  } catch (error) {
    console.error('Update merchandise error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update merchandise'
    });
  }
};

// Delete merchandise (Admin/Moderator only)
export const deleteMerchandise = async (req, res) => {
  try {
    const merchandise = await Merchandise.findByIdAndDelete(req.params.id);
    
    if (!merchandise) {
      return res.status(404).json({
        success: false,
        message: 'Merchandise not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Merchandise deleted successfully'
    });
  } catch (error) {
    console.error('Delete merchandise error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete merchandise'
    });
  }
};
