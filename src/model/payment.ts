import mongoose from "mongoose";
import crypto from "crypto";

// Interface for Payment document
export interface IPayment extends mongoose.Document {
  // Payment Identification
  paymentId: string; // Unique payment identifier
  transactionId?: string; // External payment processor transaction ID
  order: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;

  // Payment Details
  amount: number;
  currency: string;

  // Payment Method
  paymentMethod:
    | "credit_card"
    | "debit_card"
    | "paypal"
    | "stripe"
    | "bank_transfer"
    | "cash_on_delivery"
    | "digital_wallet";
  paymentProvider?: string; // e.g., 'stripe', 'paypal', 'square'

  // Payment Status
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "refunded"
    | "partially_refunded";

  // Card Information (encrypted/tokenized)
  cardLast4?: string;
  cardBrand?: string; // visa, mastercard, amex, etc.
  cardToken?: string; // Tokenized card information

  // Payment Gateway Response
  gatewayResponse?: {
    responseCode?: string;
    responseMessage?: string;
    authorizationCode?: string;
    referenceNumber?: string;
    processorResponse?: any; // Raw response from payment processor
  };

  // Billing Information
  billingAddress?: {
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

  // Refund Information
  refunds?: {
    refundId: string;
    amount: number;
    reason?: string;
    status: "pending" | "completed" | "failed";
    processedAt?: Date;
    refundedBy?: mongoose.Types.ObjectId;
  }[];

  // Security and Fraud Prevention
  ipAddress?: string;
  userAgent?: string;
  fraudScore?: number;
  riskLevel?: "low" | "medium" | "high";

  // Metadata
  metadata?: Record<string, any>;
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
}

const billingAddressSchema = new mongoose.Schema(
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

const refundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Refund amount cannot be negative"],
    },
    reason: {
      type: String,
      maxlength: [500, "Refund reason cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    processedAt: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
  },
  { timestamps: true }
);

const paymentSchema = new mongoose.Schema<IPayment>(
  {
    // Payment Identification
    paymentId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    transactionId: {
      type: String,
      sparse: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "orders",
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      index: true,
    },

    // Payment Details
    amount: {
      type: Number,
      required: true,
      min: [0, "Payment amount cannot be negative"],
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      enum: ["USD", "EUR", "GBP", "VND", "JPY", "CAD", "AUD"],
      default: "USD",
    },

    // Payment Method
    paymentMethod: {
      type: String,
      required: true,
      enum: [
        "credit_card",
        "debit_card",
        "paypal",
        "stripe",
        "bank_transfer",
        "cash_on_delivery",
        "digital_wallet",
      ],
      index: true,
    },
    paymentProvider: {
      type: String,
      trim: true,
      lowercase: true,
    },

    // Payment Status
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      index: true,
    },

    // Card Information (encrypted/tokenized)
    cardLast4: {
      type: String,
      maxlength: 4,
      validate: {
        validator: function (v: string) {
          return !v || /^\d{4}$/.test(v);
        },
        message: "Card last 4 digits must be exactly 4 numbers",
      },
    },
    cardBrand: {
      type: String,
      lowercase: true,
      enum: [
        "visa",
        "mastercard",
        "amex",
        "discover",
        "jcb",
        "diners",
        "unionpay",
      ],
    },
    cardToken: {
      type: String,
      select: false, // Don't include in queries by default for security
    },

    // Payment Gateway Response
    gatewayResponse: {
      responseCode: String,
      responseMessage: String,
      authorizationCode: String,
      referenceNumber: String,
      processorResponse: mongoose.Schema.Types.Mixed,
    },

    // Billing Information
    billingAddress: billingAddressSchema,

    // Refund Information
    refunds: [refundSchema],

    // Security and Fraud Prevention
    ipAddress: {
      type: String,
      validate: {
        validator: function (v: string) {
          if (!v) return true;
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex =
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(v) || ipv6Regex.test(v);
        },
        message: "Invalid IP address format",
      },
    },
    userAgent: {
      type: String,
      maxlength: [500, "User agent cannot exceed 500 characters"],
    },
    fraudScore: {
      type: Number,
      min: [0, "Fraud score cannot be negative"],
      max: [100, "Fraud score cannot exceed 100"],
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },

    // Status Timestamps
    processedAt: Date,
    completedAt: Date,
    failedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.cardToken; // Never expose card token in JSON
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes for performance optimization
paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ customer: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ amount: -1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ completedAt: -1 });

// Compound indexes
paymentSchema.index({ customer: 1, status: 1, createdAt: -1 });
paymentSchema.index({ status: 1, paymentMethod: 1, createdAt: -1 });

