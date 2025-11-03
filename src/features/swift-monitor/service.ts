/**
 * Swift Development Monitoring Service
 * Handles build monitoring, test tracking, and code analysis
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { logger } from '../../lib/logger';
import { metricsCollector } from '../../lib/metrics';

export interface BuildStatus {
  status: 'idle' | 'building' | 'success' | 'failed';
  target?: string;
  configuration?: string;
  duration?: number;
  warnings: string[];
  errors: string[];
  timestamp: string;
}

export interface TestResults {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  coverage: number;
  duration: number;
  failures: TestFailure[];
  timestamp: string;
}

export interface TestFailure {
  test: string;
  message: string;
  file?: string;
  line?: number;
}

export interface CodeMetrics {
  files: number;
  lines: number;
  classes: number;
  functions: number;
  complexity: {
    average: number;
    max: number;
    distribution: Record<string, number>;
  };
  coverage: number;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  timestamp: string;
}

export class SwiftMonitorService {
  private readonly projectPath = path.resolve(__dirname, '../../../../FilePilot');
  private buildProcess?: ChildProcess;
  private testProcess?: ChildProcess;
  private fileWatcher?: chokidar.FSWatcher;
  private buildStatus: BuildStatus = {
    status: 'idle',
    warnings: [],
    errors: [],
    timestamp: new Date().toISOString()
  };
  private latestTestResults?: TestResults;
  private fileChanges: FileChange[] = [];

  constructor() {
    this.initializeFileWatcher();
  }

  /**
   * Initialize file watcher for Swift files
   */
  private initializeFileWatcher(): void {
    const watchPath = path.join(this.projectPath, '**/*.swift');

    this.fileWatcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    this.fileWatcher
      .on('add', (path) => this.handleFileChange(path, 'added'))
      .on('change', (path) => this.handleFileChange(path, 'modified'))
      .on('unlink', (path) => this.handleFileChange(path, 'deleted'));

    logger.info('Swift file watcher initialized', { path: watchPath });
  }

  /**
   * Handle file change events
   */
  private handleFileChange(filePath: string, type: 'added' | 'modified' | 'deleted'): void {
    const change: FileChange = {
      path: filePath,
      type,
      timestamp: new Date().toISOString()
    };

    this.fileChanges.push(change);

    // Keep only last 100 changes
    if (this.fileChanges.length > 100) {
      this.fileChanges.shift();
    }

    logger.debug('Swift file changed', change);

    metricsCollector.increment('swift.files.changes', {
      type
    });

    // Auto-trigger build on file changes (optional)
    if (process.env.AUTO_BUILD === 'true' && type !== 'deleted') {
      this.startBuild({ configuration: 'Debug' });
    }
  }

  /**
   * Get current build status
   */
  async getBuildStatus(): Promise<BuildStatus> {
    return this.buildStatus;
  }

  /**
   * Start a build
   */
  async startBuild(options: {
    configuration?: string;
    clean?: boolean;
  }): Promise<string> {
    const buildId = `build_${Date.now()}`;
    const startTime = Date.now();

    this.buildStatus = {
      status: 'building',
      target: 'FilePilot',
      configuration: options.configuration || 'Debug',
      warnings: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    // Kill existing build if any
    if (this.buildProcess) {
      this.buildProcess.kill();
    }

    // Build command
    const args = ['build'];
    if (options.clean) {
      args.push('clean', 'build');
    }
    args.push('-configuration', options.configuration || 'Debug');

    this.buildProcess = spawn('xcodebuild', args, {
      cwd: this.projectPath
    });

    let output = '';

    this.buildProcess.stdout?.on('data', (data) => {
      output += data.toString();
      this.parseBuildOutput(data.toString());
    });

    this.buildProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      this.buildStatus.errors.push(error);
      logger.error('Build error', { error });
    });

    this.buildProcess.on('close', (code) => {
      const duration = Date.now() - startTime;

      this.buildStatus = {
        ...this.buildStatus,
        status: code === 0 ? 'success' : 'failed',
        duration,
        timestamp: new Date().toISOString()
      };

      logger.info('Build completed', {
        buildId,
        status: this.buildStatus.status,
        duration
      });

      metricsCollector.histogram('swift.build.duration', duration);
      metricsCollector.increment('swift.builds.completed', {
        status: this.buildStatus.status
      });
    });

    return buildId;
  }

  /**
   * Parse build output for warnings and errors
   */
  private parseBuildOutput(output: string): void {
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('warning:')) {
        this.buildStatus.warnings.push(line);
      } else if (line.includes('error:')) {
        this.buildStatus.errors.push(line);
      }
    }
  }

  /**
   * Run tests
   */
  async runTests(target: string): Promise<string> {
    const testRunId = `test_${Date.now()}`;
    const startTime = Date.now();

    // Kill existing test if any
    if (this.testProcess) {
      this.testProcess.kill();
    }

    this.testProcess = spawn('xcodebuild', [
      'test',
      '-scheme', 'FilePilot',
      '-destination', 'platform=macOS'
    ], {
      cwd: this.projectPath
    });

    let output = '';
    let passed = 0;
    let failed = 0;
    const failures: TestFailure[] = [];

    this.testProcess.stdout?.on('data', (data) => {
      output += data.toString();
      const lines = data.toString().split('\n');

      for (const line of lines) {
        if (line.includes('Test Case') && line.includes('passed')) {
          passed++;
        } else if (line.includes('Test Case') && line.includes('failed')) {
          failed++;
          // Parse failure details
          const match = line.match(/Test Case '(.+)' failed \((.+)\)/);
          if (match) {
            failures.push({
              test: match[1],
              message: match[2]
            });
          }
        }
      }
    });

    this.testProcess.on('close', (code) => {
      const duration = Date.now() - startTime;
      const total = passed + failed;

      this.latestTestResults = {
        suite: target,
        total,
        passed,
        failed,
        skipped: 0,
        coverage: this.extractCoverage(output),
        duration,
        failures,
        timestamp: new Date().toISOString()
      };

      logger.info('Tests completed', {
        testRunId,
        passed,
        failed,
        duration
      });

      metricsCollector.histogram('swift.tests.duration', duration);
      metricsCollector.gauge('swift.tests.pass_rate', (passed / total) * 100);
    });

    return testRunId;
  }

  /**
   * Extract coverage from test output
   */
  private extractCoverage(output: string): number {
    const match = output.match(/Test Coverage: ([\d.]+)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  /**
   * Get latest test results
   */
  async getLatestTestResults(): Promise<TestResults> {
    if (!this.latestTestResults) {
      // Return empty results if no tests have been run
      return {
        suite: 'FilePilotTests',
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: 0,
        duration: 0,
        failures: [],
        timestamp: new Date().toISOString()
      };
    }

    return this.latestTestResults;
  }

  /**
   * Get code metrics
   */
  async getCodeMetrics(): Promise<CodeMetrics> {
    const swiftFiles = await this.findSwiftFiles();
    let totalLines = 0;
    let totalClasses = 0;
    let totalFunctions = 0;
    const complexities: number[] = [];

    for (const file of swiftFiles) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      totalLines += lines.length;

      // Simple parsing (could be enhanced with proper Swift parser)
      totalClasses += (content.match(/\bclass\s+\w+/g) || []).length;
      totalClasses += (content.match(/\bstruct\s+\w+/g) || []).length;
      totalFunctions += (content.match(/\bfunc\s+\w+/g) || []).length;

      // Simple cyclomatic complexity (count decision points)
      const complexity = this.calculateComplexity(content);
      complexities.push(complexity);
    }

    const avgComplexity = complexities.length > 0
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length
      : 0;

    const maxComplexity = Math.max(...complexities, 0);

    return {
      files: swiftFiles.length,
      lines: totalLines,
      classes: totalClasses,
      functions: totalFunctions,
      complexity: {
        average: avgComplexity,
        max: maxComplexity,
        distribution: this.getComplexityDistribution(complexities)
      },
      coverage: this.latestTestResults?.coverage || 0
    };
  }

  /**
   * Find all Swift files in project
   */
  private async findSwiftFiles(): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.swift')) {
          files.push(fullPath);
        }
      }
    }

    await walk(this.projectPath);
    return files;
  }

  /**
   * Calculate cyclomatic complexity
   */
  private calculateComplexity(content: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const decisionPatterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\brepeat\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\?/g, // nil-coalescing
      /\?/g    // optional chaining (simplified)
    ];

    for (const pattern of decisionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Get complexity distribution
   */
  private getComplexityDistribution(complexities: number[]): Record<string, number> {
    const distribution: Record<string, number> = {
      low: 0,     // 1-5
      medium: 0,  // 6-10
      high: 0,    // 11-20
      critical: 0 // 20+
    };

    for (const complexity of complexities) {
      if (complexity <= 5) {
        distribution.low++;
      } else if (complexity <= 10) {
        distribution.medium++;
      } else if (complexity <= 20) {
        distribution.high++;
      } else {
        distribution.critical++;
      }
    }

    return distribution;
  }

  /**
   * Analyze a specific file
   */
  async analyzeFile(filePath: string): Promise<any> {
    const fullPath = path.resolve(this.projectPath, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    const lines = content.split('\n');
    const classes = (content.match(/\b(class|struct|enum)\s+\w+/g) || []);
    const functions = (content.match(/\bfunc\s+\w+/g) || []);
    const complexity = this.calculateComplexity(content);

    return {
      path: filePath,
      lines: lines.length,
      classes: classes.length,
      functions: functions.length,
      complexity,
      hasTests: filePath.includes('Tests'),
      imports: this.extractImports(content),
      todos: this.extractTodos(content)
    };
  }

  /**
   * Extract imports from Swift file
   */
  private extractImports(content: string): string[] {
    const imports = content.match(/^import\s+(\w+)/gm) || [];
    return imports.map(imp => imp.replace('import ', ''));
  }

  /**
   * Extract TODO comments
   */
  private extractTodos(content: string): string[] {
    const todos = content.match(/\/\/\s*(TODO|FIXME|HACK):?\s*(.+)/gi) || [];
    return todos;
  }

  /**
   * Get file changes
   */
  async getFileChanges(): Promise<FileChange[]> {
    return this.fileChanges;
  }

  /**
   * Get logs
   */
  async getLogs(options: { lines: number; filter?: string }): Promise<string[]> {
    // In production, this would read from actual log files
    // For now, return recent build/test output
    return [
      `Build status: ${this.buildStatus.status}`,
      ...this.buildStatus.warnings.slice(-options.lines / 2),
      ...this.buildStatus.errors.slice(-options.lines / 2)
    ];
  }

  /**
   * Check health of Swift development environment
   */
  async checkHealth(): Promise<Record<string, boolean>> {
    const checks: Record<string, boolean> = {};

    // Check Xcode is installed
    try {
      await this.executeCommand('xcodebuild', ['-version']);
      checks.xcode = true;
    } catch {
      checks.xcode = false;
    }

    // Check Swift compiler
    try {
      await this.executeCommand('swift', ['--version']);
      checks.swift = true;
    } catch {
      checks.swift = false;
    }

    // Check project exists
    try {
      await fs.access(this.projectPath);
      checks.project = true;
    } catch {
      checks.project = false;
    }

    // Check SwiftLint (optional)
    try {
      await this.executeCommand('swiftlint', ['version']);
      checks.swiftlint = true;
    } catch {
      checks.swiftlint = false;
    }

    return checks;
  }

  /**
   * Execute command and return output
   */
  private executeCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args);
      let output = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.buildProcess) {
      this.buildProcess.kill();
    }
    if (this.testProcess) {
      this.testProcess.kill();
    }
    if (this.fileWatcher) {
      await this.fileWatcher.close();
    }
  }
}