import mongoose from "mongoose";

// Interface for Cart Item
export interface ICartItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: Date;
  productVariant?: {
    name: string;
    attributes: {
      name: string;
      value: string;
    }[];
  };
}

// Interface for Cart document
export interface ICart extends mongoose.Document {
  // Cart Identification
  user?: mongoose.Types.ObjectId; // For logged-in users
  sessionId?: string; // For guest users
  
  // Cart Items
  items: ICartItem[];
  
  // Pricing
  subtotal: number;
  itemCount: number;
  
  // Status
  status: 'active' | 'abandoned' | 'converted';
  
  // Metadata
  lastActivity: Date;
  expiresAt?: Date; // For guest carts
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new mongoose.Schema<ICartItem>({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'products',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    max: [100, 'Quantity cannot exceed 100']
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: true,
    min: [0, 'Total price cannot be negative']
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  productVariant: {
    name: String,
    attributes: [{
      name: {
        type: String,
        required: true
      },
      value: {
        type: String,
        required: true
      }
    }]
  }
}, { _id: false });

const cartSchema = new mongoose.Schema<ICart>({
  // Cart Identification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    sparse: true,
    index: true
  },
  sessionId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Cart Items
  items: [cartItemSchema],
  
  // Pricing
  subtotal: {
    type: Number,
    default: 0,
    min: [0, 'Subtotal cannot be negative']
  },
  itemCount: {
    type: Number,
    default: 0,
    min: [0, 'Item count cannot be negative']
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'abandoned', 'converted'],
    default: 'active',
    index: true
  },
  
  // Metadata
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index for automatic cleanup
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance optimization
cartSchema.index({ user: 1, status: 1 });
cartSchema.index({ sessionId: 1, status: 1 });
cartSchema.index({ lastActivity: -1 });
cartSchema.index({ createdAt: -1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Compound index for finding active carts
cartSchema.index({ status: 1, lastActivity: -1 });

// Virtual for cart age
cartSchema.virtual('ageInHours').get(function(this: ICart) {
  const now = new Date();
  const diffMs = now.getTime() - this.createdAt.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
});

// Virtual for cart value display
cartSchema.virtual('formattedSubtotal').get(function(this: ICart) {
  return `$${this.subtotal.toFixed(2)}`;
});

// Virtual for unique product count
cartSchema.virtual('uniqueProductCount').get(function(this: ICart) {
  return this.items.length;
});

// Pre-save middleware
cartSchema.pre('save', function(this: ICart, next) {
  // Calculate subtotal and item count
  this.subtotal = this.items.reduce((total, item) => total + item.totalPrice, 0);
  this.itemCount = this.items.reduce((total, item) => total + item.quantity, 0);
  
  // Update last activity
  this.lastActivity = new Date();
  
  // Set expiration for guest carts (30 days)
  if (!this.user && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Calculate item total prices
  this.items.forEach(item => {
    item.totalPrice = item.unitPrice * item.quantity;
  });
  
  next();
});

// Instance methods
cartSchema.methods.addItem = function(this: ICart, productId: string, quantity: number, unitPrice: number, variant?: any) {
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productId && 
    JSON.stringify(item.productVariant) === JSON.stringify(variant)
  );
  
  if (existingItemIndex > -1) {
    // Update existing item
    this.items[existingItemIndex].quantity += quantity;
    this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].unitPrice * this.items[existingItemIndex].quantity;
  } else {
    // Add new item
    this.items.push({
      product: new mongoose.Types.ObjectId(productId),
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity,
      addedAt: new Date(),
      productVariant: variant
    } as ICartItem);
  }
  
  return this.save();
};

cartSchema.methods.removeItem = function(this: ICart, productId: string, variant?: any) {
  this.items = this.items.filter(item => 
    !(item.product.toString() === productId && 
      JSON.stringify(item.productVariant) === JSON.stringify(variant))
  );
  
  return this.save();
};

cartSchema.methods.updateItemQuantity = function(this: ICart, productId: string, quantity: number, variant?: any) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId && 
    JSON.stringify(item.productVariant) === JSON.stringify(variant)
  );
  
  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
      this.items[itemIndex].totalPrice = this.items[itemIndex].unitPrice * quantity;
    }
  }
  
  return this.save();
};

cartSchema.methods.clearCart = function(this: ICart) {
  this.items = [];
  return this.save();
};

cartSchema.methods.convertToOrder = function(this: ICart) {
  this.status = 'converted';
  return this.save();
};

cartSchema.methods.markAsAbandoned = function(this: ICart) {
  this.status = 'abandoned';
  return this.save();
};

// Static methods
cartSchema.statics.findByUser = function(userId: string) {
  return this.findOne({ user: userId, status: 'active' })
    .populate('items.product', 'name price images sku');
};

cartSchema.statics.findBySession = function(sessionId: string) {
  return this.findOne({ sessionId, status: 'active' })
    .populate('items.product', 'name price images sku');
};

cartSchema.statics.findOrCreateCart = async function(userId?: string, sessionId?: string) {
  let cart;
  
  if (userId) {
    cart = await this.findByUser(userId);
  } else if (sessionId) {
    cart = await this.findBySession(sessionId);
  }
  
  if (!cart) {
    cart = new this({
      user: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      sessionId: sessionId || undefined
    });
    await cart.save();
  }
  
  return cart;
};

cartSchema.statics.mergeGuestCart = async function(guestSessionId: string, userId: string) {
  const guestCart = await this.findBySession(guestSessionId);
  if (!guestCart || guestCart.items.length === 0) {
    return null;
  }
  
  const userCart = await this.findOrCreateCart(userId);
  
  // Merge items from guest cart to user cart
  for (const guestItem of guestCart.items) {
    await userCart.addItem(
      guestItem.product.toString(),
      guestItem.quantity,
      guestItem.unitPrice,
      guestItem.productVariant
    );
  }
  
  // Remove guest cart
  await guestCart.deleteOne();
  
  return userCart;
};

cartSchema.statics.findAbandonedCarts = function(hoursAgo: number = 24) {
  const cutoffDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    lastActivity: { $lt: cutoffDate },
    itemCount: { $gt: 0 }
  }).populate('user', 'name email');
};

cartSchema.statics.getCartStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$subtotal' },
        averageValue: { $avg: '$subtotal' },
        averageItems: { $avg: '$itemCount' }
      }
    }
  ]);
  
  return stats;
};

const Cart = mongoose.model<ICart>('carts', cartSchema);

export default Cart;
