# Agentic Workflow Makefile
# Automated tasks for development, testing, and deployment

.PHONY: help dev test build deploy clean

# Default target
.DEFAULT_GOAL := help

# Variables
NODE_ENV ?= development
PORT ?= 3000
LOG_LEVEL ?= debug
DOCKER_REGISTRY ?= ghcr.io
IMAGE_NAME ?= agentic-workflow
VERSION ?= $(shell git describe --tags --always --dirty)
COMMIT_SHA ?= $(shell git rev-parse HEAD)

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Help target
help: ## Show this help message
	@echo "${BLUE}Agentic Workflow - Available Commands${NC}"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "${GREEN}%-20s${NC} %s\n", $$1, $$2}'
	@echo ""
	@echo "${YELLOW}Examples:${NC}"
	@echo "  make dev          # Start development environment"
	@echo "  make test         # Run all tests"
	@echo "  make build        # Build for production"
	@echo "  make deploy       # Deploy to production"

# Development
dev: ## Start development environment
	@echo "${BLUE}Starting development environment...${NC}"
	@make dev-deps
	@make dev-services
	@npm run dev

dev-init: ## Initialize development environment
	@echo "${BLUE}Initializing development environment...${NC}"
	@./scripts/setup.sh

dev-deps: ## Install development dependencies
	@echo "${BLUE}Installing dependencies...${NC}"
	@npm install
	@pip3 install -r requirements-dev.txt || true

dev-services: ## Start development services
	@echo "${BLUE}Starting development services...${NC}"
	@docker-compose -f observability/docker-compose.yml up -d
	@echo "${GREEN}Services started${NC}"

dev-stop: ## Stop development services
	@echo "${BLUE}Stopping development services...${NC}"
	@docker-compose -f observability/docker-compose.yml down
	@echo "${GREEN}Services stopped${NC}"

dev-logs: ## Show development logs
	@docker-compose -f observability/docker-compose.yml logs -f

dev-clean: ## Clean development environment
	@echo "${BLUE}Cleaning development environment...${NC}"
	@rm -rf node_modules dist .tmp logs reports
	@docker-compose -f observability/docker-compose.yml down -v
	@echo "${GREEN}Development environment cleaned${NC}"

# Testing
test: ## Run all tests
	@echo "${BLUE}Running all tests...${NC}"
	@make test-unit
	@make test-integration
	@make test-e2e
	@make test-performance

test-unit: ## Run unit tests
	@echo "${BLUE}Running unit tests...${NC}"
	@npm run test:unit -- --coverage

test-integration: ## Run integration tests
	@echo "${BLUE}Running integration tests...${NC}"
	@npm run test:integration

test-e2e: ## Run end-to-end tests
	@echo "${BLUE}Running E2E tests...${NC}"
	@npm run test:e2e

test-performance: ## Run performance tests
	@echo "${BLUE}Running performance tests...${NC}"
	@npm run test:performance

test-smoke: ## Run smoke tests
	@echo "${BLUE}Running smoke tests...${NC}"
	@npm run test:smoke

test-security: ## Run security tests
	@echo "${BLUE}Running security tests...${NC}"
	@npm audit --audit-level=moderate
	@safety check || true
	@trivy fs . || true

test-watch: ## Run tests in watch mode
	@npm run test:watch

test-coverage: ## Generate test coverage report
	@echo "${BLUE}Generating coverage report...${NC}"
	@npm run test:coverage
	@open coverage/lcov-report/index.html

# Code Quality
lint: ## Run linters
	@echo "${BLUE}Running linters...${NC}"
	@npm run lint

lint-fix: ## Fix linting issues
	@echo "${BLUE}Fixing linting issues...${NC}"
	@npm run lint:fix

format: ## Format code
	@echo "${BLUE}Formatting code...${NC}"
	@npm run format

format-check: ## Check code formatting
	@echo "${BLUE}Checking code format...${NC}"
	@npm run format:check

type-check: ## Run TypeScript type checking
	@echo "${BLUE}Running type check...${NC}"
	@npm run type-check

complexity: ## Check code complexity
	@echo "${BLUE}Checking code complexity...${NC}"
	@npm run complexity

quality: lint format-check type-check complexity ## Run all quality checks

# Documentation
docs: ## Generate all documentation
	@echo "${BLUE}Generating documentation...${NC}"
	@make docs-api
	@make docs-code
	@make docs-build

docs-api: ## Generate API documentation
	@echo "${BLUE}Generating API documentation...${NC}"
	@npm run docs:api

docs-code: ## Generate code documentation
	@echo "${BLUE}Generating code documentation...${NC}"
	@npm run docs:code

docs-build: ## Build documentation site
	@echo "${BLUE}Building documentation site...${NC}"
	@npm run docs:build

docs-serve: ## Serve documentation locally
	@echo "${BLUE}Serving documentation...${NC}"
	@npm run docs:serve

docs-check: ## Check documentation coverage
	@echo "${BLUE}Checking documentation coverage...${NC}"
	@npm run docs:coverage

# Building
build: ## Build for production
	@echo "${BLUE}Building for production...${NC}"
	@NODE_ENV=production npm run build
	@echo "${GREEN}Build complete${NC}"

build-docker: ## Build Docker image
	@echo "${BLUE}Building Docker image...${NC}"
	@docker build -t $(IMAGE_NAME):$(VERSION) \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT_SHA=$(COMMIT_SHA) \
		.
	@docker tag $(IMAGE_NAME):$(VERSION) $(IMAGE_NAME):latest
	@echo "${GREEN}Docker image built: $(IMAGE_NAME):$(VERSION)${NC}"

build-analyze: ## Analyze bundle size
	@echo "${BLUE}Analyzing bundle...${NC}"
	@npm run analyze:bundle

