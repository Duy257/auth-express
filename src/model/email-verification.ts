import mongoose from "mongoose";
import crypto from "crypto";

// Interface for Email Verification document
export interface IEmailVerification extends mongoose.Document {
  // Verification Identification
  user: mongoose.Types.ObjectId;
  email: string;
  token: string;
  
  // Verification Type
  type: 'registration' | 'email_change' | 'password_reset' | 'login_verification';
  
  // Verification Status
  isUsed: boolean;
  isExpired: boolean;
  
  // Attempt Tracking
  attempts: number;
  maxAttempts: number;
  
  // IP and Security
  ipAddress?: string;
  userAgent?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  verifiedAt?: Date;
}

const emailVerificationSchema = new mongoose.Schema<IEmailVerification>({
  // Verification Identification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    },
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Verification Type
  type: {
    type: String,
    required: true,
    enum: ['registration', 'email_change', 'password_reset', 'login_verification'],
    index: true
  },
  
  // Verification Status
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  isExpired: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Attempt Tracking
  attempts: {
    type: Number,
    default: 0,
    min: [0, 'Attempts cannot be negative']
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: [1, 'Max attempts must be at least 1']
  },
  
  // IP and Security
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
    }
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  // Timestamps
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  },
  verifiedAt: Date
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.token; // Never expose token in JSON
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
emailVerificationSchema.index({ token: 1 });
emailVerificationSchema.index({ user: 1, type: 1 });
emailVerificationSchema.index({ email: 1, type: 1 });
emailVerificationSchema.index({ isUsed: 1, isExpired: 1 });
emailVerificationSchema.index({ createdAt: -1 });
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Compound indexes
emailVerificationSchema.index({ user: 1, type: 1, isUsed: 1 });
emailVerificationSchema.index({ email: 1, isUsed: 1, isExpired: 1 });

// Virtual for verification status
emailVerificationSchema.virtual('status').get(function(this: IEmailVerification) {
  if (this.isUsed) return 'used';
  if (this.isExpired || this.expiresAt < new Date()) return 'expired';
  if (this.attempts >= this.maxAttempts) return 'max_attempts_reached';
  return 'active';
});

// Virtual for time until expiry
emailVerificationSchema.virtual('minutesUntilExpiry').get(function(this: IEmailVerification) {
  const now = new Date();
  const diffMs = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
});

// Virtual for remaining attempts
emailVerificationSchema.virtual('remainingAttempts').get(function(this: IEmailVerification) {
  return Math.max(0, this.maxAttempts - this.attempts);
});

// Pre-save middleware
emailVerificationSchema.pre('save', function(this: IEmailVerification, next) {
  // Generate token if not provided
  if (!this.token) {
    this.token = crypto.randomBytes(32).toString('hex');
  }
  
  // Set default expiry based on type
  if (!this.expiresAt) {
    const expiryHours = {
      registration: 24,
      email_change: 2,
      password_reset: 1,
      login_verification: 0.5
    };
    
    const hours = expiryHours[this.type] || 24;
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  
  // Check if expired
  if (this.expiresAt < new Date()) {
    this.isExpired = true;
  }
  
  next();
});

// Instance methods
emailVerificationSchema.methods.isValid = function(this: IEmailVerification) {
  return !this.isUsed && 
         !this.isExpired && 
         this.expiresAt > new Date() && 
         this.attempts < this.maxAttempts;
};

emailVerificationSchema.methods.verify = function(this: IEmailVerification, providedToken: string) {
  // Check if verification is still valid
  if (!this.isValid()) {
    throw new Error('Verification token is no longer valid');
  }
  
  // Increment attempts
  this.attempts += 1;
  
  // Check if token matches
  if (this.token !== providedToken) {
    if (this.attempts >= this.maxAttempts) {
      this.isExpired = true;
    }
    return this.save().then(() => false);
  }
  
  // Mark as used and verified
  this.isUsed = true;
  this.verifiedAt = new Date();
  
  return this.save().then(() => true);
};

emailVerificationSchema.methods.expire = function(this: IEmailVerification) {
  this.isExpired = true;
  return this.save();
};

emailVerificationSchema.methods.regenerateToken = function(this: IEmailVerification) {
  if (this.isUsed) {
    throw new Error('Cannot regenerate token for used verification');
  }
  
  this.token = crypto.randomBytes(32).toString('hex');
  this.attempts = 0;
  this.isExpired = false;
  
  // Extend expiry
  const expiryHours = {
    registration: 24,
    email_change: 2,
    password_reset: 1,
    login_verification: 0.5
  };
  
  const hours = expiryHours[this.type] || 24;
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  
  return this.save();
};

// Static methods
emailVerificationSchema.statics.findByToken = function(token: string) {
  return this.findOne({ 
    token,
    isUsed: false,
    isExpired: false,
    expiresAt: { $gt: new Date() }
  });
};

emailVerificationSchema.statics.findByUser = function(userId: string, type?: string) {
  const query: any = { 
    user: userId,
    isUsed: false,
    isExpired: false,
    expiresAt: { $gt: new Date() }
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

emailVerificationSchema.statics.findByEmail = function(email: string, type?: string) {
  const query: any = { 
    email: email.toLowerCase(),
    isUsed: false,
    isExpired: false,
    expiresAt: { $gt: new Date() }
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

emailVerificationSchema.statics.createVerification = async function(
  userId: string,
  email: string,
  type: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    expiryHours?: number;
    maxAttempts?: number;
  } = {}
) {
  // Expire any existing verifications of the same type for this user
  await this.updateMany(
    { user: userId, type, isUsed: false },
    { isExpired: true }
  );
  
  const verification = new this({
    user: userId,
    email: email.toLowerCase(),
    type,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
    metadata: options.metadata,
    maxAttempts: options.maxAttempts || 3
  });
  
  if (options.expiryHours) {
    verification.expiresAt = new Date(Date.now() + options.expiryHours * 60 * 60 * 1000);
  }
  
  return verification.save();
};

emailVerificationSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    { 
      $or: [
        { expiresAt: { $lt: new Date() } },
        { isExpired: true }
      ],
      isUsed: false
    },
    { isExpired: true }
  );
};

emailVerificationSchema.statics.getVerificationStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        totalVerifications: { $sum: 1 },
        usedVerifications: {
          $sum: { $cond: ['$isUsed', 1, 0] }
        },
        expiredVerifications: {
          $sum: { $cond: ['$isExpired', 1, 0] }
        },
        averageAttempts: { $avg: '$attempts' }
      }
    },
    {
      $project: {
        type: '$_id',
        totalVerifications: 1,
        usedVerifications: 1,
        expiredVerifications: 1,
        averageAttempts: { $round: ['$averageAttempts', 2] },
        successRate: {
          $round: [
            {
              $multiply: [
                { $divide: ['$usedVerifications', '$totalVerifications'] },
                100
              ]
            },
            2
          ]
        }
      }
    },
    { $sort: { totalVerifications: -1 } }
  ]);
  
  return stats;
};

const EmailVerification = mongoose.model<IEmailVerification>('email_verifications', emailVerificationSchema);

export default EmailVerification;
