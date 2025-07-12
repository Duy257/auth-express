import mongoose from "mongoose";

// Interface for Order Item
export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productName: string; // Store product name at time of order
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productImage?: string;
  productVariant?: {
    name: string;
    attributes: {
      name: string;
      value: string;
    }[];
  };
}

// Interface for Order document
export interface IOrder extends mongoose.Document {
  // Order Identification
  orderNumber: string;
  customer: mongoose.Types.ObjectId;

  // Order Items
  items: IOrderItem[];

  // Pricing
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;

  // Status
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";
  paymentStatus:
    | "pending"
    | "paid"
    | "failed"
    | "refunded"
    | "partially_refunded";
  fulfillmentStatus: "unfulfilled" | "partial" | "fulfilled";

  // Addresses
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
  };

  // Shipping
  shippingMethod?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;

  // Payment
  paymentMethod?: string;
  paymentReference?: string;

  // Customer Information
  customerEmail: string;
  customerPhone?: string;

  // Notes and Communication
  notes?: string;
  customerNotes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

const orderItemSchema = new mongoose.Schema<IOrderItem>(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "products",
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productSku: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, "Unit price cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, "Total price cannot be negative"],
    },
    productImage: String,
    productVariant: {
      name: String,
      attributes: [
        {
          name: {
            type: String,
            required: true,
          },
          value: {
            type: String,
            required: true,
          },
        },
      ],
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    company: {
      type: String,
      trim: true,
      maxlength: [100, "Company name cannot exceed 100 characters"],
    },
    address1: {
      type: String,
      required: true,
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
      required: true,
      trim: true,
      maxlength: [100, "City cannot exceed 100 characters"],
    },
    province: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Province cannot exceed 100 characters"],
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Country cannot exceed 100 characters"],
    },
    zip: {
      type: String,
      required: true,
      trim: true,
      maxlength: [20, "ZIP code cannot exceed 20 characters"],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema<IOrder>(
  {
    // Order Identification
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    // Order Items
    items: [orderItemSchema],

    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, "Tax amount cannot be negative"],
    },
    shippingAmount: {
      type: Number,
      default: 0,
      min: [0, "Shipping amount cannot be negative"],
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, "Discount amount cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    // Status
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
      index: true,
    },
    fulfillmentStatus: {
      type: String,
      enum: ["unfulfilled", "partial", "fulfilled"],
      default: "unfulfilled",
      index: true,
    },

    // Addresses
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    billingAddress: {
      type: addressSchema,
      required: true,
    },

    // Shipping
    shippingMethod: String,
    trackingNumber: {
      type: String,
      sparse: true,
      index: true,
    },
    trackingUrl: String,
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,

    // Payment
    paymentMethod: String,
    paymentReference: {
      type: String,
      sparse: true,
      index: true,
    },

    // Customer Information
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerPhone: String,

    // Notes and Communication
    notes: String,
    customerNotes: String,

    // Status Timestamps
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ fulfillmentStatus: 1 });
orderSchema.index({ customerEmail: 1 });
orderSchema.index({ trackingNumber: 1 });
orderSchema.index({ paymentReference: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ totalAmount: -1 });

// Compound indexes
orderSchema.index({ customer: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, paymentStatus: 1, createdAt: -1 });

// Virtual for full customer name
orderSchema.virtual("customerFullName").get(function (this: IOrder) {
  return `${this.shippingAddress.firstName} ${this.shippingAddress.lastName}`;
});

// Virtual for order summary
orderSchema.virtual("itemCount").get(function (this: IOrder) {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Virtual for order weight (if products have weight)
orderSchema.virtual("totalWeight").get(function (this: IOrder) {
  // This would need to be calculated based on product weights
  // For now, return 0 as placeholder
  return 0;
});

// Virtual for order status display
orderSchema.virtual("statusDisplay").get(function (this: IOrder) {
  return this.status.charAt(0).toUpperCase() + this.status.slice(1);
});

// Pre-save middleware
orderSchema.pre("save", function (this: IOrder, next) {
  // Generate order number if not provided
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }

  // Calculate totals
  this.subtotal = this.items.reduce(
    (total, item) => total + item.totalPrice,
    0
  );
  this.totalAmount =
    this.subtotal + this.taxAmount + this.shippingAmount - this.discountAmount;

  // Set status timestamps
  if (this.isModified("status")) {
    const now = new Date();
    switch (this.status) {
      case "confirmed":
        if (!this.confirmedAt) this.confirmedAt = now;
        break;
      case "shipped":
        if (!this.shippedAt) this.shippedAt = now;
        break;
      case "delivered":
        if (!this.deliveredAt) this.deliveredAt = now;
        break;
      case "cancelled":
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
    }
  }

  next();
});

// Instance methods
orderSchema.methods.canBeCancelled = function (this: IOrder) {
  return ["pending", "confirmed"].includes(this.status);
};

orderSchema.methods.canBeRefunded = function (this: IOrder) {
  return ["delivered"].includes(this.status) && this.paymentStatus === "paid";
};

orderSchema.methods.updateStatus = function (
  this: IOrder,
  newStatus: string,
  notes?: string
) {
  this.status = newStatus as any;
  if (notes) {
    this.notes = this.notes ? `${this.notes}\n${notes}` : notes;
  }
  return this.save();
};

orderSchema.methods.addTrackingInfo = function (
  this: IOrder,
  trackingNumber: string,
  trackingUrl?: string
) {
  this.trackingNumber = trackingNumber;
  if (trackingUrl) this.trackingUrl = trackingUrl;
  if (this.status === "processing") {
    this.status = "shipped";
  }
  return this.save();
};

orderSchema.methods.calculateTax = function (
  this: IOrder,
  taxRate: number = 0.1
) {
  this.taxAmount = Math.round(this.subtotal * taxRate * 100) / 100;
  return this.taxAmount;
};

// Static methods
orderSchema.statics.findByCustomer = function (
  customerId: string,
  limit: number = 10
) {
  return this.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("customer", "name email");
};

orderSchema.statics.findByStatus = function (status: string) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .populate("customer", "name email");
};

orderSchema.statics.findByDateRange = function (
  startDate: Date,
  endDate: Date
) {
  return this.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ createdAt: -1 });
};

orderSchema.statics.getOrderStats = async function (
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = {};
  if (startDate && endDate) {
    matchStage.createdAt = { $gte: startDate, $lte: endDate };
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: "$totalAmount" },
        averageOrderValue: { $avg: "$totalAmount" },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    }
  );
};

const Order = mongoose.model<IOrder>("orders", orderSchema);

export default Order;
