import mongoose from "mongoose";

// Interface for OAuth Token document
export interface IOAuthToken extends mongoose.Document {
  // Token Identification
  user: mongoose.Types.ObjectId;
  provider: 'google' | 'facebook' | 'twitter' | 'github' | 'apple';
  providerId: string; // User ID from the OAuth provider
  
  // Token Information
  accessToken: string;
  refreshToken?: string;
  tokenType: string; // Usually 'Bearer'
  scope?: string[];
  
  // Token Metadata
  expiresAt?: Date;
  issuedAt: Date;
  
  // Provider User Information
  providerUserInfo: {
    id: string;
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    locale?: string;
    verified?: boolean;
  };
  
  // Token Status
  isActive: boolean;
  isRevoked: boolean;
  
  // Usage Tracking
  lastUsedAt?: Date;
  usageCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const oauthTokenSchema = new mongoose.Schema<IOAuthToken>({
  // Token Identification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['google', 'facebook', 'twitter', 'github', 'apple'],
    index: true
  },
  providerId: {
    type: String,
    required: true,
    index: true
  },
  
  // Token Information
  accessToken: {
    type: String,
    required: true,
    select: false // Don't include in queries by default for security
  },
  refreshToken: {
    type: String,
    select: false // Don't include in queries by default for security
  },
  tokenType: {
    type: String,
    default: 'Bearer'
  },
  scope: [{
    type: String,
    trim: true
  }],
  
  // Token Metadata
  expiresAt: {
    type: Date,
    index: true
  },
  issuedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Provider User Information
  providerUserInfo: {
    id: {
      type: String,
      required: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      validate: {
        validator: function(v: string) {
          if (!v) return true;
          try {
            new URL(v);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Avatar must be a valid URL'
      }
    },
    locale: String,
    verified: {
      type: Boolean,
      default: false
    }
  },
  
  // Token Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Usage Tracking
  lastUsedAt: {
    type: Date,
    index: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.accessToken;
      delete ret.refreshToken;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
oauthTokenSchema.index({ user: 1, provider: 1 }, { unique: true });
oauthTokenSchema.index({ provider: 1, providerId: 1 }, { unique: true });
oauthTokenSchema.index({ isActive: 1, isRevoked: 1 });
oauthTokenSchema.index({ expiresAt: 1 });
oauthTokenSchema.index({ lastUsedAt: -1 });
oauthTokenSchema.index({ createdAt: -1 });

// Compound indexes
oauthTokenSchema.index({ user: 1, isActive: 1, isRevoked: 1 });
oauthTokenSchema.index({ provider: 1, isActive: 1, expiresAt: 1 });

// Virtual for token status
oauthTokenSchema.virtual('status').get(function(this: IOAuthToken) {
  if (this.isRevoked) return 'revoked';
  if (!this.isActive) return 'inactive';
  if (this.expiresAt && this.expiresAt < new Date()) return 'expired';
  return 'active';
});

// Virtual for time until expiry
oauthTokenSchema.virtual('minutesUntilExpiry').get(function(this: IOAuthToken) {
  if (!this.expiresAt) return null;
  const now = new Date();
  const diffMs = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60)));
});

// Virtual for provider display name
oauthTokenSchema.virtual('providerDisplayName').get(function(this: IOAuthToken) {
  const displayNames = {
    google: 'Google',
    facebook: 'Facebook',
    twitter: 'Twitter',
    github: 'GitHub',
    apple: 'Apple'
  };
  return displayNames[this.provider] || this.provider;
});

// Pre-save middleware
oauthTokenSchema.pre('save', function(this: IOAuthToken, next) {
  // Update last used time when token is accessed
  if (this.isModified('usageCount')) {
    this.lastUsedAt = new Date();
  }
  
  // Encrypt tokens if needed (in production, you should encrypt these)
  // if (this.isModified('accessToken')) {
  //   this.accessToken = encrypt(this.accessToken);
  // }
  // if (this.isModified('refreshToken') && this.refreshToken) {
  //   this.refreshToken = encrypt(this.refreshToken);
  // }
  
  next();
});

// Instance methods
oauthTokenSchema.methods.isExpired = function(this: IOAuthToken) {
  return this.expiresAt && this.expiresAt < new Date();
};

oauthTokenSchema.methods.isValid = function(this: IOAuthToken) {
  return this.isActive && !this.isRevoked && !this.isExpired();
};

oauthTokenSchema.methods.revoke = function(this: IOAuthToken) {
  this.isRevoked = true;
  this.isActive = false;
  return this.save();
};

oauthTokenSchema.methods.refresh = function(this: IOAuthToken, newAccessToken: string, newRefreshToken?: string, expiresIn?: number) {
  this.accessToken = newAccessToken;
  if (newRefreshToken) {
    this.refreshToken = newRefreshToken;
  }
  if (expiresIn) {
    this.expiresAt = new Date(Date.now() + expiresIn * 1000);
  }
  this.issuedAt = new Date();
  return this.save();
};

oauthTokenSchema.methods.incrementUsage = function(this: IOAuthToken) {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

oauthTokenSchema.methods.updateProviderInfo = function(this: IOAuthToken, userInfo: Partial<IOAuthToken['providerUserInfo']>) {
  this.providerUserInfo = { ...this.providerUserInfo, ...userInfo };
  this.markModified('providerUserInfo');
  return this.save();
};

// Static methods
oauthTokenSchema.statics.findByUser = function(userId: string, provider?: string) {
  const query: any = { 
    user: userId, 
    isActive: true, 
    isRevoked: false 
  };
  
  if (provider) {
    query.provider = provider;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

oauthTokenSchema.statics.findByProvider = function(provider: string, providerId: string) {
  return this.findOne({ 
    provider, 
    providerId,
    isActive: true,
    isRevoked: false
  });
};

oauthTokenSchema.statics.createOrUpdate = async function(
  userId: string, 
  provider: string, 
  tokenData: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string[];
    providerUserInfo: IOAuthToken['providerUserInfo'];
  }
) {
  const existingToken = await this.findOne({ 
    user: userId, 
    provider 
  });
  
  const tokenDoc = {
    user: userId,
    provider,
    providerId: tokenData.providerUserInfo.id,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    scope: tokenData.scope,
    expiresAt: tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : undefined,
    providerUserInfo: tokenData.providerUserInfo,
    isActive: true,
    isRevoked: false,
    issuedAt: new Date()
  };
  
  if (existingToken) {
    Object.assign(existingToken, tokenDoc);
    return existingToken.save();
  } else {
    return this.create(tokenDoc);
  }
};

oauthTokenSchema.statics.revokeByUser = function(userId: string, provider?: string) {
  const query: any = { user: userId };
  if (provider) {
    query.provider = provider;
  }
  
  return this.updateMany(query, { 
    isRevoked: true, 
    isActive: false 
  });
};

oauthTokenSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    { 
      expiresAt: { $lt: new Date() },
      isActive: true
    },
    { 
      isActive: false 
    }
  );
};

oauthTokenSchema.statics.getTokenStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$provider',
        totalTokens: { $sum: 1 },
        activeTokens: {
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $eq: ['$isActive', true] },
                  { $eq: ['$isRevoked', false] }
                ]
              }, 
              1, 
              0
            ]
          }
        },
        expiredTokens: {
          $sum: { 
            $cond: [
              { $lt: ['$expiresAt', new Date()] }, 
              1, 
              0
            ]
          }
        },
        averageUsage: { $avg: '$usageCount' }
      }
    },
    { $sort: { totalTokens: -1 } }
  ]);
  
  return stats;
};

const OAuthToken = mongoose.model<IOAuthToken>('oauth_tokens', oauthTokenSchema);

export default OAuthToken;
