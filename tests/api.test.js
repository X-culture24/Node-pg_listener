const request = require('supertest');
const { query } = require('../server/db-client');

describe('Notifier API', () => {
  let server;
  let testUserId;
  let testProductId;

  beforeAll(async () => {
    server = require('../server/notifier');
    // Clear test data
    await query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
  });

  afterAll(() => {
    server.close();
  });

  test('Create user', async () => {
    const res = await request(server)
      .post('/users')
      .send({
        username: 'testuser',
        email: 'test@example.com'
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('user_id');
    testUserId = res.body.user_id;
  });

  test('Update user', async () => {
    const res = await request(server)
      .put(`/users/${testUserId}`)
      .send({
        username: 'updateduser',
        email: 'updated@example.com'
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.username).toBe('updateduser');
  });

  test('Delete user', async () => {
    const res = await request(server)
      .delete(`/users/${testUserId}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('user');
  });
});
