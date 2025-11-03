/**
 * Create users table migration
 */

import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User data
    table.string('name', 255).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).nullable();

    // Profile data
    table.text('bio').nullable();
    table.string('avatar_url', 512).nullable();
    table.jsonb('metadata').defaultTo('{}');

    // Status
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_verified').defaultTo(false);
    table.timestamp('verified_at').nullable();

    // Authentication
    table.timestamp('last_login_at').nullable();
    table.string('last_login_ip', 45).nullable();
    table.integer('login_count').defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();

    // Indexes
    table.index('email');
    table.index('is_active');
    table.index('created_at');
    table.index(['deleted_at', 'is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('users');
}