# Database Optimization Guide

This document outlines the comprehensive database optimization strategies implemented in the e-commerce system models.

## Index Strategy Overview

### 1. Primary Indexes
- **Unique Identifiers**: All models have unique indexes on primary identifiers
- **Foreign Keys**: Indexed for efficient joins and lookups
- **Status Fields**: Indexed for filtering active/inactive records

### 2. Compound Indexes
- **Multi-field Queries**: Optimized for common query patterns
- **Sorting Operations**: Efficient sorting on multiple fields
- **Range Queries**: Optimized for date ranges and numerical ranges

### 3. Text Indexes
- **Full-text Search**: Implemented on searchable content fields
- **Multi-language Support**: Configured for international content

### 4. TTL Indexes
- **Automatic Cleanup**: Expired documents are automatically removed
- **Session Management**: Temporary data cleanup
- **Token Expiration**: Security token lifecycle management

## Model-Specific Optimizations

### User Model
```javascript
// Primary indexes
{ email: 1 }           // Unique, login queries
{ googleId: 1 }        // OAuth integration
{ role: 1 }            // Permission filtering
{ isActive: 1 }        // Active user filtering

// Performance considerations
- Password field excluded from queries by default
- Account locking mechanism with attempt tracking
- Virtual fields for computed properties
```

### Product Model
```javascript
// Search optimization
{ name: "text", description: "text", shortDescription: "text" }

// Filtering indexes
{ status: 1, isFeatured: -1, createdAt: -1 }
{ categories: 1, status: 1, price: 1 }
{ brand: 1 }
{ sku: 1 }             // Unique identifier

// Performance features
- Inventory tracking with low stock alerts
- Automatic SEO field generation
- Image optimization with primary image selection
```

### Category Model
```javascript
// Hierarchical structure
{ parent: 1, sortOrder: 1 }
{ level: 1, sortOrder: 1 }
{ path: 1 }            // Full path indexing

// Search and filtering
{ name: "text", description: "text" }
{ isActive: 1, isVisible: 1, sortOrder: 1 }

// Features
- Automatic slug generation
- Breadcrumb path calculation
- Product count tracking
```

### Order Model
```javascript
// Customer queries
{ customer: 1, createdAt: -1 }
{ customer: 1, status: 1, createdAt: -1 }

// Status tracking
{ status: 1, createdAt: -1 }
{ paymentStatus: 1 }
{ fulfillmentStatus: 1 }

// Lookup fields
{ orderNumber: 1 }     // Unique
{ trackingNumber: 1 }
{ customerEmail: 1 }

// Performance features
- Automatic order number generation
- Status timestamp tracking
- Order analytics aggregation
```

### Cart Model
```javascript
// User association
{ user: 1, status: 1 }
{ sessionId: 1, status: 1 }

// Activity tracking
{ lastActivity: -1 }
{ status: 1, lastActivity: -1 }

// TTL cleanup
{ expiresAt: 1 }       // Automatic expiration

// Features
- Guest cart support with session tracking
- Cart merging for user login
- Abandoned cart detection
```

### Payment Model
```javascript
// Transaction tracking
{ paymentId: 1 }       // Unique
{ transactionId: 1 }
{ order: 1 }
{ customer: 1, createdAt: -1 }

// Status and method filtering
{ status: 1, createdAt: -1 }
{ paymentMethod: 1 }
{ status: 1, paymentMethod: 1, createdAt: -1 }

// Security features
- Sensitive data exclusion from queries
- Fraud scoring integration
- Refund tracking and management
```

### Address Model
```javascript
// User association
{ user: 1, type: 1 }
{ user: 1, isDefault: 1 }
{ user: 1, isActive: 1 }

// Geographic indexing
{ country: 1, province: 1, city: 1 }
{ coordinates: "2dsphere" }  // Geospatial queries

// Features
- Address validation integration
- Default address management
- Location-based queries
```

### Session Model
```javascript
// Session management
{ sessionId: 1 }       // Unique
{ user: 1, isActive: 1 }
{ isAuthenticated: 1, isActive: 1 }

// Security tracking
{ ipAddress: 1, createdAt: -1 }
{ lastAccessedAt: -1 }

// TTL cleanup
{ expiresAt: 1 }       // Automatic expiration

// Features
- Device fingerprinting
- Location tracking
- Session analytics
```

### OAuth Token Model
```javascript
// Provider integration
{ user: 1, provider: 1 }      // Unique combination
{ provider: 1, providerId: 1 } // Unique combination

// Token management
{ isActive: 1, isRevoked: 1 }
{ expiresAt: 1 }

// Features
- Multi-provider support
- Token refresh mechanism
- Usage tracking
```

### Email Verification Model
```javascript
// Verification tracking
{ token: 1 }           // Unique
{ user: 1, type: 1 }
{ email: 1, type: 1 }

// Status filtering
{ isUsed: 1, isExpired: 1 }
{ user: 1, type: 1, isUsed: 1 }

// TTL cleanup
{ expiresAt: 1 }       // Automatic expiration

// Features
- Multiple verification types
- Attempt limiting
- Token regeneration
```

## Performance Best Practices

### 1. Query Optimization
- Use projection to limit returned fields
- Implement pagination for large result sets
- Use aggregation pipelines for complex queries
- Cache frequently accessed data

### 2. Index Maintenance
- Monitor index usage with MongoDB profiler
- Remove unused indexes to improve write performance
- Use partial indexes for conditional queries
- Consider index intersection for complex queries

### 3. Data Modeling
- Embed related data when appropriate
- Use references for large or frequently changing data
- Implement data archiving for historical records
- Use appropriate data types for storage efficiency

### 4. Monitoring and Analytics
- Track query performance metrics
- Monitor index hit ratios
- Implement slow query logging
- Use database profiling tools

## Maintenance Procedures

### Daily Maintenance
```javascript
// Clean up expired documents
await Session.cleanupExpired();
await OAuthToken.cleanupExpired();
await EmailVerification.cleanupExpired();

// Update category product counts
const categories = await Category.find({ isActive: true });
for (const category of categories) {
  await category.updateProductCount();
}
```

### Weekly Maintenance
```javascript
// Analyze index usage
db.runCommand({ planCacheClear: "collection_name" });

// Update database statistics
db.runCommand({ reIndex: "collection_name" });

// Archive old data
await Order.updateMany(
  { createdAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
  { status: 'archived' }
);
```

### Monthly Maintenance
```javascript
// Comprehensive database analysis
const stats = await getDatabaseStats();

// Index optimization review
db.collection.getIndexes();

// Performance metrics analysis
db.runCommand({ collStats: "collection_name" });
```

## Security Considerations

### 1. Data Protection
- Sensitive fields excluded from queries by default
- Password hashing with salt
- Token encryption for OAuth and sessions
- PII data handling compliance

### 2. Access Control
- Role-based permissions
- IP address tracking
- Session management
- Rate limiting implementation

### 3. Audit Trail
- Comprehensive logging
- Change tracking
- User activity monitoring
- Security event detection

This optimization strategy ensures high performance, scalability, and security for the e-commerce platform while maintaining data integrity and providing excellent user experience.
