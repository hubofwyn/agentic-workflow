/**
 * Users API Routes
 * Example feature implementation with full observability
 */

import { Router, Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/metrics';
import { AppError, ErrorSeverity, ErrorCategory } from '../../lib/error-handler';

export const usersRouter = Router();

const tracer = trace.getTracer('users-service');

/**
 * In-memory user store (replace with database in production)
 */
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const users: Map<string, User> = new Map();

/**
 * List all users
 */
usersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('users.list');

  try {
    logger.info('Listing users', { count: users.size });

    const usersList = Array.from(users.values());

    metricsCollector.increment('users.list.success');
    span.setAttributes({
      'users.count': usersList.length
    });

    res.json({
      users: usersList,
      count: usersList.length
    });
  } catch (error) {
    metricsCollector.increment('users.list.error');
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Get user by ID
 */
usersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('users.get');
  const { id } = req.params;

  try {
    span.setAttributes({ 'user.id': id });

    logger.info('Getting user', { userId: id });

    const user = users.get(id);

    if (!user) {
      throw new AppError({
        message: `User not found with ID: ${id}`,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        code: 'USER_NOT_FOUND',
        recoverable: false,
        context: { userId: id }
      });
    }

    metricsCollector.increment('users.get.success');
    res.json({ user });
  } catch (error) {
    metricsCollector.increment('users.get.error');
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Create new user
 */
usersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('users.create');

  try {
    const { name, email } = req.body;

    // Validation
    if (!name || !email) {
      throw new AppError({
        message: 'Name and email are required',
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        code: 'INVALID_USER_DATA',
        recoverable: false,
        suggestedFix: 'Provide both name and email fields'
      });
    }

    // Check if email already exists
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      throw new AppError({
        message: `User with email ${email} already exists`,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.BUSINESS_LOGIC,
        code: 'USER_ALREADY_EXISTS',
        recoverable: false,
        context: { email }
      });
    }

    // Create user
    const user: User = {
      id: generateId(),
      name,
      email,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    users.set(user.id, user);

    logger.info('User created', { userId: user.id, email: user.email });

    span.setAttributes({
      'user.id': user.id,
      'user.email': user.email
    });

    metricsCollector.increment('users.create.success');
    metricsCollector.gauge('users.total', users.size);

    res.status(201).json({ user });
  } catch (error) {
    metricsCollector.increment('users.create.error');
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Update user
 */
usersRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('users.update');
  const { id } = req.params;

  try {
    span.setAttributes({ 'user.id': id });

    const user = users.get(id);

    if (!user) {
      throw new AppError({
        message: `User not found with ID: ${id}`,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        code: 'USER_NOT_FOUND',
        recoverable: false,
        context: { userId: id }
      });
    }

    const { name, email } = req.body;

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    user.updatedAt = new Date();

    users.set(id, user);

    logger.info('User updated', { userId: id });

    metricsCollector.increment('users.update.success');

    res.json({ user });
  } catch (error) {
    metricsCollector.increment('users.update.error');
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Delete user
 */
usersRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const span = tracer.startSpan('users.delete');
  const { id } = req.params;

  try {
    span.setAttributes({ 'user.id': id });

    const user = users.get(id);

    if (!user) {
      throw new AppError({
        message: `User not found with ID: ${id}`,
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        code: 'USER_NOT_FOUND',
        recoverable: false,
        context: { userId: id }
      });
    }

    users.delete(id);

    logger.info('User deleted', { userId: id });

    metricsCollector.increment('users.delete.success');
    metricsCollector.gauge('users.total', users.size);

    res.status(204).send();
  } catch (error) {
    metricsCollector.increment('users.delete.error');
    next(error);
  } finally {
    span.end();
  }
});

/**
 * Generate unique ID
 */
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}