import mongoose from "mongoose";
import validator from "validator";

// Interface for Address document
export interface IAddress extends mongoose.Document {
  // Address Identification
  user: mongoose.Types.ObjectId;

  // Address Type
  type: "shipping" | "billing" | "both";

  // Personal Information
  firstName: string;
  lastName: string;
  company?: string;

  // Address Information
  address1: string;
  address2?: string;
  city: string;
  province: string; // State/Province
  country: string;
  zip: string; // Postal/ZIP code

  // Contact Information
  phone?: string;
  email?: string;

  // Address Status
  isDefault: boolean;
  isActive: boolean;

  // Validation Status
  isValidated: boolean;
  validationService?: string; // e.g., 'google', 'usps', 'canada_post'
  validationResponse?: any;

  // Geolocation (optional)
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  // Metadata
  label?: string; // Custom label like "Home", "Office", etc.
  instructions?: string; // Delivery instructions

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

const addressSchema = new mongoose.Schema<IAddress>(
  {
    // Address Identification
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    // Address Type
    type: {
      type: String,
      enum: ["shipping", "billing", "both"],
      default: "both",
      index: true,
    },

    // Personal Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },

    // Address Information
    address1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
      maxlength: [200, "Address line 1 cannot exceed 200 characters"],
    },
    address2: {
      type: String,
      trim: true,
      maxlength: [200, "Address line 2 cannot exceed 200 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
      index: true,
    },
    province: {
      type: String,
      required: [true, "Province/State is required"],
      trim: true,
      maxlength: [100, "Province/State cannot exceed 100 characters"],
      index: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
      uppercase: true,
      maxlength: [3, "Country code cannot exceed 3 characters"],
      minlength: [2, "Country code must be at least 2 characters"],
      index: true,
      validate: {
        validator: function (v: string) {
          // Basic country code validation (ISO 3166-1 alpha-2 or alpha-3)
          return /^[A-Z]{2,3}$/.test(v);
        },
        message: "Country must be a valid ISO country code",
      },
    },
    zip: {
      type: String,
      required: [true, "ZIP/Postal code is required"],
      trim: true,
      uppercase: true,
      maxlength: [20, "ZIP/Postal code cannot exceed 20 characters"],
      index: true,
    },

    // Contact Information
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
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v: string) {
          return !v || validator.isEmail(v);
        },
        message: "Please provide a valid email address",
      },
    },

    // Address Status
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Validation Status
    isValidated: {
      type: Boolean,
      default: false,
      index: true,
    },
    validationService: {
      type: String,
      enum: ["google", "usps", "canada_post", "royal_mail", "australia_post"],
    },
    validationResponse: mongoose.Schema.Types.Mixed,

    // Geolocation (optional)
    coordinates: {
      latitude: {
        type: Number,
        min: [-90, "Latitude must be between -90 and 90"],
        max: [90, "Latitude must be between -90 and 90"],
      },
      longitude: {
        type: Number,
        min: [-180, "Longitude must be between -180 and 180"],
        max: [180, "Longitude must be between -180 and 180"],
      },
    },

    // Metadata
    label: {
      type: String,
      trim: true,
      maxlength: [50, "Label cannot exceed 50 characters"],
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [500, "Instructions cannot exceed 500 characters"],
    },

    // Usage tracking
    lastUsedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
addressSchema.index({ user: 1, type: 1 });
addressSchema.index({ user: 1, isDefault: 1 });
addressSchema.index({ user: 1, isActive: 1 });
addressSchema.index({ country: 1, province: 1, city: 1 });
addressSchema.index({ zip: 1 });
addressSchema.index({ createdAt: -1 });
addressSchema.index({ lastUsedAt: -1 });

// Compound indexes
addressSchema.index({ user: 1, isActive: 1, isDefault: -1 });
addressSchema.index({ user: 1, type: 1, isActive: 1 });

