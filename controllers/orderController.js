import Order from '../models/Order.js';
import Merchandise from '../models/Merchandise.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import ExcelJS from 'exceljs';

// Create order (Member)
export const createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const receiptFile = req.file;
    
    // Validation
    if (!items) {
      return res.status(400).json({
        success: false,
        message: 'Items are required'
      });
    }

    // Parse items if it's a string (from FormData)
    let parsedItems;
    try {
      parsedItems = typeof items === 'string' ? JSON.parse(items) : items;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items format'
      });
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one item must be ordered'
      });
    }
    
    if (!receiptFile) {
      return res.status(400).json({
        success: false,
        message: 'Receipt file is required'
      });
    }

    // Upload receipt to Cloudinary
    const base64File = `data:${receiptFile.mimetype};base64,${receiptFile.buffer.toString('base64')}`;
    const uploadResult = await uploadToCloudinary(base64File, 'receipts');

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload receipt: ' + uploadResult.error
      });
    }
    
    // Validate and calculate total
    let totalAmount = 0;
    const orderItems = [];
    
    for (const item of parsedItems) {
      if (!item.merchandiseId || !item.size || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have merchandiseId, size, and quantity'
        });
      }
      
      const merchandise = await Merchandise.findById(item.merchandiseId);
      
      if (!merchandise) {
        return res.status(404).json({
          success: false,
          message: `Merchandise with ID ${item.merchandiseId} not found`
        });
      }
      
      if (merchandise.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `${merchandise.name} is not available for purchase`
        });
      }
      
      if (!merchandise.sizes.includes(item.size)) {
        return res.status(400).json({
          success: false,
          message: `Size ${item.size} is not available for ${merchandise.name}`
        });
      }
      
      const itemTotal = merchandise.price * item.quantity;
      totalAmount += itemTotal;
      
      orderItems.push({
        merchandiseId: merchandise._id,
        name: merchandise.name,
        size: item.size,
        quantity: item.quantity,
        price: merchandise.price
      });
    }
    
    const order = new Order({
      memberId: req.user.id,
      items: orderItems,
      totalAmount,
      receipt: uploadResult.url,
      status: 'pending'
    });
    
    await order.save();
    
    // Populate member details
    await order.populate('memberId', 'firstName lastName email studentId');
    
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// Get all orders with filters (Admin/Moderator)
export const getAllOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, period, category, size } = req.query;
    
    const filter = {};
    
    // Status filter
    if (status) {
      filter.status = status;
    }
    
    // Date filters
    if (startDate || endDate || period) {
      filter.createdAt = {};
      
      if (period) {
        const now = new Date();
        let start;
        
        switch (period) {
          case 'week':
            start = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            start = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            start = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            start = null;
        }
        
        if (start) {
          filter.createdAt.$gte = start;
        }
      } else {
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
    }
    
    let orders = await Order.find(filter)
      .populate('memberId', 'firstName lastName email studentId')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('items.merchandiseId')
      .sort({ createdAt: -1 });
    
    // Filter by category (client-side filtering since category is in populated merchandise)
    if (category) {
      orders = orders.filter(order => 
        order.items.some(item => 
          item.merchandiseId && item.merchandiseId.category === category
        )
      );
    }
    
    // Filter by size
    if (size) {
      orders = orders.filter(order => 
        order.items.some(item => item.size === size)
      );
    }
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Get single order
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('memberId', 'firstName lastName email studentId')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('items.merchandiseId');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Members can only view their own orders
    if (req.user.role === 'member' && order.memberId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order'
    });
  }
};

// Get member's own orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ memberId: req.user.id })
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
};

// Verify order - Confirm (Admin/Moderator)
export const confirmOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}`
      });
    }
    
    order.status = 'confirmed';
    order.verifiedBy = req.user.id;
    order.verifiedAt = new Date();
    order.declineReason = null; // Clear any previous decline reason
    
    await order.save();
    await order.populate('memberId', 'firstName lastName email studentId');
    await order.populate('verifiedBy', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Order confirmed successfully',
      data: order
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm order'
    });
  }
};

// Verify order - Decline (Admin/Moderator)
export const declineOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Decline reason is required'
      });
    }
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}`
      });
    }
    
    order.status = 'declined';
    order.declineReason = reason.trim();
    order.verifiedBy = req.user.id;
    order.verifiedAt = new Date();
    
    await order.save();
    await order.populate('memberId', 'firstName lastName email studentId');
    await order.populate('verifiedBy', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Order declined',
      data: order
    });
  } catch (error) {
    console.error('Decline order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline order'
    });
  }
};

