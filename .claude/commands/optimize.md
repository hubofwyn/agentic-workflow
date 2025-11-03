# Performance Optimization Command

Analyze and optimize code for maximum performance.

## Optimization Areas

### 1. Algorithm Optimization
- Identify O(n²) or worse complexity
- Suggest more efficient algorithms
- Implement caching strategies
- Optimize data structures

### 2. Database Optimization
- Review query performance
- Add appropriate indexes
- Implement query caching
- Optimize connection pooling

### 3. Memory Optimization
- Identify memory leaks
- Reduce object allocations
- Implement object pooling
- Optimize garbage collection

### 4. Concurrency Optimization
- Identify blocking operations
- Implement async/await properly
- Add parallelization where beneficial
- Optimize thread pool usage

### 5. Network Optimization
- Reduce API calls
- Implement request batching
- Add response caching
- Optimize payload sizes

## Analysis Process

1. **Profile Current Performance**
   ```bash
   # Run performance profiler
   make profile
   ```

2. **Identify Bottlenecks**
   - CPU-bound operations
   - I/O-bound operations
   - Memory allocation hotspots
   - Network latency issues

3. **Apply Optimizations**
   - Algorithmic improvements
   - Caching strategies
   - Lazy loading
   - Memoization

4. **Benchmark Improvements**
   ```bash
   # Run benchmarks
   make benchmark
   ```

5. **Document Changes**
   - Performance improvements
   - Trade-offs made
   - Future optimization opportunities

## Optimization Techniques

### Memoization
```typescript
@Memoize()
function expensiveCalculation(input: string): number {
  // Cached after first call
}
```

### Lazy Loading
```typescript
class DataService {
  private _data?: Data;

  get data(): Data {
    if (!this._data) {
      this._data = this.loadData();
    }
    return this._data;
  }
}
```

### Connection Pooling
```typescript
const pool = new Pool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000
});
```

### Request Batching
```typescript
const batcher = new DataLoader(async (keys) => {
  return await fetchBatch(keys);
});
```

## Expected Output

```markdown
## Performance Optimization Report

### Current Performance
- Latency P50: Xms
- Latency P99: Xms
- Throughput: X req/s
- Memory Usage: X MB

### Optimizations Applied
1. [Optimization description] - X% improvement
2. [Optimization description] - X% improvement

### New Performance
- Latency P50: Xms (-X%)
- Latency P99: Xms (-X%)
- Throughput: X req/s (+X%)
- Memory Usage: X MB (-X%)

### Recommendations
- [Future optimization opportunities]
```

Begin optimization analysis and implementation.