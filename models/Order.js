import { query } from '../database/connection.js';

class Order {
  static async create({ user_id, total_amount }) {
    const result = await query(
      'INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING *',
      [user_id, total_amount]
    );
    return result.rows[0];
  }

  static async findById(order_id) {
    const result = await query(
      'SELECT * FROM orders WHERE order_id = $1',
      [order_id]
    );
    return result.rows[0];
  }

  static async findByUser(user_id) {
    const result = await query(
      'SELECT * FROM orders WHERE user_id = $1',
      [user_id]
    );
    return result.rows;
  }

  static async update(order_id, { total_amount, status }) {
    const result = await query(
      'UPDATE orders SET total_amount = $1, status = $2 WHERE order_id = $3 RETURNING *',
      [total_amount, status, order_id]
    );
    return result.rows[0];
  }

  static async delete(order_id) {
    const result = await query(
      'DELETE FROM orders WHERE order_id = $1 RETURNING *',
      [order_id]
    );
    return result.rows[0];
  }
}

export default Order;