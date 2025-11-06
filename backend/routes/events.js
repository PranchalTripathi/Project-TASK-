const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
const { authenticateToken, checkResourceOwnership } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateEvent = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('startTime')
    .isISO8601()
    .withMessage('Start time must be a valid date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('endTime')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('category')
    .optional()
    .isIn(['work', 'personal', 'meeting', 'appointment', 'other'])
    .withMessage('Category must be one of: work, personal, meeting, appointment, other'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters')
];

const validateEventUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid date')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('Start time must be in the future');
      }
      return true;
    }),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid date'),
  body('status')
    .optional()
    .isIn(['BUSY', 'SWAPPABLE'])
    .withMessage('Status must be either BUSY or SWAPPABLE'),
  body('category')
    .optional()
    .isIn(['work', 'personal', 'meeting', 'appointment', 'other'])
    .withMessage('Category must be one of: work, personal, meeting, appointment, other'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters')
];

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

// Helper function to check for time conflicts
const checkTimeConflicts = async (userId, startTime, endTime, excludeEventId = null) => {
  const query = {
    userId,
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };
  
  if (excludeEventId) {
    query._id = { $ne: excludeEventId };
  }
  
  const conflictingEvents = await Event.find(query);
  return conflictingEvents;
};

// @route   GET /api/events
// @desc    Get user's events
// @access  Private
router.get('/', 
  authenticateToken,
  [
    query('includeAll')
      .optional()
      .isBoolean()
      .withMessage('includeAll must be a boolean'),
    query('status')
      .optional()
      .isIn(['BUSY', 'SWAPPABLE', 'SWAP_PENDING'])
      .withMessage('Status must be BUSY, SWAPPABLE, or SWAP_PENDING'),
    query('category')
      .optional()
      .isIn(['work', 'personal', 'meeting', 'appointment', 'other'])
      .withMessage('Invalid category'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { 
        includeAll = false, 
        status, 
        category, 
        startDate, 
        endDate,
        page = 1,
        limit = 50
      } = req.query;
      
      // Build query
      let query = { userId };
      
      // Filter by future events only (unless includeAll is true)
      if (!includeAll) {
        query.startTime = { $gt: new Date() };
      }
      
      // Filter by status
      if (status) {
        query.status = status;
      }
      
      // Filter by category
      if (category) {
        query.category = category;
      }
      
      // Filter by date range
      if (startDate || endDate) {
        query.startTime = query.startTime || {};
        if (startDate) {
          query.startTime.$gte = new Date(startDate);
        }
        if (endDate) {
          query.endTime = { $lte: new Date(endDate) };
        }
      }
      
      // Pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [events, totalCount] = await Promise.all([
        Event.find(query)
          .sort({ startTime: 1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'name email'),
        Event.countDocuments(query)
      ]);
      
      res.json({
        success: true,
        data: {
          events,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / parseInt(limit)),
            totalCount,
            hasNext: skip + events.length < totalCount,
            hasPrev: parseInt(page) > 1
          }
        }
      });
      
    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch events'
      });
    }
  }
);

// @route   GET /api/events/swappable-slots
// @desc    Get all swappable events from other users
// @access  Private
router.get('/swappable-slots', 
  authenticateToken,
  [
    query('category')
      .optional()
      .isIn(['work', 'personal', 'meeting', 'appointment', 'other'])
      .withMessage('Invalid category'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid date'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { category, startDate, endDate, limit = 50 } = req.query;
      
      // Build query for swappable events
      let query = {
        status: 'SWAPPABLE',
        userId: { $ne: userId },
        startTime: { $gt: new Date() }
      };
      
      // Filter by category
      if (category) {
        query.category = category;
      }
      
      // Filter by date range
      if (startDate) {
        query.startTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.endTime = { $lte: new Date(endDate) };
      }
      
      const swappableEvents = await Event.find(query)
        .populate('userId', 'name email')
        .sort({ startTime: 1 })
        .limit(parseInt(limit));
      
      res.json({
        success: true,
        data: {
          swappableEvents,
          count: swappableEvents.length
        }
      });
      
    } catch (error) {
      console.error('Get swappable slots error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch swappable slots'
      });
    }
  }
);

