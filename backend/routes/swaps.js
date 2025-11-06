const express = require('express');
const { body, validationResult, query } = require('express-validator');
const SwapRequest = require('../models/SwapRequest');
const Event = require('../models/Event');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }
  next();
};

// @route   POST /api/swap/request
// @desc    Create a swap request
// @access  Private
router.post('/request', 
  authenticateToken,
  [
    body('mySlotId')
      .isMongoId()
      .withMessage('Invalid my slot ID'),
    body('theirSlotId')
      .isMongoId()
      .withMessage('Invalid their slot ID'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Message cannot exceed 300 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { mySlotId, theirSlotId, message = '' } = req.body;
      const requestedBy = req.user._id;
      
      // Validate that slots are different
      if (mySlotId === theirSlotId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot swap a slot with itself'
        });
      }
      
      // Get both events
      const [mySlot, theirSlot] = await Promise.all([
        Event.findById(mySlotId),
        Event.findById(theirSlotId)
      ]);
      
      if (!mySlot || !theirSlot) {
        return res.status(404).json({
          success: false,
          message: 'One or both slots not found'
        });
      }
      
      // Validate ownership and permissions
      if (mySlot.userId.toString() !== requestedBy.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only swap your own slots'
        });
      }
      
      if (theirSlot.userId.toString() === requestedBy.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot swap with your own slot'
        });
      }
      
      // Check if slots are swappable
      if (mySlot.status !== 'SWAPPABLE') {
        return res.status(400).json({
          success: false,
          message: 'Your slot must be marked as swappable'
        });
      }
      
      if (theirSlot.status !== 'SWAPPABLE') {
        return res.status(400).json({
          success: false,
          message: 'Target slot is not available for swapping'
        });
      }
      
      // Check if events are in the future
      const now = new Date();
      if (mySlot.startTime <= now || theirSlot.startTime <= now) {
        return res.status(400).json({
          success: false,
          message: 'Cannot swap past events'
        });
      }
      
      // Check for existing pending request between these slots
      const existingRequest = await SwapRequest.findOne({
        $or: [
          { mySlotId, theirSlotId, status: 'PENDING' },
          { mySlotId: theirSlotId, theirSlotId: mySlotId, status: 'PENDING' }
        ]
      });
      
      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: 'A pending swap request already exists for these slots'
        });
      }
      
      // Create swap request
      const swapRequest = new SwapRequest({
        mySlotId,
        theirSlotId,
        requestedBy,
        requestedTo: theirSlot.userId,
        message: message.trim()
      });
      
      await swapRequest.save();
      
      // Populate the request with event and user details
      await swapRequest.populate([
        { path: 'requestedBy', select: 'name email' },
        { path: 'requestedTo', select: 'name email' },
        { path: 'mySlotId', select: 'title startTime endTime category location' },
        { path: 'theirSlotId', select: 'title startTime endTime category location' }
      ]);
      
      res.status(201).json({
        success: true,
        message: 'Swap request sent successfully',
        data: { swapRequest }
      });
      
    } catch (error) {
      console.error('Create swap request error:', error);
      
      if (error.message.includes('duplicate key')) {
        return res.status(400).json({
          success: false,
          message: 'A pending swap request already exists for these slots'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create swap request'
      });
    }
  }
);

// @route   GET /api/swap/incoming
// @desc    Get incoming swap requests
// @access  Private
router.get('/incoming', 
  authenticateToken,
  [
    query('status')
      .optional()
      .isIn(['PENDING', 'ACCEPTED', 'REJECTED'])
      .withMessage('Status must be PENDING, ACCEPTED, or REJECTED'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { status, page = 1, limit = 20 } = req.query;
      
      // Build query
      let query = { requestedTo: userId };
      
      if (status) {
        query.status = status;
      } else {
        // Default to pending and non-expired requests
        query.status = 'PENDING';
        query.expiresAt = { $gt: new Date() };
      }
      
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [requests, totalCount] = await Promise.all([
        SwapRequest.find(query)
          .populate('requestedBy', 'name email')
          .populate('mySlotId', 'title startTime endTime category location')
          .populate('theirSlotId', 'title startTime endTime category location')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SwapRequest.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            hasNext: skip + requests.length < totalCount,
            hasPrev: parseInt(page) > 1
          }
        }
      });
      
    } catch (error) {
      console.error('Get incoming requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch incoming requests'
      });
    }
  }
);

// @route   GET /api/swap/outgoing
// @desc    Get outgoing swap requests
// @access  Private
router.get('/outgoing', 
  authenticateToken,
  [
    query('status')
      .optional()
      .isIn(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'])
      .withMessage('Status must be PENDING, ACCEPTED, REJECTED, or CANCELLED'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { status, page = 1, limit = 20 } = req.query;
      
      // Build query
      let query = { requestedBy: userId };
      
      if (status) {
        query.status = status;
      }
      
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [requests, totalCount] = await Promise.all([
        SwapRequest.find(query)
          .populate('requestedTo', 'name email')
          .populate('mySlotId', 'title startTime endTime category location')
          .populate('theirSlotId', 'title startTime endTime category location')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SwapRequest.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          requests,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            hasNext: skip + requests.length < totalCount,
            hasPrev: parseInt(page) > 1
          }
        }
      });
      
    } catch (error) {
      console.error('Get outgoing requests error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch outgoing requests'
      });
    }
  }
);

