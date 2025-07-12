import mongoose from "mongoose";

// Interface for Session document
export interface ISession extends mongoose.Document {
  // Session Identification
  sessionId: string;
  user?: mongoose.Types.ObjectId;
  
  // Session Data
  data: Record<string, any>;
  
  // Authentication Status
  isAuthenticated: boolean;
  
  // Device and Browser Information
  userAgent?: string;
  ipAddress?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
    isMobile?: boolean;
  };
  
  // Location Information
  location?: {
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
  
  // Session Status
  isActive: boolean;
  
  // Security
  csrfToken?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
}

const sessionSchema = new mongoose.Schema<ISession>({
  // Session Identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    sparse: true,
    index: true
  },
  
  // Session Data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Authentication Status
  isAuthenticated: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Device and Browser Information
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  ipAddress: {
    type: String,
    validate: {
      validator: function(v: string) {
        if (!v) return true;
        // Basic IP validation (IPv4 and IPv6)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(v) || ipv6Regex.test(v);
      },
      message: 'Invalid IP address format'
    },
    index: true
  },
  deviceInfo: {
    browser: String,
    os: String,
    device: String,
    isMobile: {
      type: Boolean,
      default: false
    }
  },
  
  // Location Information
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  
  // Session Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Security
  csrfToken: String,
  
  // Timestamps
  lastAccessedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ isAuthenticated: 1, isActive: 1 });
sessionSchema.index({ lastAccessedAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
sessionSchema.index({ ipAddress: 1, createdAt: -1 });

// Virtual for session age
sessionSchema.virtual('ageInMinutes').get(function(this: ISession) {
  const now = new Date();
  const diffMs = now.getTime() - this.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60));
});

// Virtual for time until expiry
sessionSchema.virtual('minutesUntilExpiry').get(function(this: ISession) {
  const now = new Date();
  const diffMs = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
});

// Virtual for session status
sessionSchema.virtual('status').get(function(this: ISession) {
  if (!this.isActive) return 'inactive';
  if (this.expiresAt < new Date()) return 'expired';
  if (this.isAuthenticated) return 'authenticated';
  return 'anonymous';
});

// Pre-save middleware
sessionSchema.pre('save', function(this: ISession, next) {
  // Update last accessed time
  this.lastAccessedAt = new Date();
  
  // Set default expiry (24 hours for authenticated, 1 hour for anonymous)
  if (!this.expiresAt) {
    const hours = this.isAuthenticated ? 24 : 1;
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  
  next();
});

// Instance methods
sessionSchema.methods.extend = function(this: ISession, hours: number = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

sessionSchema.methods.authenticate = function(this: ISession, userId: string) {
  this.user = new mongoose.Types.ObjectId(userId);
  this.isAuthenticated = true;
  // Extend session for authenticated users
  this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.save();
};

sessionSchema.methods.logout = function(this: ISession) {
  this.isAuthenticated = false;
  this.user = undefined;
  this.data = {}; // Clear session data
  return this.save();
};

sessionSchema.methods.destroy = function(this: ISession) {
  this.isActive = false;
  return this.save();
};

sessionSchema.methods.updateData = function(this: ISession, key: string, value: any) {
  this.data[key] = value;
  this.markModified('data');
  return this.save();
};

sessionSchema.methods.getData = function(this: ISession, key: string) {
  return this.data[key];
};

sessionSchema.methods.clearData = function(this: ISession, key?: string) {
  if (key) {
    delete this.data[key];
  } else {
    this.data = {};
  }
  this.markModified('data');
  return this.save();
};

// Static methods
sessionSchema.statics.findBySessionId = function(sessionId: string) {
  return this.findOne({ 
    sessionId, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

sessionSchema.statics.findByUser = function(userId: string) {
  return this.find({ 
    user: userId, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastAccessedAt: -1 });
};

sessionSchema.statics.createSession = async function(sessionId: string, options: Partial<ISession> = {}) {
  const session = new this({
    sessionId,
    ...options,
    isActive: true
  });
  
  return session.save();
};

sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false }
    ]
  });
};

sessionSchema.statics.getActiveSessionCount = function(userId?: string) {
  const query: any = { 
    isActive: true,
    expiresAt: { $gt: new Date() }
  };
  
  if (userId) {
    query.user = userId;
  }
  
  return this.countDocuments(query);
};

sessionSchema.statics.getSessionStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        activeSessions: {
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $eq: ['$isActive', true] },
                  { $gt: ['$expiresAt', new Date()] }
                ]
              }, 
              1, 
              0
            ]
          }
        },
        authenticatedSessions: {
          $sum: { $cond: ['$isAuthenticated', 1, 0] }
        },
        averageSessionDuration: {
          $avg: {
            $divide: [
              { $subtract: ['$lastAccessedAt', '$createdAt'] },
              1000 * 60 // Convert to minutes
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalSessions: 0,
    activeSessions: 0,
    authenticatedSessions: 0,
    averageSessionDuration: 0
  };
};

const Session = mongoose.model<ISession>('sessions', sessionSchema);

export default Session;
