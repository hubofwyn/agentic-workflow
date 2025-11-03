# Multi-stage Dockerfile for Agentic Workflow
# Optimized for production with minimal attack surface

# Stage 1: Dependencies
FROM node:25-alpine AS dependencies
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy dependency files
COPY package*.json ./
COPY .npmrc* ./

# Install production dependencies
RUN npm ci --only=production

# Stage 2: Build
FROM node:25-alpine AS build
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy dependency files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Run tests
RUN npm run test:unit

# Stage 3: Production
FROM node:25-alpine AS production
WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    tini

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Copy configuration files
COPY --chown=nodejs:nodejs .env.example .env

# Create necessary directories
RUN mkdir -p logs reports && \
    chown -R nodejs:nodejs logs reports

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Switch to non-root user
USER nodejs

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]