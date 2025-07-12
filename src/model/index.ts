// Export all models for easy importing
export { default as User, IUser } from './user';
export { default as Product, IProduct } from './product';
export { default as Category, ICategory } from './category';
export { default as Order, IOrder, IOrderItem } from './order';
export { default as Cart, ICart, ICartItem } from './cart';
export { default as Payment, IPayment } from './payment';
export { default as Address, IAddress } from './address';
export { default as Session, ISession } from './session';
export { default as OAuthToken, IOAuthToken } from './oauth-token';
export { default as EmailVerification, IEmailVerification } from './email-verification';

// Legacy exports for backward compatibility
export { default as movie } from './movie';
export { default as movieCategory } from './movie-category';

/**
 * Database Optimization Guide
 * 
 * This file exports all the e-commerce models with comprehensive indexing strategies.
 * Each model has been optimized with the following considerations:
 * 
 * 1. **Primary Indexes**: Unique identifiers and frequently queried fields
 * 2. **Compound Indexes**: Multi-field queries for complex filtering
 * 3. **Text Indexes**: Full-text search capabilities
 * 4. **TTL Indexes**: Automatic cleanup of expired documents
 * 5. **Geospatial Indexes**: Location-based queries
 * 
 * Index Summary by Model:
 * 
 * USER MODEL:
 * - email (unique)
 * - googleId (sparse)
 * - role, isActive, createdAt, lastLogin
 * 
 * PRODUCT MODEL:
 * - name, sku (unique), price, status, isFeatured
 * - categories, brand, tags
 * - Text search on name, description, shortDescription
 * - Compound: status + isFeatured + createdAt, categories + status + price
 * 
 * CATEGORY MODEL:
 * - name, slug (unique), parent, level, path
 * - isActive, isVisible, sortOrder
 * - Text search on name, description
 * - Compound: parent + sortOrder, level + sortOrder
 * 
 * ORDER MODEL:
 * - orderNumber (unique), customer, status, paymentStatus
 * - customerEmail, trackingNumber, paymentReference
 * - Compound: customer + status + createdAt, status + paymentStatus + createdAt
 * 
 * CART MODEL:
 * - user, sessionId, status, lastActivity
 * - TTL index on expiresAt for automatic cleanup
 * - Compound: user + status, sessionId + status
 * 
 * PAYMENT MODEL:
 * - paymentId (unique), transactionId, order, customer
 * - status, paymentMethod, amount, createdAt
 * - Compound: customer + status + createdAt, status + paymentMethod + createdAt
 * 
 * ADDRESS MODEL:
 * - user, type, isDefault, isActive
 * - country, province, city, zip
 * - Geospatial index on coordinates for location queries
 * - Compound: user + type, user + isActive + isDefault
 * 
 * SESSION MODEL:
 * - sessionId (unique), user, isAuthenticated, isActive
 * - ipAddress, lastAccessedAt
 * - TTL index on expiresAt for automatic cleanup
 * 
 * OAUTH_TOKEN MODEL:
 * - user + provider (unique), provider + providerId (unique)
 * - isActive, isRevoked, expiresAt
 * - Compound: user + isActive + isRevoked
 * 
 * EMAIL_VERIFICATION MODEL:
 * - token (unique), user, email, type
 * - isUsed, isExpired
 * - TTL index on expiresAt for automatic cleanup
 * - Compound: user + type + isUsed, email + isUsed + isExpired
 */

// Model initialization function for setting up indexes
export const initializeModels = async () => {
  try {
    console.log('Initializing database models and indexes...');
    
    // Import all models to ensure schemas are registered
    const models = [
      User,
      Product,
      Category,
      Order,
      Cart,
      Payment,
      Address,
      Session,
      OAuthToken,
      EmailVerification
    ];
    
    // Ensure all indexes are created
    const indexPromises = models.map(async (Model) => {
      try {
        await Model.createIndexes();
        console.log(`✓ Indexes created for ${Model.modelName}`);
      } catch (error) {
        console.error(`✗ Error creating indexes for ${Model.modelName}:`, error);
      }
    });
    
    await Promise.all(indexPromises);
    console.log('✓ All model indexes initialized successfully');
    
    return true;
  } catch (error) {
    console.error('✗ Error initializing models:', error);
    return false;
  }
};

// Database maintenance functions
export const performDatabaseMaintenance = async () => {
  try {
    console.log('Performing database maintenance...');
    
    // Clean up expired sessions
    const expiredSessions = await Session.cleanupExpired();
    console.log(`✓ Cleaned up ${expiredSessions.deletedCount} expired sessions`);
    
    // Clean up expired OAuth tokens
    const expiredTokens = await OAuthToken.cleanupExpired();
    console.log(`✓ Updated ${expiredTokens.modifiedCount} expired OAuth tokens`);
    
    // Clean up expired email verifications
    const expiredVerifications = await EmailVerification.cleanupExpired();
    console.log(`✓ Updated ${expiredVerifications.modifiedCount} expired email verifications`);
    
    // Update product counts in categories
    const categories = await Category.find({ isActive: true });
    for (const category of categories) {
      await category.updateProductCount();
    }
    console.log(`✓ Updated product counts for ${categories.length} categories`);
    
    console.log('✓ Database maintenance completed successfully');
    return true;
  } catch (error) {
    console.error('✗ Error during database maintenance:', error);
    return false;
  }
};

// Database statistics function
export const getDatabaseStats = async () => {
  try {
    const stats = {
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ isActive: true }),
        verified: await User.countDocuments({ isEmailVerified: true }),
        googleUsers: await User.countDocuments({ isGoogleUser: true })
      },
      products: {
        total: await Product.countDocuments(),
        active: await Product.countDocuments({ status: 'active' }),
        featured: await Product.countDocuments({ isFeatured: true }),
        outOfStock: await Product.countDocuments({ 'inventory.quantity': 0 })
      },
      orders: await Order.getOrderStats(),
      payments: await Payment.getPaymentStats(),
      carts: await Cart.getCartStats(),
      sessions: await Session.getSessionStats(),
      addresses: await Address.getAddressStats(),
      emailVerifications: await EmailVerification.getVerificationStats()
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return null;
  }
};

// Export utility functions
export const ModelUtils = {
  initializeModels,
  performDatabaseMaintenance,
  getDatabaseStats
};

export default {
  User,
  Product,
  Category,
  Order,
  Cart,
  Payment,
  Address,
  Session,
  OAuthToken,
  EmailVerification,
  // Legacy models
  movie,
  movieCategory,
  // Utilities
  ModelUtils
};
