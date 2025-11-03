/**
 * Create audit logs table migration
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('audit_logs', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Actor information
    table.uuid('user_id').nullable();
    table.foreign('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('actor_type', 50).notNullable(); // 'user', 'system', 'api', 'ai_agent'
    table.string('actor_name', 255).nullable();

    // Action details
    table.string('action', 100).notNullable(); // 'create', 'update', 'delete', 'login', etc.
    table.string('resource_type', 100).notNullable(); // 'user', 'session', 'config', etc.
    table.string('resource_id', 255).nullable();

    // Request context
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 512).nullable();
    table.string('request_id', 255).nullable();
    table.string('trace_id', 255).nullable();

    // Change tracking
    table.jsonb('changes').nullable(); // Before/after values
    table.jsonb('metadata').defaultTo('{}');

    // Result
    table.string('status', 50).notNullable(); // 'success', 'failure', 'partial'
    table.text('error_message').nullable();

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('user_id');
    table.index('action');
    table.index('resource_type');
    table.index('resource_id');
    table.index('created_at');
    table.index('trace_id');
    table.index(['resource_type', 'resource_id']);
    table.index(['user_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('audit_logs');
}