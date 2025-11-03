#!/bin/bash
# Agentic Workflow Setup Script
# Automated environment setup with comprehensive checks and configuration

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        log_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
    log_info "Detected OS: $OS"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install package based on OS
install_package() {
    local package=$1
    log_info "Installing $package..."

    if [[ "$OS" == "macos" ]]; then
        if command_exists brew; then
            brew install "$package"
        else
            log_error "Homebrew not installed. Please install from https://brew.sh"
            exit 1
        fi
    elif [[ "$OS" == "linux" ]]; then
        if command_exists apt-get; then
            sudo apt-get update && sudo apt-get install -y "$package"
        elif command_exists yum; then
            sudo yum install -y "$package"
        elif command_exists pacman; then
            sudo pacman -S --noconfirm "$package"
        else
            log_error "No supported package manager found"
            exit 1
        fi
    else
        log_error "Package installation not supported on Windows. Please install $package manually."
        exit 1
    fi
}

# Check and install prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Node.js
    if ! command_exists node; then
        log_warning "Node.js not found. Installing..."
        if [[ "$OS" == "macos" ]]; then
            install_package node
        else
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            install_package nodejs
        fi
    else
        log_success "Node.js $(node --version) found"
    fi

    # npm
    if ! command_exists npm; then
        log_error "npm not found. Please install Node.js with npm"
        exit 1
    else
        log_success "npm $(npm --version) found"
    fi

    # Python
    if ! command_exists python3; then
        log_warning "Python3 not found. Installing..."
        install_package python3
    else
        log_success "Python $(python3 --version) found"
    fi

    # Git
    if ! command_exists git; then
        log_warning "Git not found. Installing..."
        install_package git
    else
        log_success "Git $(git --version) found"
    fi

    # Docker
    if ! command_exists docker; then
        log_warning "Docker not found. Installing..."
        if [[ "$OS" == "macos" ]]; then
            log_info "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
        else
            curl -fsSL https://get.docker.com | sh
            sudo usermod -aG docker $USER
            log_warning "Please log out and back in for Docker group changes to take effect"
        fi
    else
        log_success "Docker $(docker --version) found"
    fi

    # Docker Compose
    if ! command_exists docker-compose; then
        log_warning "Docker Compose not found. Installing..."
        if [[ "$OS" == "linux" ]]; then
            sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
    else
        log_success "Docker Compose $(docker-compose --version) found"
    fi
}

# Install Claude Code CLI
install_claude_cli() {
    log_info "Installing Claude Code CLI..."

    # Check if already installed
    if command_exists claude-code; then
        log_success "Claude Code CLI already installed"
        return
    fi

    # Install globally
    npm install -g @anthropic/claude-code-cli

    # Configure Claude Code
    if [[ -n "${CLAUDE_API_KEY:-}" ]]; then
        claude-code config set api-key "$CLAUDE_API_KEY"
        log_success "Claude Code CLI configured with API key"
    else
        log_warning "CLAUDE_API_KEY not set. Please configure manually with: claude-code config set api-key YOUR_KEY"
    fi
}

# Setup development environment
setup_development_env() {
    log_info "Setting up development environment..."

    # Create necessary directories
    mkdir -p logs
    mkdir -p reports/{quality,tests,performance}
    mkdir -p .tmp
    mkdir -p data

    # Install Node.js dependencies
    log_info "Installing Node.js dependencies..."
    npm install

    # Install Python dependencies
    if [[ -f "requirements.txt" ]]; then
        log_info "Installing Python dependencies..."
        pip3 install -r requirements.txt
    fi

    # Setup git hooks
    log_info "Setting up git hooks..."
    npx husky install

    # Create .env file from example
    if [[ ! -f ".env" ]] && [[ -f ".env.example" ]]; then
        log_info "Creating .env file from example..."
        cp .env.example .env
        log_warning "Please update .env file with your configuration"
    fi

    log_success "Development environment setup complete"
}

# Start observability stack
start_observability() {
    log_info "Starting observability stack..."

    cd observability

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi

    # Start services
    docker-compose up -d

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check service health
    if curl -f http://localhost:9090 >/dev/null 2>&1; then
        log_success "Prometheus is running at http://localhost:9090"
    fi

    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        log_success "Grafana is running at http://localhost:3000 (admin/admin)"
    fi

    if curl -f http://localhost:16686 >/dev/null 2>&1; then
        log_success "Jaeger is running at http://localhost:16686"
    fi

    cd ..
    log_success "Observability stack started successfully"
}

# Initialize database
init_database() {
    log_info "Initializing database..."

    # Check if PostgreSQL is running
    if ! command_exists psql; then
        log_warning "PostgreSQL client not installed. Skipping database initialization."
        return
    fi

    # Run migrations
    if [[ -f "migrations/init.sql" ]]; then
        psql -U postgres -f migrations/init.sql
        log_success "Database initialized"
    fi
}

# Configure IDE
configure_ide() {
    log_info "Configuring IDE settings..."

    # VS Code settings
    if [[ -d ".vscode" ]]; then
        log_info "VS Code configuration found"
    else
        mkdir -p .vscode
        cat > .vscode/settings.json <<EOF
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "typescript.preferences.importModuleSpecifier": "relative",
    "files.exclude": {
        "**/.git": true,
        "**/node_modules": true,
        "**/dist": true
    }
}
EOF
        log_success "VS Code configured"
    fi
}

# Run initial tests
run_initial_tests() {
    log_info "Running initial tests..."

    # Lint check
    npm run lint || log_warning "Linting issues found"

    # Type check
    npm run type-check || log_warning "Type checking issues found"

    # Run tests
    npm test || log_warning "Some tests failed"

    log_info "Initial tests complete"
}

# Generate initial documentation
generate_docs() {
    log_info "Generating initial documentation..."

    # API documentation
    npm run docs:api || log_warning "API documentation generation failed"

    # Code documentation
    npm run docs:code || log_warning "Code documentation generation failed"

    log_success "Documentation generated"
}

# Main setup flow
main() {
    echo "======================================"
    echo "   Agentic Workflow Setup Script     "
    echo "======================================"
    echo

    # Detect operating system
    detect_os

    # Check and install prerequisites
    check_prerequisites

    # Install Claude Code CLI
    install_claude_cli

    # Setup development environment
    setup_development_env

    # Configure IDE
    configure_ide

    # Start observability stack
    read -p "Start observability stack? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_observability
    fi

    # Initialize database
    read -p "Initialize database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        init_database
    fi

    # Run initial tests
    read -p "Run initial tests? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_initial_tests
    fi

    # Generate documentation
    read -p "Generate documentation? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        generate_docs
    fi

    echo
    echo "======================================"
    log_success "Setup complete!"
    echo "======================================"
    echo
    echo "Next steps:"
    echo "1. Update .env file with your configuration"
    echo "2. Configure your Claude API key: claude-code config set api-key YOUR_KEY"
    echo "3. Run 'make dev' to start development"
    echo "4. Visit http://localhost:3000 for the application"
    echo "5. Visit http://localhost:3000 for Grafana dashboards"
    echo
}

# Run main function
main "$@"