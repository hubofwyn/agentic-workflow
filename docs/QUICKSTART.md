# Quick Start Guide

## Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose
- Git
- (Optional) Claude API key for AI features

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/hubofwyn/agentic-workflow.git
cd agentic-workflow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and update at minimum:

```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentic_dev
REDIS_URL=redis://localhost:6379
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Optional - AI Features
CLAUDE_API_KEY=your-claude-api-key

# Optional - Alerts
SLACK_WEBHOOK_URL=your-slack-webhook-url
```

### 4. Start Services

#### Option A: Using Docker Compose (Recommended)

Start all services including database, Redis, and observability stack:

```bash
docker-compose up -d
```

#### Option B: Using Make

```bash
make dev-services
```

#### Option C: Manual Setup

Start observability stack:

```bash
cd observability
docker-compose up -d
cd ..
```

Start PostgreSQL and Redis separately (if not using Docker).

### 5. Start the Application

#### Development Mode

```bash
npm run dev
```

Or using Make:

```bash
make dev
```

The application will start on http://localhost:3000

## Verify Installation

### Check Application Health

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-02T...",
  "uptime": 5.123,
  "environment": "development",
  "version": "1.0.0"
}
```

### Access Observability Tools

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686
- **Application**: http://localhost:3000

## Basic Usage

### Create a User

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com"
  }'
```

### List Users

```bash
curl http://localhost:3000/api/users
```

### Get User by ID

```bash
curl http://localhost:3000/api/users/{user-id}
```

## Development Workflow

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# With coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check
```

### Build

```bash
# Build for production
npm run build

# Build Docker image
make build-docker
```

## Common Tasks

### View Logs

```bash
# Application logs
make logs

# Error logs only
make logs-error

# Service logs
make dev-logs
```

### Monitoring

```bash
# Open metrics dashboard
make metrics

# Open traces dashboard
make traces

# Open Grafana
make dashboard

# Health check
make health
```

### Database

```bash
# Run migrations
make db-migrate

# Seed database
make db-seed

# Reset database
make db-reset
```

## AI Features

### Code Review

```bash
make ai-review
```

### Code Optimization

```bash
make ai-optimize
```

### Generate Tests

```bash
make ai-test
```

### Generate Documentation

```bash
make ai-docs
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change it in `.env`:

```env
PORT=3001
```

### Database Connection Issues

Ensure PostgreSQL is running:

```bash
docker ps | grep postgres
```

If not running:

```bash
docker-compose up -d postgres
```

### Redis Connection Issues

Check Redis status:

```bash
docker ps | grep redis
```

### OpenTelemetry Connection Issues

Ensure the observability stack is running:

```bash
cd observability
docker-compose ps
```

### Clear All Data

```bash
make dev-clean
```

## Next Steps

1. **Read the Documentation**:
   - [Development Principles](./DEVELOPMENT_PRINCIPLES.md)
   - [API Documentation](./api/index.html) (run `make docs` first)

2. **Explore Features**:
   - Check out the health endpoints
   - Try the user management API
   - View metrics in Grafana
   - Explore traces in Jaeger

3. **Start Building**:
   - Create new features in `src/features/`
   - Add tests in `tests/`
   - Update documentation

4. **Configure CI/CD**:
   - GitHub Actions workflows are ready
   - Add secrets to GitHub repository
   - Enable automated deployments

## Getting Help

- **Documentation**: Check the `/docs` directory
- **Issues**: https://github.com/hubofwyn/agentic-workflow/issues
- **Discussions**: https://github.com/hubofwyn/agentic-workflow/discussions

## Useful Commands Reference

```bash
# Development
make dev                 # Start development environment
make dev-init           # Initialize development environment
make dev-stop           # Stop development services
make dev-clean          # Clean everything

# Testing
make test               # Run all tests
make test-unit          # Run unit tests
make test-integration   # Run integration tests
make test-coverage      # Generate coverage report

# Code Quality
make lint               # Run linters
make format             # Format code
make type-check         # Type checking

# Building & Deployment
make build              # Build for production
make deploy             # Deploy (requires configuration)

# Monitoring
make logs               # View logs
make metrics            # Open metrics dashboard
make traces             # Open traces dashboard
make dashboard          # Open Grafana
make health             # Check system health

# Utilities
make clean              # Clean build artifacts
make version            # Show version information
make help               # Show all available commands
```