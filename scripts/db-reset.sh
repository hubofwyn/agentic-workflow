#!/bin/bash
# Database Reset Script
# Drops all tables, runs migrations, and seeds data

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  WARNING: This will delete all data!${NC}"
read -p "Are you sure you want to reset the database? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "Aborted."
    exit 0
fi

echo -e "${GREEN}📊 Rolling back all migrations...${NC}"
npx knex migrate:rollback --all

echo -e "${GREEN}🔄 Running migrations...${NC}"
npx knex migrate:latest

echo -e "${GREEN}🌱 Seeding database...${NC}"
npx knex seed:run

echo -e "${GREEN}✅ Database reset complete!${NC}"
echo ""
echo "Default users created:"
echo "  - admin@agentic-workflow.dev (Admin)"
echo "  - test@agentic-workflow.dev (Test User)"
echo "  - demo@agentic-workflow.dev (Demo User)"
echo "  - ai@agentic-workflow.dev (AI Agent)"