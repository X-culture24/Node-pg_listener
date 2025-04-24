// Example initialization with custom filters
const listener = new DBListener(
  ['users', 'products'], // Only monitor these tables
  {
    operations: ['INSERT', 'DELETE'], // Default operations
    filters: {
      users: ['INSERT', 'UPDATE'], // Custom ops for users table
      products: ['INSERT'] // Only inserts for products
    }
  }
);