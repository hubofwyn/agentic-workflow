# Contributing to Agentic Workflow

Thank you for considering contributing to Agentic Workflow! This document provides guidelines and workflows for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [AI-Assisted Development](#ai-assisted-development)

## Code of Conduct

This project follows a professional code of conduct:

- Be respectful and inclusive
- Focus on constructive feedback
- Prioritize the project's goals
- Maintain professional communication

## Getting Started

### Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- Git
- Claude API key (optional, for AI features)

### Initial Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/agentic-workflow.git
   cd agentic-workflow
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/hubofwyn/agentic-workflow.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Copy environment file:
   ```bash
   cp .env.example .env
   ```
6. Start development environment:
   ```bash
   make dev-init
   ```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications
- `chore/` - Maintenance tasks

### 2. Make Changes

Follow the [coding standards](#coding-standards) and ensure:

- Code is properly typed (TypeScript)
- Tests are included
- Documentation is updated
- No linting errors
- All tests pass

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Run type checker
npm run type-check

# Run tests
npm test

# Run all quality checks
make quality
```

### 4. Commit Your Changes

See [Commit Messages](#commit-messages) for guidelines.

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 6. Create Pull Request

- Go to GitHub and create a pull request
- Fill out the PR template
- Link related issues
- Request review

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types
- Use interfaces for object shapes
- Use type guards when necessary

### Code Style

- Follow ESLint configuration
- Use Prettier for formatting
- Maximum line length: 100 characters
- Use meaningful variable names
- Keep functions small and focused

### Project Structure

```
src/
├── config/          # Configuration management
├── features/        # Feature modules
│   └── feature-name/
│       ├── routes.ts
│       ├── service.ts
│       ├── types.ts
│       └── tests/
├── lib/            # Shared libraries
├── observability/  # Observability setup
└── index.ts        # Application entry point
```

### Creating New Features

1. Create feature directory in `src/features/`
2. Implement routes with observability
3. Add service layer for business logic
4. Define types/interfaces
5. Write unit and integration tests
6. Update documentation

Example feature structure:

```typescript
// src/features/example/routes.ts
import { Router } from 'express';
import { trace } from '@opentelemetry/api';
import { logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/metrics';

export const exampleRouter = Router();
const tracer = trace.getTracer('example-service');

exampleRouter.get('/', async (req, res, next) => {
  const span = tracer.startSpan('example.list');

  try {
    logger.info('Example endpoint called');
    metricsCollector.increment('example.requests');

    // Your logic here

    res.json({ message: 'Hello World' });
  } catch (error) {
    next(error);
  } finally {
    span.end();
  }
});
```

## Testing Guidelines

### Unit Tests

- Test individual functions/methods
- Mock external dependencies
- Aim for 80%+ coverage
- Place in `tests/unit/`

Example:

```typescript
describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector('test');
  });

  it('should increment counter', () => {
    expect(() => {
      collector.increment('test.counter');
    }).not.toThrow();
  });
});
```

### Integration Tests

- Test API endpoints
- Use actual dependencies where possible
- Test error scenarios
- Place in `tests/integration/`

Example:

```typescript
describe('Example API', () => {
  const app = createApp();

  it('should return 200', async () => {
    const response = await request(app)
      .get('/api/example')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Documentation

### Code Documentation

- Use JSDoc comments for functions
- Include parameter descriptions
- Add usage examples
- Document complex logic

Example:

```typescript
/**
 * Process payment transaction
 *
 * @param transaction - Transaction details
 * @returns Promise<PaymentResult>
 *
 * @example
 * ```typescript
 * const result = await processPayment({
 *   amount: 100.00,
 *   currency: 'USD'
 * });
 * ```
 */
async function processPayment(transaction: Transaction): Promise<PaymentResult> {
  // Implementation
}
```

### README Updates

- Update README.md for major features
- Add examples for new functionality
- Update installation steps if needed

### API Documentation

- Document new endpoints in `docs/API.md`
- Include request/response examples
- Document error responses
- Add curl examples

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions or modifications
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

### Examples

```
feat(users): add user profile endpoint

Add GET /api/users/:id/profile endpoint to retrieve
detailed user profile information.

Closes #123
```

```
fix(auth): resolve token expiration issue

Fixed bug where tokens were expiring too early due to
incorrect timestamp calculation.

Fixes #456
```

## Pull Request Process

### Before Submitting

1. **Rebase on latest main**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**:
   ```bash
   make quality
   make test
   ```

3. **Update documentation**

4. **Test manually**

### PR Template

Your PR should include:

- **Description**: What does this PR do?
- **Motivation**: Why is this change needed?
- **Changes**: List of changes made
- **Testing**: How was this tested?
- **Screenshots**: If UI changes
- **Related Issues**: Link to issues

### Review Process

1. AI review runs automatically
2. Maintainers review code
3. Address feedback
4. Merge when approved

### After Merge

1. Delete your branch
2. Pull latest main:
   ```bash
   git checkout main
   git pull upstream main
   ```

## AI-Assisted Development

This project encourages AI-assisted development:

### Using Claude Code CLI

```bash
# Code review
make ai-review

# Optimize code
make ai-optimize

# Generate tests
make ai-test

# Generate documentation
make ai-docs
```

### Best Practices

- Use AI for repetitive tasks
- Review AI-generated code carefully
- Test AI-generated changes
- Document AI-assisted changes

### AI-Generated Code

- Mark AI-generated code in PR description
- Ensure it follows project standards
- Add appropriate tests
- Verify security implications

## Release Process

Maintainers handle releases:

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create git tag
4. Push tag to trigger release workflow
5. GitHub Actions handles the rest

## Questions or Issues?

- **Documentation**: Check `/docs` directory
- **Discussions**: [GitHub Discussions](https://github.com/hubofwyn/agentic-workflow/discussions)
- **Issues**: [GitHub Issues](https://github.com/hubofwyn/agentic-workflow/issues)
- **Security**: Email security@agentic-workflow.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Agentic Workflow! Your efforts help build the future of AI-powered development.