import mongoose from "mongoose";
import validator from "validator";

// Interface for User document
export interface IUser extends mongoose.Document {
  // Basic Information
  name: string;
  email: string;
  password?: string; // Optional for OAuth users
  role: "user" | "admin" | "customer";

  // Profile Information
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  gender?: "male" | "female" | "other";
  avatar?: string;

  // Authentication
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // Google OAuth
  googleId?: string;
  isGoogleUser: boolean;

  provider?: "google" | "facebook" | "apple";

  // Account Status
  isActive: boolean;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;

  // Customer Specific
  customerPreferences?: {
    newsletter: boolean;
    smsNotifications: boolean;
    emailNotifications: boolean;
    language: string;
    currency: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  isLocked: boolean;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    // Basic Information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return !this.isGoogleUser; // Password required only for non-Google users
      },
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      required: true,
      default: "customer",
      enum: ["user", "admin", "customer"],
    },

    // Profile Information
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (v: string) {
          return !v || validator.isMobilePhone(v);
        },
        message: "Please provide a valid phone number",
      },
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: function (v: Date) {
          return !v || v < new Date();
        },
        message: "Date of birth cannot be in the future",
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    avatar: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || validator.isURL(v);
        },
        message: "Avatar must be a valid URL",
      },
    },

    // Authentication
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Google OAuth
    googleId: {
      type: String,
      sparse: true, // Allows multiple null values but unique non-null values
      index: true,
    },
    isGoogleUser: {
      type: Boolean,
      default: false,
    },
    provider: {
      type: String,
      enum: ["google", "facebook", "apple"],
      required: function (this: IUser) {
        return this.isGoogleUser; // Provider required only for OAuth users
      },
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    // Customer Specific
    customerPreferences: {
      newsletter: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      language: {
        type: String,
        default: "en",
        enum: ["en", "vi", "fr", "es", "de"],
      },
      currency: {
        type: String,
        default: "USD",
        enum: ["USD", "VND", "EUR", "GBP"],
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.emailVerificationToken;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual for full name
userSchema.virtual("fullName").get(function (this: IUser) {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.name;
});

// Virtual for account lock status
userSchema.virtual("isLocked").get(function (this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Pre-save middleware
userSchema.pre("save", function (this: IUser, next) {
  // Set email verification for Google users
  if (this.isGoogleUser && !this.isEmailVerified) {
    this.isEmailVerified = true;
  }

  // Update name from firstName and lastName if available
  if (this.firstName && this.lastName && !this.name) {
    this.name = `${this.firstName} ${this.lastName}`;
  }

  next();
});

// Instance methods
userSchema.methods.incrementLoginAttempts = function (this: IUser) {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1,
      },
      $unset: {
        lockUntil: 1,
      },
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function (this: IUser) {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1,
    },
  });
};

const User = mongoose.model<IUser>("users", userSchema);

export default User;