// @route   POST /api/swap/response/:requestId
// @desc    Accept or reject a swap request
// @access  Private
router.post('/response/:requestId', 
  authenticateToken,
  [
    body('action')
      .isIn(['accept', 'reject'])
      .withMessage('Action must be either accept or reject'),
    body('message')
      .optional()
      .trim()
      .isLength({ max: 300 })
      .withMessage('Message cannot exceed 300 characters')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { action, message = '' } = req.body;
      const userId = req.user._id;
      
      // Find the swap request
      const swapRequest = await SwapRequest.findById(requestId)
        .populate('mySlotId')
        .populate('theirSlotId');
      
      if (!swapRequest) {
        return res.status(404).json({
          success: false,
          message: 'Swap request not found'
        });
      }
      
      // Verify user is the recipient
      if (swapRequest.requestedTo.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to respond to this request'
        });
      }
      
      // Check if request is still pending
      if (swapRequest.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Request has already been responded to'
        });
      }
      
      // Check if request has expired
      if (swapRequest.isExpired) {
        return res.status(400).json({
          success: false,
          message: 'Request has expired'
        });
      }
      
      // Verify both slots still exist and are in correct state
      if (!swapRequest.mySlotId || !swapRequest.theirSlotId) {
        return res.status(400).json({
          success: false,
          message: 'One or both slots no longer exist'
        });
      }
      
      if (swapRequest.mySlotId.status !== 'SWAP_PENDING' || 
          swapRequest.theirSlotId.status !== 'SWAP_PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Slots are no longer in pending swap state'
        });
      }
      
      let result;
      
      if (action === 'accept') {
        result = await swapRequest.accept(message.trim());
        
        // Populate the updated request
        await result.populate([
          { path: 'requestedBy', select: 'name email' },
          { path: 'requestedTo', select: 'name email' },
          { path: 'mySlotId', select: 'title startTime endTime userId' },
          { path: 'theirSlotId', select: 'title startTime endTime userId' }
        ]);
        
        res.json({
          success: true,
          message: 'Swap request accepted successfully',
          data: { swapRequest: result }
        });
        
      } else {
        result = await swapRequest.reject(message.trim());
        
        // Populate the updated request
        await result.populate([
          { path: 'requestedBy', select: 'name email' },
          { path: 'requestedTo', select: 'name email' },
          { path: 'mySlotId', select: 'title startTime endTime' },
          { path: 'theirSlotId', select: 'title startTime endTime' }
        ]);
        
        res.json({
          success: true,
          message: 'Swap request rejected',
          data: { swapRequest: result }
        });
      }
      
    } catch (error) {
      console.error('Swap response error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process swap response'
      });
    }
  }
);

// @route   POST /api/swap/cancel/:requestId
// @desc    Cancel a swap request (by requester)
// @access  Private
router.post('/cancel/:requestId', 
  authenticateToken,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const userId = req.user._id;
      
      // Find the swap request
      const swapRequest = await SwapRequest.findById(requestId);
      
      if (!swapRequest) {
        return res.status(404).json({
          success: false,
          message: 'Swap request not found'
        });
      }
      
      // Verify user is the requester
      if (swapRequest.requestedBy.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to cancel this request'
        });
      }
      
      // Check if request is still pending
      if (swapRequest.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Can only cancel pending requests'
        });
      }
      
      const result = await swapRequest.cancel();
      
      // Populate the updated request
      await result.populate([
        { path: 'requestedBy', select: 'name email' },
        { path: 'requestedTo', select: 'name email' },
        { path: 'mySlotId', select: 'title startTime endTime' },
        { path: 'theirSlotId', select: 'title startTime endTime' }
      ]);
      
      res.json({
        success: true,
        message: 'Swap request cancelled successfully',
        data: { swapRequest: result }
      });
      
    } catch (error) {
      console.error('Cancel swap request error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel swap request'
      });
    }
  }
);

// @route   GET /api/swap/history
// @desc    Get swap history for user
// @access  Private
router.get('/history', 
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 20 } = req.query;
      
      // Build query for completed swaps (accepted)
      const query = {
        $or: [
          { requestedBy: userId },
          { requestedTo: userId }
        ],
        status: 'ACCEPTED'
      };
      
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [swapHistory, totalCount] = await Promise.all([
        SwapRequest.find(query)
          .populate('requestedBy', 'name email')
          .populate('requestedTo', 'name email')
          .populate('mySlotId', 'title startTime endTime category')
          .populate('theirSlotId', 'title startTime endTime category')
          .sort({ respondedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        SwapRequest.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          swapHistory,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            hasNext: skip + swapHistory.length < totalCount,
            hasPrev: parseInt(page) > 1
          }
        }
      });
      
    } catch (error) {
      console.error('Get swap history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch swap history'
      });
    }
  }
);

module.exports = router;