import { query } from '../database/connection.js';

class Product {
  static async create({ name, category, price, stock }) {
    const result = await query(
      'INSERT INTO products (name, category, price, stock) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, category, price, stock]
    );
    return result.rows[0];
  }

  static async findById(product_id) {
    const result = await query(
      'SELECT * FROM products WHERE product_id = $1',
      [product_id]
    );
    return result.rows[0];
  }

  static async findByCategory(category) {
    const result = await query(
      'SELECT * FROM products WHERE category = $1',
      [category]
    );
    return result.rows;
  }

  static async update(product_id, { name, category, price, stock }) {
    const result = await query(
      'UPDATE products SET name = $1, category = $2, price = $3, stock = $4 WHERE product_id = $5 RETURNING *',
      [name, category, price, stock, product_id]
    );
    return result.rows[0];
  }

  static async delete(product_id) {
    const result = await query(
      'DELETE FROM products WHERE product_id = $1 RETURNING *',
      [product_id]
    );
    return result.rows[0];
  }
}

export default Product;