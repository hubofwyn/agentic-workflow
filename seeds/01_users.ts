/**
 * Seed users for development
 */

import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing entries
  await knex('audit_logs').del();
  await knex('sessions').del();
  await knex('users').del();

  // Insert seed users
  await knex('users').insert([
    {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Admin User',
      email: 'admin@agentic-workflow.dev',
      bio: 'System administrator account',
      is_active: true,
      is_verified: true,
      verified_at: knex.fn.now(),
      metadata: JSON.stringify({
        role: 'admin',
        permissions: ['*']
      })
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Test User',
      email: 'test@agentic-workflow.dev',
      bio: 'Test user account for development',
      is_active: true,
      is_verified: true,
      verified_at: knex.fn.now(),
      metadata: JSON.stringify({
        role: 'user',
        permissions: ['read', 'write']
      })
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      name: 'Demo User',
      email: 'demo@agentic-workflow.dev',
      bio: 'Demo user for presentations',
      is_active: true,
      is_verified: true,
      verified_at: knex.fn.now(),
      metadata: JSON.stringify({
        role: 'user',
        permissions: ['read']
      })
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      name: 'AI Agent',
      email: 'ai@agentic-workflow.dev',
      bio: 'AI agent account for automated operations',
      is_active: true,
      is_verified: true,
      verified_at: knex.fn.now(),
      metadata: JSON.stringify({
        role: 'agent',
        permissions: ['read', 'write', 'execute'],
        agent_type: 'claude',
        capabilities: ['code_review', 'optimization', 'testing']
      })
    }
  ]);

  // Insert initial audit log
  await knex('audit_logs').insert({
    actor_type: 'system',
    actor_name: 'seed_script',
    action: 'seed',
    resource_type: 'users',
    status: 'success',
    metadata: JSON.stringify({
      users_created: 4,
      timestamp: new Date().toISOString()
    })
  });
}