// Virtual for total refunded amount
paymentSchema.virtual("totalRefunded").get(function (this: IPayment) {
  if (!this.refunds || this.refunds.length === 0) return 0;
  return this.refunds
    .filter((refund) => refund.status === "completed")
    .reduce((total, refund) => total + refund.amount, 0);
});

// Virtual for remaining refundable amount
paymentSchema.virtual("refundableAmount").get(function (this: IPayment) {
  return this.amount - (this.totalRefunded || 0);
});

// Virtual for payment status display
paymentSchema.virtual("statusDisplay").get(function (this: IPayment) {
  return this.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
});

// Virtual for formatted amount
paymentSchema.virtual("formattedAmount").get(function (this: IPayment) {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Virtual for masked card number
paymentSchema.virtual("maskedCardNumber").get(function (this: IPayment) {
  if (!this.cardLast4) return null;
  return `**** **** **** ${this.cardLast4}`;
});

// Pre-save middleware
paymentSchema.pre("save", function (this: IPayment, next) {
  // Generate payment ID if not provided
  if (!this.paymentId) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.paymentId = `PAY-${timestamp}-${random}`;
  }

  // Set status timestamps
  if (this.isModified("status")) {
    const now = new Date();
    switch (this.status) {
      case "processing":
        if (!this.processedAt) this.processedAt = now;
        break;
      case "completed":
        if (!this.completedAt) this.completedAt = now;
        break;
      case "failed":
        if (!this.failedAt) this.failedAt = now;
        break;
    }
  }

  // Encrypt sensitive data if needed
  if (this.cardToken && this.isModified("cardToken")) {
    // In a real application, you would encrypt the card token here
    // this.cardToken = encrypt(this.cardToken);
  }

  next();
});

// Instance methods
paymentSchema.methods.canBeRefunded = function (this: IPayment) {
  return this.status === "completed" && this.refundableAmount > 0;
};

paymentSchema.methods.processRefund = function (
  this: IPayment,
  amount: number,
  reason?: string,
  refundedBy?: string
) {
  if (!this.canBeRefunded()) {
    throw new Error("Payment cannot be refunded");
  }

  if (amount > this.refundableAmount) {
    throw new Error("Refund amount exceeds refundable amount");
  }

  const refundId = `REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const refund = {
    refundId,
    amount,
    reason,
    status: "pending" as const,
    refundedBy: refundedBy
      ? new mongoose.Types.ObjectId(refundedBy)
      : undefined,
  };

  this.refunds = this.refunds || [];
  this.refunds.push(refund);

  // Update payment status
  const totalRefunded = this.totalRefunded + amount;
  if (totalRefunded >= this.amount) {
    this.status = "refunded";
  } else {
    this.status = "partially_refunded";
  }

  return this.save();
};

paymentSchema.methods.completeRefund = function (
  this: IPayment,
  refundId: string
) {
  const refund = this.refunds?.find((r) => r.refundId === refundId);
  if (!refund) {
    throw new Error("Refund not found");
  }

  refund.status = "completed";
  refund.processedAt = new Date();

  return this.save();
};

paymentSchema.methods.failRefund = function (this: IPayment, refundId: string) {
  const refund = this.refunds?.find((r) => r.refundId === refundId);
  if (!refund) {
    throw new Error("Refund not found");
  }

  refund.status = "failed";

  // Recalculate payment status
  const completedRefunds =
    this.refunds?.filter((r) => r.status === "completed") || [];
  const totalRefunded = completedRefunds.reduce(
    (total, r) => total + r.amount,
    0
  );

  if (totalRefunded === 0) {
    this.status = "completed";
  } else if (totalRefunded < this.amount) {
    this.status = "partially_refunded";
  }

  return this.save();
};

// Static methods
paymentSchema.statics.findByCustomer = function (
  customerId: string,
  limit: number = 10
) {
  return this.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("order", "orderNumber totalAmount")
    .populate("customer", "name email");
};

paymentSchema.statics.findByOrder = function (orderId: string) {
  return this.find({ order: orderId }).sort({ createdAt: -1 });
};

paymentSchema.statics.findByStatus = function (status: string) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .populate("order", "orderNumber")
    .populate("customer", "name email");
};

paymentSchema.statics.getPaymentStats = async function (
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
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        averageAmount: { $avg: "$amount" },
        completedPayments: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        failedPayments: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        refundedPayments: {
          $sum: {
            $cond: [
              { $in: ["$status", ["refunded", "partially_refunded"]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      averageAmount: 0,
      completedPayments: 0,
      failedPayments: 0,
      refundedPayments: 0,
    }
  );
};

paymentSchema.statics.getPaymentMethodStats = async function () {
  return this.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: "$paymentMethod",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        averageAmount: { $avg: "$amount" },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

const Payment = mongoose.model<IPayment>("payments", paymentSchema);

export default Payment;
