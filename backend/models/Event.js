const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    minlength: [1, 'Title must be at least 1 character long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: ''
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required'],
    validate: {
      validator: function(value) {
        return value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['BUSY', 'SWAPPABLE', 'SWAP_PENDING'],
      message: 'Status must be either BUSY, SWAPPABLE, or SWAP_PENDING'
    },
    default: 'BUSY'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Used to track original owner after swaps
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'meeting', 'appointment', 'other'],
    default: 'other'
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Location cannot exceed 200 characters'],
    default: ''
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  swapHistory: [{
    swappedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    swappedAt: {
      type: Date,
      default: Date.now
    },
    swapRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SwapRequest'
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
eventSchema.index({ userId: 1, startTime: 1 });
eventSchema.index({ status: 1, startTime: 1 });
eventSchema.index({ startTime: 1, endTime: 1 });

// Virtual for duration in minutes
eventSchema.virtual('duration').get(function() {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
});

// Virtual for checking if event is in the past
eventSchema.virtual('isPast').get(function() {
  return this.endTime < new Date();
});

// Virtual for checking if event is currently active
eventSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.startTime <= now && this.endTime > now;
});

// Pre-save middleware to set originalUserId
eventSchema.pre('save', function(next) {
  if (this.isNew && !this.originalUserId) {
    this.originalUserId = this.userId;
  }
  next();
});

// Static method to find swappable events (excluding user's own events)
eventSchema.statics.findSwappableEvents = function(excludeUserId, limit = 50) {
  return this.find({
    status: 'SWAPPABLE',
    userId: { $ne: excludeUserId },
    startTime: { $gt: new Date() } // Only future events
  })
  .populate('userId', 'name email')
  .sort({ startTime: 1 })
  .limit(limit);
};

// Static method to find user's events
eventSchema.statics.findUserEvents = function(userId, includeAll = false) {
  const query = { userId };
  
  if (!includeAll) {
    query.startTime = { $gt: new Date() }; // Only future events
  }
  
  return this.find(query)
    .sort({ startTime: 1 });
};

// Instance method to check if event can be swapped
eventSchema.methods.canBeSwapped = function() {
  return this.status === 'SWAPPABLE' && this.startTime > new Date();
};

// Instance method to mark as swappable
eventSchema.methods.markAsSwappable = function() {
  if (this.startTime <= new Date()) {
    throw new Error('Cannot mark past events as swappable');
  }
  this.status = 'SWAPPABLE';
  return this.save();
};

// Instance method to mark as busy
eventSchema.methods.markAsBusy = function() {
  this.status = 'BUSY';
  return this.save();
};

// Instance method to check for time conflicts
eventSchema.methods.hasConflictWith = function(otherEvent) {
  return (
    (this.startTime < otherEvent.endTime) &&
    (this.endTime > otherEvent.startTime)
  );
};

module.exports = mongoose.model('Event', eventSchema);