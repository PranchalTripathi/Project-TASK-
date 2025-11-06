const mongoose = require('mongoose');

const swapRequestSchema = new mongoose.Schema({
  mySlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'My slot ID is required']
  },
  theirSlotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Their slot ID is required']
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester ID is required']
  },
  requestedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient ID is required']
  },
  status: {
    type: String,
    enum: {
      values: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'],
      message: 'Status must be PENDING, ACCEPTED, REJECTED, or CANCELLED'
    },
    default: 'PENDING'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [300, 'Message cannot exceed 300 characters'],
    default: ''
  },
  responseMessage: {
    type: String,
    trim: true,
    maxlength: [300, 'Response message cannot exceed 300 characters'],
    default: ''
  },
  respondedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Requests expire after 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
swapRequestSchema.index({ requestedBy: 1, status: 1 });
swapRequestSchema.index({ requestedTo: 1, status: 1 });
swapRequestSchema.index({ mySlotId: 1, theirSlotId: 1 });
swapRequestSchema.index({ expiresAt: 1 });

// Compound index to prevent duplicate requests
swapRequestSchema.index(
  { mySlotId: 1, theirSlotId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'PENDING' }
  }
);

// Virtual for checking if request is expired
swapRequestSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual for checking if request is still pending
swapRequestSchema.virtual('isPending').get(function() {
  return this.status === 'PENDING' && !this.isExpired;
});

// Pre-save middleware to validate request
swapRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Check if both slots exist and are swappable
    const Event = mongoose.model('Event');
    
    try {
      const [mySlot, theirSlot] = await Promise.all([
        Event.findById(this.mySlotId),
        Event.findById(this.theirSlotId)
      ]);
      
      if (!mySlot || !theirSlot) {
        return next(new Error('One or both slots do not exist'));
      }
      
      if (mySlot.userId.toString() !== this.requestedBy.toString()) {
        return next(new Error('You can only swap your own slots'));
      }
      
      if (theirSlot.userId.toString() !== this.requestedTo.toString()) {
        return next(new Error('Invalid target slot owner'));
      }
      
      if (mySlot.status !== 'SWAPPABLE') {
        return next(new Error('Your slot must be swappable'));
      }
      
      if (theirSlot.status !== 'SWAPPABLE') {
        return next(new Error('Target slot must be swappable'));
      }
      
      if (mySlot.startTime <= new Date() || theirSlot.startTime <= new Date()) {
        return next(new Error('Cannot swap past events'));
      }
      
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Post-save middleware to update slot statuses
swapRequestSchema.post('save', async function(doc) {
  if (doc.isNew && doc.status === 'PENDING') {
    const Event = mongoose.model('Event');
    
    try {
      // Update both slots to SWAP_PENDING
      await Promise.all([
        Event.findByIdAndUpdate(doc.mySlotId, { status: 'SWAP_PENDING' }),
        Event.findByIdAndUpdate(doc.theirSlotId, { status: 'SWAP_PENDING' })
      ]);
    } catch (error) {
      console.error('Error updating slot statuses:', error);
    }
  }
});

// Static method to find user's incoming requests
swapRequestSchema.statics.findIncomingRequests = function(userId) {
  return this.find({
    requestedTo: userId,
    status: 'PENDING',
    expiresAt: { $gt: new Date() }
  })
  .populate('requestedBy', 'name email')
  .populate('mySlotId', 'title startTime endTime')
  .populate('theirSlotId', 'title startTime endTime')
  .sort({ createdAt: -1 });
};

// Static method to find user's outgoing requests
swapRequestSchema.statics.findOutgoingRequests = function(userId) {
  return this.find({
    requestedBy: userId
  })
  .populate('requestedTo', 'name email')
  .populate('mySlotId', 'title startTime endTime')
  .populate('theirSlotId', 'title startTime endTime')
  .sort({ createdAt: -1 });
};

// Instance method to accept the swap request
swapRequestSchema.methods.accept = async function(responseMessage = '') {
  if (this.status !== 'PENDING') {
    throw new Error('Request is no longer pending');
  }
  
  if (this.isExpired) {
    throw new Error('Request has expired');
  }
  
  const Event = mongoose.model('Event');
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Get both events
      const [mySlot, theirSlot] = await Promise.all([
        Event.findById(this.mySlotId).session(session),
        Event.findById(this.theirSlotId).session(session)
      ]);
      
      if (!mySlot || !theirSlot) {
        throw new Error('One or both slots no longer exist');
      }
      
      // Swap the userIds
      const tempUserId = mySlot.userId;
      mySlot.userId = theirSlot.userId;
      theirSlot.userId = tempUserId;
      
      // Update statuses to BUSY
      mySlot.status = 'BUSY';
      theirSlot.status = 'BUSY';
      
      // Add swap history
      const swapHistoryEntry = {
        swappedWith: theirSlot.userId,
        swappedAt: new Date(),
        swapRequestId: this._id
      };
      
      mySlot.swapHistory.push({
        swappedWith: mySlot.userId,
        swappedAt: new Date(),
        swapRequestId: this._id
      });
      
      theirSlot.swapHistory.push(swapHistoryEntry);
      
      // Save events
      await Promise.all([
        mySlot.save({ session }),
        theirSlot.save({ session })
      ]);
      
      // Update swap request
      this.status = 'ACCEPTED';
      this.responseMessage = responseMessage;
      this.respondedAt = new Date();
      
      await this.save({ session });
    });
    
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
  
  return this;
};

// Instance method to reject the swap request
swapRequestSchema.methods.reject = async function(responseMessage = '') {
  if (this.status !== 'PENDING') {
    throw new Error('Request is no longer pending');
  }
  
  const Event = mongoose.model('Event');
  
  try {
    // Revert both slots to SWAPPABLE
    await Promise.all([
      Event.findByIdAndUpdate(this.mySlotId, { status: 'SWAPPABLE' }),
      Event.findByIdAndUpdate(this.theirSlotId, { status: 'SWAPPABLE' })
    ]);
    
    // Update swap request
    this.status = 'REJECTED';
    this.responseMessage = responseMessage;
    this.respondedAt = new Date();
    
    await this.save();
    
  } catch (error) {
    throw error;
  }
  
  return this;
};

// Instance method to cancel the swap request (by requester)
swapRequestSchema.methods.cancel = async function() {
  if (this.status !== 'PENDING') {
    throw new Error('Request is no longer pending');
  }
  
  const Event = mongoose.model('Event');
  
  try {
    // Revert both slots to SWAPPABLE
    await Promise.all([
      Event.findByIdAndUpdate(this.mySlotId, { status: 'SWAPPABLE' }),
      Event.findByIdAndUpdate(this.theirSlotId, { status: 'SWAPPABLE' })
    ]);
    
    // Update swap request
    this.status = 'CANCELLED';
    this.respondedAt = new Date();
    
    await this.save();
    
  } catch (error) {
    throw error;
  }
  
  return this;
};

module.exports = mongoose.model('SwapRequest', swapRequestSchema);