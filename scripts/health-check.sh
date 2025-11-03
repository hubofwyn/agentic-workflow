#!/bin/bash
# Health Check Script
# Checks all services are running and healthy

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_URL=${APP_URL:-"http://localhost:3000"}
GRAFANA_URL=${GRAFANA_URL:-"http://localhost:3000"}
PROMETHEUS_URL=${PROMETHEUS_URL:-"http://localhost:9090"}
JAEGER_URL=${JAEGER_URL:-"http://localhost:16686"}

echo -e "${BLUE}🏥 Running health checks...${NC}\n"

# Check application
echo -n "Application... "
if curl -sf "${APP_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check readiness
echo -n "Readiness... "
if curl -sf "${APP_URL}/health/ready" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check liveness
echo -n "Liveness... "
if curl -sf "${APP_URL}/health/live" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check Grafana
echo -n "Grafana... "
if curl -sf "${GRAFANA_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check Prometheus
echo -n "Prometheus... "
if curl -sf "${PROMETHEUS_URL}/-/healthy" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Check Jaeger
echo -n "Jaeger... "
if curl -sf "${JAEGER_URL}/" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo ""
echo -e "${GREEN}Health check complete!${NC}"