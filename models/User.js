import { query } from '../database/connection.js';

class User {
  // Create user with unique username
  static async create({ username, email }) {
    // Check if the username already exists
    const existingUser = await this.findByUsername(username);
    if (existingUser) {
      throw new Error(`Username '${username}' already exists.`);
    }

    const result = await query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [username, email]
    );
    return result.rows[0];
  }

  // Find user by ID
  static async findById(user_id) {
    const result = await query(
      'SELECT * FROM users WHERE user_id = $1',
      [user_id]
    );
    return result.rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    const result = await query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  }

  // Update user information (ensures unique username)
  static async update(user_id, { username, email }) {
    // First, check if the new username already exists in the database
    const existingUser = await this.findByUsername(username);
    if (existingUser && existingUser.user_id !== user_id) {
      throw new Error(`Username '${username}' already exists.`);
    }

    // Update the user details
    const result = await query(
      'UPDATE users SET username = $1, email = $2, updated_at = NOW() WHERE user_id = $3 RETURNING *',
      [username, email, user_id]
    );
    return result.rows[0];
  }

  // Delete user
  static async delete(user_id) {
    const result = await query(
      'DELETE FROM users WHERE user_id = $1 RETURNING *',
      [user_id]
    );
    return result.rows[0];
  }
}

export default User;
