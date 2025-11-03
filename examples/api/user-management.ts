/**
 * User Management API Examples
 * Demonstrates how to interact with the Users API
 */

import axios, { AxiosInstance } from 'axios';

// Base configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * API Client with automatic tracing and error handling
 */
class UserManagementClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for tracing
    this.client.interceptors.request.use(config => {
      const traceId = this.generateTraceId();
      config.headers['X-Trace-ID'] = traceId;
      console.log(`[${traceId}] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      response => {
        const traceId = response.config.headers['X-Trace-ID'];
        console.log(`[${traceId}] Response: ${response.status}`);
        return response;
      },
      error => {
        const traceId = error.config?.headers['X-Trace-ID'];
        console.error(`[${traceId}] Error: ${error.message}`);
        throw error;
      }
    );
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new user
   */
  async createUser(name: string, email: string) {
    const response = await this.client.post('/api/users', {
      name,
      email
    });
    return response.data.user;
  }

  /**
   * Get all users
   */
  async listUsers() {
    const response = await this.client.get('/api/users');
    return response.data;
  }

  /**
   * Get user by ID
   */
  async getUser(id: string) {
    const response = await this.client.get(`/api/users/${id}`);
    return response.data.user;
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: { name?: string; email?: string }) {
    const response = await this.client.put(`/api/users/${id}`, updates);
    return response.data.user;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    await this.client.delete(`/api/users/${id}`);
  }

  /**
   * Check health
   */
  async checkHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

/**
 * Example usage
 */
async function main() {
  const client = new UserManagementClient();

  try {
    // Check health
    console.log('\n=== Health Check ===');
    const health = await client.checkHealth();
    console.log('Status:', health.status);
    console.log('Uptime:', health.uptime);

    // Create users
    console.log('\n=== Creating Users ===');
    const user1 = await client.createUser('Alice Johnson', 'alice@example.com');
    console.log('Created user:', user1.name, `(${user1.id})`);

    const user2 = await client.createUser('Bob Smith', 'bob@example.com');
    console.log('Created user:', user2.name, `(${user2.id})`);

    // List users
    console.log('\n=== Listing Users ===');
    const { users, count } = await client.listUsers();
    console.log(`Found ${count} users:`);
    users.forEach((user: any) => {
      console.log(`  - ${user.name} <${user.email}>`);
    });

    // Get specific user
    console.log('\n=== Get User ===');
    const fetchedUser = await client.getUser(user1.id);
    console.log('Fetched:', fetchedUser.name);
    console.log('Created at:', fetchedUser.createdAt);

    // Update user
    console.log('\n=== Update User ===');
    const updatedUser = await client.updateUser(user1.id, {
      name: 'Alice Johnson (Updated)'
    });
    console.log('Updated name:', updatedUser.name);

    // Delete user
    console.log('\n=== Delete User ===');
    await client.deleteUser(user2.id);
    console.log('Deleted user:', user2.id);

    // Verify deletion
    const { count: finalCount } = await client.listUsers();
    console.log(`Final count: ${finalCount} users`);

    console.log('\n✅ All operations completed successfully!');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('\n❌ API Error:');
      console.error('Status:', error.response?.status);
      console.error('Message:', error.response?.data?.message);
      console.error('Error Code:', error.response?.data?.error);
    } else {
      console.error('\n❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { UserManagementClient };