// Delete order (Admin only or member can delete their own pending orders)
export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Members can only delete their own pending orders
    if (req.user.role === 'member') {
      if (order.memberId.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this order'
        });
      }
      
      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Can only delete pending orders'
        });
      }
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order'
    });
  }
};

// Get order statistics (Admin/Moderator)
export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const confirmedOrders = await Order.countDocuments({ status: 'confirmed' });
    const declinedOrders = await Order.countDocuments({ status: 'declined' });
    
    // Calculate total revenue from confirmed orders
    const confirmedOrdersData = await Order.find({ status: 'confirmed' });
    const totalRevenue = confirmedOrdersData.reduce((sum, order) => sum + order.totalAmount, 0);
    
    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        declinedOrders,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics'
    });
  }
};

// Export orders to Excel (Admin/Moderator)
export const exportOrdersToExcel = async (req, res) => {
  try {
    const { status, startDate, endDate, period, category, size } = req.query;
    
    const filter = {};
    
    // Apply same filters as getAllOrders
    if (status) {
      filter.status = status;
    }
    
    if (startDate || endDate || period) {
      filter.createdAt = {};
      
      if (period) {
        const now = new Date();
        let start;
        
        switch (period) {
          case 'week':
            start = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            start = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            start = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            start = null;
        }
        
        if (start) {
          filter.createdAt.$gte = start;
        }
      } else {
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
    }
    
    let orders = await Order.find(filter)
      .populate('memberId', 'firstName lastName email studentId')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('items.merchandiseId')
      .sort({ createdAt: -1 });
    
    // Apply category and size filters
    if (category) {
      orders = orders.filter(order => 
        order.items.some(item => 
          item.merchandiseId && item.merchandiseId.category === category
        )
      );
    }
    
    if (size) {
      orders = orders.filter(order => 
        order.items.some(item => item.size === size)
      );
    }
    
    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');
    
    // Define columns
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 25 },
      { header: 'Order Date', key: 'orderDate', width: 20 },
      { header: 'Student ID', key: 'studentId', width: 15 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Item Name', key: 'itemName', width: 20 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Size', key: 'size', width: 10 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Unit Price', key: 'unitPrice', width: 12 },
      { header: 'Item Total', key: 'itemTotal', width: 12 },
      { header: 'Order Total', key: 'orderTotal', width: 12 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Receipt URL', key: 'receipt', width: 40 },
      { header: 'Verified By', key: 'verifiedBy', width: 25 },
      { header: 'Verified At', key: 'verifiedAt', width: 20 },
      { header: 'Decline Reason', key: 'declineReason', width: 40 }
    ];
    
    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Add data rows
    orders.forEach(order => {
      order.items.forEach((item, index) => {
        worksheet.addRow({
          orderId: order._id.toString(),
          orderDate: new Date(order.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          studentId: order.memberId.studentId,
          customerName: `${order.memberId.firstName} ${order.memberId.lastName}`,
          email: order.memberId.email,
          itemName: item.name,
          category: item.merchandiseId ? item.merchandiseId.category : 'N/A',
          size: item.size,
          quantity: item.quantity,
          unitPrice: item.price,
          itemTotal: item.price * item.quantity,
          orderTotal: index === 0 ? order.totalAmount : '',
          status: order.status.toUpperCase(),
          receipt: order.receipt,
          verifiedBy: order.verifiedBy ? `${order.verifiedBy.firstName} ${order.verifiedBy.lastName}` : '',
          verifiedAt: order.verifiedAt ? new Date(order.verifiedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : '',
          declineReason: order.declineReason || ''
        });
      });
    });
    
    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=orders_export_${Date.now()}.xlsx`
    );
    
    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export orders'
    });
  }
};