// @route   POST /api/events
// @desc    Create a new event
// @access  Private
router.post('/', 
  authenticateToken, 
  validateEvent, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { 
        title, 
        description, 
        startTime, 
        endTime, 
        category = 'other', 
        location = '' 
      } = req.body;
      
      // Check for time conflicts
      const conflicts = await checkTimeConflicts(userId, new Date(startTime), new Date(endTime));
      
      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Time conflict detected with existing events',
          conflicts: conflicts.map(event => ({
            id: event._id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime
          }))
        });
      }
      
      const event = new Event({
        title: title.trim(),
        description: description?.trim() || '',
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        userId,
        category,
        location: location?.trim() || ''
      });
      
      await event.save();
      
      // Populate user info
      await event.populate('userId', 'name email');
      
      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: { event }
      });
      
    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create event'
      });
    }
  }
);

// @route   GET /api/events/:id
// @desc    Get a specific event
// @access  Private
router.get('/:id', 
  authenticateToken, 
  checkResourceOwnership('Event'), 
  async (req, res) => {
    try {
      const event = req.resource;
      await event.populate('userId', 'name email');
      
      res.json({
        success: true,
        data: { event }
      });
      
    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch event'
      });
    }
  }
);

// @route   PUT /api/events/:id
// @desc    Update an event
// @access  Private
router.put('/:id', 
  authenticateToken, 
  checkResourceOwnership('Event'),
  validateEventUpdate, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const event = req.resource;
      const updateData = req.body;
      
      // Check if event is in SWAP_PENDING status
      if (event.status === 'SWAP_PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update event while swap is pending'
        });
      }
      
      // If updating time, check for conflicts
      if (updateData.startTime || updateData.endTime) {
        const newStartTime = updateData.startTime ? new Date(updateData.startTime) : event.startTime;
        const newEndTime = updateData.endTime ? new Date(updateData.endTime) : event.endTime;
        
        // Validate end time is after start time
        if (newEndTime <= newStartTime) {
          return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
          });
        }
        
        const conflicts = await checkTimeConflicts(
          event.userId, 
          newStartTime, 
          newEndTime, 
          event._id
        );
        
        if (conflicts.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Time conflict detected with existing events',
            conflicts: conflicts.map(conflictEvent => ({
              id: conflictEvent._id,
              title: conflictEvent.title,
              startTime: conflictEvent.startTime,
              endTime: conflictEvent.endTime
            }))
          });
        }
      }
      
      // Update event
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          event[key] = updateData[key];
        }
      });
      
      await event.save();
      await event.populate('userId', 'name email');
      
      res.json({
        success: true,
        message: 'Event updated successfully',
        data: { event }
      });
      
    } catch (error) {
      console.error('Update event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update event'
      });
    }
  }
);

// @route   DELETE /api/events/:id
// @desc    Delete an event
// @access  Private
router.delete('/:id', 
  authenticateToken, 
  checkResourceOwnership('Event'), 
  async (req, res) => {
    try {
      const event = req.resource;
      
      // Check if event is in SWAP_PENDING status
      if (event.status === 'SWAP_PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete event while swap is pending'
        });
      }
      
      await Event.findByIdAndDelete(event._id);
      
      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete event'
      });
    }
  }
);

// @route   PATCH /api/events/:id/status
// @desc    Update event status (make swappable/busy)
// @access  Private
router.patch('/:id/status', 
  authenticateToken, 
  checkResourceOwnership('Event'),
  [
    body('status')
      .isIn(['BUSY', 'SWAPPABLE'])
      .withMessage('Status must be either BUSY or SWAPPABLE')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const event = req.resource;
      const { status } = req.body;
      
      // Check if event is in SWAP_PENDING status
      if (event.status === 'SWAP_PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Cannot change status while swap is pending'
        });
      }
      
      // Check if event is in the past
      if (event.startTime <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change status of past events'
        });
      }
      
      event.status = status;
      await event.save();
      
      res.json({
        success: true,
        message: `Event marked as ${status.toLowerCase()}`,
        data: { event }
      });
      
    } catch (error) {
      console.error('Update event status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update event status'
      });
    }
  }
);

module.exports = router;