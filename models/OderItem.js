import { query } from '../database/connection.js';

class OrderItem {
  static async create({ order_id, product_id, quantity, unit_price }) {
    const result = await query(
      `INSERT INTO order_items 
       (order_id, product_id, quantity, unit_price) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [order_id, product_id, quantity, unit_price]
    );
    return result.rows[0];
  }

  static async findByOrder(order_id) {
    const result = await query(
      `SELECT 
        oi.*,
        p.name as product_name,
        p.category as product_category
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [order_id]
    );
    return result.rows;
  }

  static async update(item_id, { quantity, unit_price }) {
    const result = await query(
      `UPDATE order_items 
       SET quantity = $1, unit_price = $2 
       WHERE item_id = $3 
       RETURNING *`,
      [quantity, unit_price, item_id]
    );
    return result.rows[0];
  }

  static async delete(item_id) {
    const result = await query(
      `DELETE FROM order_items 
       WHERE item_id = $1 
       RETURNING *`,
      [item_id]
    );
    return result.rows[0];
  }

  static async getProductDetails(item_id) {
    const result = await query(
      `SELECT p.* 
       FROM products p
       JOIN order_items oi ON p.product_id = oi.product_id
       WHERE oi.item_id = $1`,
      [item_id]
    );
    return result.rows[0];
  }
}

export default OrderItem;

