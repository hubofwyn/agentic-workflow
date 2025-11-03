/**
 * Knex Configuration
 * Database migration and seeding configuration
 */

import type { Knex } from 'knex';
import { config } from './src/config';

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: config.database.url,
    pool: {
      min: config.database.poolMin,
      max: config.database.poolMax
    },
    migrations: {
      tableName: config.database.migrationTable,
      directory: './migrations',
      extension: 'ts',
      loadExtensions: ['.ts']
    },
    seeds: {
      directory: './seeds',
      extension: 'ts',
      loadExtensions: ['.ts']
    }
  },

  test: {
    client: 'postgresql',
    connection: process.env.TEST_DATABASE_URL || config.database.url,
    pool: {
      min: 0,
      max: 5
    },
    migrations: {
      tableName: config.database.migrationTable,
      directory: './migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './seeds',
      extension: 'ts'
    }
  },

  staging: {
    client: 'postgresql',
    connection: process.env.PRODUCTION_DATABASE_URL || config.database.url,
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: config.database.migrationTable,
      directory: './migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './seeds',
      extension: 'ts'
    }
  },

  production: {
    client: 'postgresql',
    connection: process.env.PRODUCTION_DATABASE_URL || config.database.url,
    pool: {
      min: config.database.poolMin,
      max: config.database.poolMax
    },
    migrations: {
      tableName: config.database.migrationTable,
      directory: './migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './seeds',
      extension: 'ts'
    }
  }
};

export default knexConfig;