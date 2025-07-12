import mongoose from "mongoose";
import validator from "validator";

// Interface for Category document
export interface ICategory extends mongoose.Document {
  // Basic Information
  name: string;
  description?: string;
  slug: string;

  // Hierarchy
  parent?: mongoose.Types.ObjectId;
  level: number;
  path: string; // Full path like "electronics/computers/laptops"

  // Display
  image?: string;
  icon?: string;
  color?: string;

  // SEO
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string[];

  // Status
  isActive: boolean;
  isVisible: boolean;
  sortOrder: number;

  // Analytics
  productCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new mongoose.Schema<ICategory>(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
      index: true,
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Hierarchy
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "categories",
      default: null,
      index: true,
    },
    level: {
      type: Number,
      default: 0,
      min: [0, "Level cannot be negative"],
      max: [5, "Maximum category depth is 5 levels"],
      index: true,
    },
    path: {
      type: String,
      required: true,
      index: true,
    },

    // Display
    image: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || validator.isURL(v);
        },
        message: "Image must be a valid URL",
      },
    },
    icon: {
      type: String,
      maxlength: [50, "Icon name cannot exceed 50 characters"],
    },
    color: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Color must be a valid hex color code",
      },
    },

    // SEO
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

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },

    // Analytics
    productCount: {
      type: Number,
      default: 0,
      min: [0, "Product count cannot be negative"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
categorySchema.index({ name: "text", description: "text" });
categorySchema.index({ parent: 1, sortOrder: 1 });
categorySchema.index({ level: 1, sortOrder: 1 });
categorySchema.index({ isActive: 1, isVisible: 1, sortOrder: 1 });
categorySchema.index({ path: 1 });

// Virtual for children categories
categorySchema.virtual("children", {
  ref: "categories",
  localField: "_id",
  foreignField: "parent",
});

// Virtual for breadcrumb
categorySchema.virtual("breadcrumb").get(function (this: ICategory) {
  return this.path.split("/").filter(Boolean);
});

// Pre-save middleware
categorySchema.pre("save", async function (this: ICategory, next) {
  // Generate slug from name if not provided
  if (!this.slug || this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Ensure slug uniqueness
    const existingCategory = await mongoose.model("categories").findOne({
      slug: this.slug,
      _id: { $ne: this._id },
    });
    if (existingCategory) {
      this.slug = `${this.slug}-${Date.now()}`;
    }
  }

  // Calculate level and path based on parent
  if (this.parent) {
    const parent = await mongoose.model("categories").findById(this.parent);
    if (parent) {
      this.level = (parent as any).level + 1;
      this.path = `${(parent as any).path}/${this.slug}`;
    }
  } else {
    this.level = 0;
    this.path = this.slug;
  }

  // Generate SEO fields if not provided
  if (!this.seoTitle) {
    this.seoTitle = this.name.substring(0, 60);
  }
  if (!this.seoDescription && this.description) {
    this.seoDescription = this.description.substring(0, 160);
  }

  next();
});

// Pre-remove middleware to handle cascading deletes
categorySchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (this: ICategory, next) {
    // Move children to parent or root level
    await mongoose
      .model("categories")
      .updateMany({ parent: this._id }, { parent: this.parent || null });

    next();
  }
);

// Instance methods
categorySchema.methods.getAncestors = async function (this: ICategory) {
  const ancestors = [];
  let current = this;

  while (current.parent) {
    const parent = await mongoose.model("categories").findById(current.parent);
    if (parent) {
      ancestors.unshift(parent);
      current = parent as any;
    } else {
      break;
    }
  }

  return ancestors;
};

categorySchema.methods.getDescendants = async function (this: ICategory) {
  const descendants = await mongoose.model("categories").find({
    path: new RegExp(`^${this.path}/`),
  });
  return descendants;
};

categorySchema.methods.updateProductCount = async function (this: ICategory) {
  const Product = mongoose.model("products");
  const count = await Product.countDocuments({
    categories: this._id,
    status: "active",
  });

  return this.updateOne({ productCount: count });
};

// Static methods
categorySchema.statics.findRootCategories = function () {
  return this.find({
    parent: null,
    isActive: true,
    isVisible: true,
  }).sort({ sortOrder: 1, name: 1 });
};

categorySchema.statics.findByLevel = function (level: number) {
  return this.find({
    level,
    isActive: true,
    isVisible: true,
  }).sort({ sortOrder: 1, name: 1 });
};

categorySchema.statics.buildTree = async function () {
  const categories = await this.find({
    isActive: true,
    isVisible: true,
  }).sort({ level: 1, sortOrder: 1, name: 1 });

  const categoryMap = new Map();
  const tree = [];

  // Create map of categories
  categories.forEach((category) => {
    categoryMap.set(category._id.toString(), {
      ...category.toObject(),
      children: [],
    });
  });

  // Build tree structure
  categories.forEach((category) => {
    const categoryObj = categoryMap.get(category._id.toString());
    if (category.parent) {
      const parent = categoryMap.get(category.parent.toString());
      if (parent) {
        parent.children.push(categoryObj);
      }
    } else {
      tree.push(categoryObj);
    }
  });

  return tree;
};

const Category = mongoose.model<ICategory>("categories", categorySchema);

export default Category;
