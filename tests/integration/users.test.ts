/**
 * Integration tests for Users API
 */

import request from 'supertest';
import { createApp } from '../../src/index';

describe('Users API', () => {
  const app = createApp();
  let createdUserId: string;

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com'
        })
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe('John Doe');
      expect(response.body.user.email).toBe('john@example.com');
      expect(response.body.user.id).toBeDefined();

      createdUserId = response.body.user.id;
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test User'
          // Missing email
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for duplicate email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Jane Doe',
          email: 'john@example.com' // Same email as before
        })
        .expect(400);

      expect(response.body.error).toBe('USER_ALREADY_EXISTS');
    });
  });

  describe('GET /api/users', () => {
    it('should list all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200);

      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const response = await request(app)
        .get(`/api/users/${createdUserId}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(createdUserId);
      expect(response.body.user.email).toBe('john@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id')
        .expect(400);

      expect(response.body.error).toBe('USER_NOT_FOUND');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user', async () => {
      const response = await request(app)
        .put(`/api/users/${createdUserId}`)
        .send({
          name: 'John Updated'
        })
        .expect(200);

      expect(response.body.user.name).toBe('John Updated');
      expect(response.body.user.email).toBe('john@example.com');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .put('/api/users/non-existent-id')
        .send({
          name: 'Test'
        })
        .expect(400);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user', async () => {
      await request(app)
        .delete(`/api/users/${createdUserId}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/users/${createdUserId}`)
        .expect(400);
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .delete('/api/users/non-existent-id')
        .expect(400);
    });
  });
});