// Virtual for full name
addressSchema.virtual("fullName").get(function (this: IAddress) {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for formatted address
addressSchema.virtual("formattedAddress").get(function (this: IAddress) {
  const parts = [
    this.address1,
    this.address2,
    this.city,
    this.province,
    this.zip,
    this.country,
  ].filter(Boolean);

  return parts.join(", ");
});

// Virtual for single line address
addressSchema.virtual("singleLineAddress").get(function (this: IAddress) {
  const parts = [this.address1];
  if (this.address2) parts.push(this.address2);
  parts.push(`${this.city}, ${this.province} ${this.zip}`);
  parts.push(this.country);

  return parts.join(", ");
});

// Virtual for display label
addressSchema.virtual("displayLabel").get(function (this: IAddress) {
  if (this.label) return this.label;
  if (this.company) return this.company;
  return `${this.city}, ${this.province}`;
});

// Pre-save middleware
addressSchema.pre("save", async function (this: IAddress, next) {
  // Ensure only one default address per type per user
  if (this.isDefault) {
    await mongoose.model("addresses").updateMany(
      {
        user: this.user,
        type: { $in: [this.type, "both"] },
        _id: { $ne: this._id },
      },
      { isDefault: false }
    );
  }

  // Update last used date when address is modified
  if (this.isModified() && !this.isNew) {
    this.lastUsedAt = new Date();
  }

  next();
});

// Pre-remove middleware
addressSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (this: IAddress, next) {
    // If deleting default address, set another address as default
    if (this.isDefault) {
      const nextAddress = await mongoose
        .model("addresses")
        .findOne({
          user: this.user,
          type: { $in: [this.type, "both"] },
          _id: { $ne: this._id },
          isActive: true,
        })
        .sort({ lastUsedAt: -1, createdAt: -1 });

      if (nextAddress) {
        await nextAddress.updateOne({ isDefault: true });
      }
    }

    next();
  }
);

// Instance methods
addressSchema.methods.setAsDefault = async function (this: IAddress) {
  // Remove default status from other addresses
  await mongoose.model("addresses").updateMany(
    {
      user: this.user,
      type: { $in: [this.type, "both"] },
      _id: { $ne: this._id },
    },
    { isDefault: false }
  );

  this.isDefault = true;
  return this.save();
};

addressSchema.methods.markAsUsed = function (this: IAddress) {
  this.lastUsedAt = new Date();
  return this.save();
};

addressSchema.methods.validateAddress = async function (
  this: IAddress,
  service: string = "google"
) {
  // This would integrate with address validation services
  // For now, just mark as validated
  this.isValidated = true;
  this.validationService = service as any;
  this.validationResponse = {
    validated: true,
    validatedAt: new Date(),
    service,
  };

  return this.save();
};

addressSchema.methods.isSameAs = function (
  this: IAddress,
  otherAddress: Partial<IAddress>
) {
  const fieldsToCompare = [
    "address1",
    "address2",
    "city",
    "province",
    "country",
    "zip",
  ];

  return fieldsToCompare.every((field) => {
    const thisValue = (this as any)[field]?.toLowerCase().trim() || "";
    const otherValue = (otherAddress as any)[field]?.toLowerCase().trim() || "";
    return thisValue === otherValue;
  });
};

// Static methods
addressSchema.statics.findByUser = function (userId: string, type?: string) {
  const query: any = { user: userId, isActive: true };
  if (type) {
    query.type = { $in: [type, "both"] };
  }

  return this.find(query).sort({
    isDefault: -1,
    lastUsedAt: -1,
    createdAt: -1,
  });
};

addressSchema.statics.findDefaultAddress = function (
  userId: string,
  type: string = "both"
) {
  return this.findOne({
    user: userId,
    type: { $in: [type, "both"] },
    isDefault: true,
    isActive: true,
  });
};

addressSchema.statics.findOrCreateDefault = async function (
  userId: string,
  addressData: Partial<IAddress>,
  type: string = "both"
) {
  let defaultAddress = await this.findDefaultAddress(userId, type);

  if (!defaultAddress) {
    defaultAddress = new this({
      ...addressData,
      user: userId,
      type,
      isDefault: true,
      isActive: true,
    });
    await defaultAddress.save();
  }

  return defaultAddress;
};

addressSchema.statics.findByLocation = function (
  country: string,
  province?: string,
  city?: string
) {
  const query: any = { country: country.toUpperCase(), isActive: true };

  if (province) {
    query.province = new RegExp(province, "i");
  }

  if (city) {
    query.city = new RegExp(city, "i");
  }

  return this.find(query).sort({ lastUsedAt: -1, createdAt: -1 });
};

addressSchema.statics.findNearby = function (
  latitude: number,
  longitude: number,
  maxDistance: number = 10000
) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance, // in meters
      },
    },
    isActive: true,
  });
};

addressSchema.statics.getAddressStats = async function () {
  const stats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalAddresses: { $sum: 1 },
        validatedAddresses: {
          $sum: { $cond: ["$isValidated", 1, 0] },
        },
        defaultAddresses: {
          $sum: { $cond: ["$isDefault", 1, 0] },
        },
        countryCounts: {
          $push: "$country",
        },
      },
    },
    {
      $project: {
        totalAddresses: 1,
        validatedAddresses: 1,
        defaultAddresses: 1,
        validationRate: {
          $multiply: [
            { $divide: ["$validatedAddresses", "$totalAddresses"] },
            100,
          ],
        },
      },
    },
  ]);

  const countryStats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$country",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  return {
    ...stats[0],
    topCountries: countryStats,
  };
};

// Create geospatial index for location-based queries
addressSchema.index({ coordinates: "2dsphere" });

const Address = mongoose.model<IAddress>("addresses", addressSchema);

export default Address;
