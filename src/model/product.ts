import mongoose from "mongoose";
import validator from "validator";

// Interface for Product document
export interface IProduct extends mongoose.Document {
  // Basic Information
  name: string;
  description: string;
  shortDescription?: string;
  sku: string; // Stock Keeping Unit
  barcode?: string;

  // Pricing
  price: number;
  compareAtPrice?: number; // Original price for discounts
  costPrice?: number; // Cost to business

  // Inventory
  inventory: {
    quantity: number;
    lowStockThreshold: number;
    trackQuantity: boolean;
    allowBackorder: boolean;
  };

  // Categories and Organization
  categories: mongoose.Types.ObjectId[];
  tags: string[];
  brand?: string;
  vendor?: string;

  // Media
  images: {
    url: string;
    alt?: string;
    isPrimary: boolean;
  }[];
  videos?: {
    url: string;
    title?: string;
    thumbnail?: string;
  }[];

  // Physical Properties
  weight?: number; // in grams
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: "cm" | "in";
  };

  // SEO and Marketing
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string[];

  // Product Status
  status: "active" | "inactive" | "draft" | "archived";
  isDigital: boolean;
  isFeatured: boolean;

  // Shipping
  requiresShipping: boolean;
  shippingClass?: string;

  // Variants (for products with different sizes, colors, etc.)
  hasVariants: boolean;
  variants?: {
    name: string;
    sku: string;
    price: number;
    inventory: number;
    attributes: {
      name: string;
      value: string;
    }[];
  }[];

  // Reviews and Ratings
  averageRating: number;
  reviewCount: number;

  // Analytics
  viewCount: number;
  purchaseCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const productSchema = new mongoose.Schema<IProduct>(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Product name cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    barcode: {
      type: String,
      sparse: true,
      index: true,
    },

    // Pricing
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      index: true,
    },
    compareAtPrice: {
      type: Number,
      min: [0, "Compare at price cannot be negative"],
      validate: {
        validator: function (this: IProduct, value: number) {
          return !value || value >= this.price;
        },
        message: "Compare at price must be greater than or equal to price",
      },
    },
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },

    // Inventory
    inventory: {
      quantity: {
        type: Number,
        required: true,
        min: [0, "Quantity cannot be negative"],
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
        min: [0, "Low stock threshold cannot be negative"],
      },
      trackQuantity: {
        type: Boolean,
        default: true,
      },
      allowBackorder: {
        type: Boolean,
        default: false,
      },
    },

    // Categories and Organization
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "categories",
        required: true,
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    brand: {
      type: String,
      trim: true,
      maxlength: [100, "Brand name cannot exceed 100 characters"],
      index: true,
    },
    vendor: {
      type: String,
      trim: true,
      maxlength: [100, "Vendor name cannot exceed 100 characters"],
    },

    // Media
    images: [
      {
        url: {
          type: String,
          required: true,
          validate: [validator.isURL, "Please provide a valid image URL"],
        },
        alt: {
          type: String,
          maxlength: [200, "Alt text cannot exceed 200 characters"],
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    videos: [
      {
        url: {
          type: String,
          validate: [validator.isURL, "Please provide a valid video URL"],
        },
        title: {
          type: String,
          maxlength: [200, "Video title cannot exceed 200 characters"],
        },
        thumbnail: {
          type: String,
          validate: [validator.isURL, "Please provide a valid thumbnail URL"],
        },
      },
    ],

    // Physical Properties
    weight: {
      type: Number,
      min: [0, "Weight cannot be negative"],
    },
    dimensions: {
      length: {
        type: Number,
        min: [0, "Length cannot be negative"],
      },
      width: {
        type: Number,
        min: [0, "Width cannot be negative"],
      },
      height: {
        type: Number,
        min: [0, "Height cannot be negative"],
      },
      unit: {
        type: String,
        enum: ["cm", "in"],
        default: "cm",
      },
    },

    // SEO and Marketing
    seoTitle: {
      type: String,
      maxlength: [60, "SEO title cannot exceed 60 characters"],
    },
    seoDescription: {
      type: String,
      maxlength: [160, "SEO description cannot exceed 160 characters"],
    },
    metaKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Product Status
    status: {
      type: String,
      enum: ["active", "inactive", "draft", "archived"],
      default: "draft",
      index: true,
    },
    isDigital: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Shipping
    requiresShipping: {
      type: Boolean,
      default: true,
    },
    shippingClass: {
      type: String,
      trim: true,
    },

    // Variants
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        sku: {
          type: String,
          required: true,
          uppercase: true,
          trim: true,
        },
        price: {
          type: Number,
          required: true,
          min: [0, "Variant price cannot be negative"],
        },
        inventory: {
          type: Number,
          required: true,
          min: [0, "Variant inventory cannot be negative"],
        },
        attributes: [
          {
            name: {
              type: String,
              required: true,
              trim: true,
            },
            value: {
              type: String,
              required: true,
              trim: true,
            },
          },
        ],
      },
    ],

    // Reviews and Ratings
    averageRating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: [0, "Review count cannot be negative"],
    },

    // Analytics
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "View count cannot be negative"],
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: [0, "Purchase count cannot be negative"],
    },

    publishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