# Deployment
deploy: ## Deploy to production
	@echo "${BLUE}Deploying to production...${NC}"
	@make build
	@make deploy-check
	@make deploy-execute
	@make deploy-verify

deploy-staging: ## Deploy to staging
	@echo "${BLUE}Deploying to staging...${NC}"
	@NODE_ENV=staging make deploy

deploy-check: ## Pre-deployment checks
	@echo "${BLUE}Running pre-deployment checks...${NC}"
	@make test-smoke
	@make security-scan

deploy-execute: ## Execute deployment
	@echo "${BLUE}Executing deployment...${NC}"
	@# Add actual deployment commands here
	@echo "${GREEN}Deployment executed${NC}"

deploy-verify: ## Verify deployment
	@echo "${BLUE}Verifying deployment...${NC}"
	@make health
	@make test-smoke

deploy-rollback: ## Rollback deployment
	@echo "${RED}Rolling back deployment...${NC}"
	@# Add rollback commands here
	@echo "${GREEN}Rollback complete${NC}"

# Monitoring
logs: ## Show application logs
	@echo "${BLUE}Showing logs...${NC}"
	@tail -f logs/combined.log

logs-error: ## Show error logs
	@echo "${BLUE}Showing error logs...${NC}"
	@tail -f logs/error.log

metrics: ## Show metrics
	@echo "${BLUE}Opening metrics dashboard...${NC}"
	@open http://localhost:9090

traces: ## Show traces
	@echo "${BLUE}Opening traces dashboard...${NC}"
	@open http://localhost:16686

dashboard: ## Open Grafana dashboard
	@echo "${BLUE}Opening Grafana dashboard...${NC}"
	@open http://localhost:3000

health: ## Check system health
	@echo "${BLUE}Checking system health...${NC}"
	@curl -f http://localhost:$(PORT)/health || echo "${RED}Health check failed${NC}"

monitor: logs metrics traces dashboard ## Open all monitoring tools

# Security
security-scan: ## Run security scans
	@echo "${BLUE}Running security scans...${NC}"
	@make test-security
	@trivy image $(IMAGE_NAME):$(VERSION) || true

security-audit: ## Audit dependencies
	@echo "${BLUE}Auditing dependencies...${NC}"
	@npm audit
	@pip3 list --outdated || true

security-fix: ## Fix security issues
	@echo "${BLUE}Fixing security issues...${NC}"
	@npm audit fix
	@pip3 install --upgrade pip || true

# AI/Claude Integration
ai-review: ## Run AI code review
	@echo "${BLUE}Running AI code review...${NC}"
	@claude-code review --thorough

ai-optimize: ## Run AI optimization
	@echo "${BLUE}Running AI optimization...${NC}"
	@claude-code optimize --target performance

ai-test: ## Generate tests with AI
	@echo "${BLUE}Generating tests with AI...${NC}"
	@claude-code test generate --coverage 90

ai-docs: ## Generate documentation with AI
	@echo "${BLUE}Generating documentation with AI...${NC}"
	@claude-code docs generate

ai-suggest: ## Get AI suggestions
	@echo "${BLUE}Getting AI suggestions...${NC}"
	@claude-code suggest

# Database
db-migrate: ## Run database migrations
	@echo "${BLUE}Running migrations...${NC}"
	@npm run migrate

db-rollback: ## Rollback database
	@echo "${BLUE}Rolling back database...${NC}"
	@npm run migrate:rollback

db-seed: ## Seed database
	@echo "${BLUE}Seeding database...${NC}"
	@npm run db:seed

db-reset: ## Reset database
	@echo "${YELLOW}Resetting database...${NC}"
	@npm run db:reset

# Utilities
clean: ## Clean build artifacts
	@echo "${BLUE}Cleaning build artifacts...${NC}"
	@rm -rf dist build .tmp coverage reports
	@echo "${GREEN}Clean complete${NC}"

install: ## Install all dependencies
	@echo "${BLUE}Installing dependencies...${NC}"
	@npm ci
	@pip3 install -r requirements.txt || true

update: ## Update dependencies
	@echo "${BLUE}Updating dependencies...${NC}"
	@npm update
	@npm audit fix

version: ## Show version information
	@echo "${BLUE}Version Information:${NC}"
	@echo "  Application: $(VERSION)"
	@echo "  Commit: $(COMMIT_SHA)"
	@echo "  Node: $(shell node --version)"
	@echo "  npm: $(shell npm --version)"
	@echo "  Docker: $(shell docker --version)"

benchmark: ## Run benchmarks
	@echo "${BLUE}Running benchmarks...${NC}"
	@npm run benchmark

profile: ## Profile application
	@echo "${BLUE}Profiling application...${NC}"
	@npm run profile

# Git hooks
hooks-install: ## Install git hooks
	@echo "${BLUE}Installing git hooks...${NC}"
	@npx husky install

hooks-uninstall: ## Uninstall git hooks
	@echo "${BLUE}Uninstalling git hooks...${NC}"
	@rm -rf .husky

# Release
release-patch: ## Create patch release
	@npm version patch
	@git push --tags origin main

release-minor: ## Create minor release
	@npm version minor
	@git push --tags origin main

release-major: ## Create major release
	@npm version major
	@git push --tags origin main

changelog: ## Generate changelog
	@echo "${BLUE}Generating changelog...${NC}"
	@npm run changelog

# Quick commands
quick-start: dev-init dev ## Quick start for new developers
quick-test: lint type-check test-unit ## Quick test suite
quick-deploy: test build deploy ## Quick deployment

# CI/CD helpers
ci: lint type-check test-unit test-integration ## Run CI checks
cd: build deploy-check deploy-execute deploy-verify ## Run CD pipeline