productSchema.index({
  name: "text",
  description: "text",
  shortDescription: "text",
}); // Text search
productSchema.index({ sku: 1 });
productSchema.index({ price: 1 });
productSchema.index({ status: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ publishedAt: -1 });
productSchema.index({ averageRating: -1 });
productSchema.index({ purchaseCount: -1 });
productSchema.index({ viewCount: -1 });

// Compound indexes
productSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
productSchema.index({ categories: 1, status: 1, price: 1 });

// Virtual for discount percentage
productSchema.virtual("discountPercentage").get(function (this: IProduct) {
  if (this.compareAtPrice && this.compareAtPrice > this.price) {
    return Math.round(
      ((this.compareAtPrice - this.price) / this.compareAtPrice) * 100
    );
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual("stockStatus").get(function (this: IProduct) {
  if (!this.inventory.trackQuantity) return "in_stock";
  if (this.inventory.quantity <= 0) {
    return this.inventory.allowBackorder ? "backorder" : "out_of_stock";
  }
  if (this.inventory.quantity <= this.inventory.lowStockThreshold) {
    return "low_stock";
  }
  return "in_stock";
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function (this: IProduct) {
  const primary = this.images.find((img) => img.isPrimary);
  return primary || this.images[0] || null;
});

// Virtual for URL slug
productSchema.virtual("slug").get(function (this: IProduct) {
  return this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
});

// Pre-save middleware
productSchema.pre("save", function (this: IProduct, next) {
  // Ensure only one primary image
  if (this.images && this.images.length > 0) {
    const primaryImages = this.images.filter((img) => img.isPrimary);
    if (primaryImages.length === 0) {
      this.images[0].isPrimary = true;
    } else if (primaryImages.length > 1) {
      this.images.forEach((img, index) => {
        img.isPrimary = index === 0;
      });
    }
  }

  // Set published date when status changes to active
  if (this.status === "active" && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Generate SEO fields if not provided
  if (!this.seoTitle) {
    this.seoTitle = this.name.substring(0, 60);
  }
  if (!this.seoDescription && this.shortDescription) {
    this.seoDescription = this.shortDescription.substring(0, 160);
  }

  next();
});

// Instance methods
productSchema.methods.incrementViewCount = function (this: IProduct) {
  return this.updateOne({ $inc: { viewCount: 1 } });
};

productSchema.methods.incrementPurchaseCount = function (
  this: IProduct,
  quantity: number = 1
) {
  return this.updateOne({ $inc: { purchaseCount: quantity } });
};

productSchema.methods.updateInventory = function (
  this: IProduct,
  quantity: number
) {
  if (this.inventory.trackQuantity) {
    return this.updateOne({
      $inc: { "inventory.quantity": -quantity },
    });
  }
  return Promise.resolve();
};

productSchema.methods.updateRating = function (
  this: IProduct,
  newRating: number,
  isNewReview: boolean = true
) {
  const totalRating = this.averageRating * this.reviewCount;
  const newReviewCount = isNewReview ? this.reviewCount + 1 : this.reviewCount;
  const newAverageRating = (totalRating + newRating) / newReviewCount;

  return this.updateOne({
    averageRating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal
    reviewCount: newReviewCount,
  });
};

// Static methods
productSchema.statics.findByCategory = function (categoryId: string) {
  return this.find({
    categories: categoryId,
    status: "active",
  }).populate("categories");
};

productSchema.statics.findFeatured = function (limit: number = 10) {
  return this.find({
    status: "active",
    isFeatured: true,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

productSchema.statics.searchProducts = function (
  query: string,
  filters: any = {}
) {
  const searchQuery = {
    $text: { $search: query },
    status: "active",
    ...filters,
  };

  return this.find(searchQuery, { score: { $meta: "textScore" } }).sort({
    score: { $meta: "textScore" },
  });
};

const Product = mongoose.model<IProduct>("products", productSchema);

export default Product;
