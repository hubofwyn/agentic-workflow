/**
 * Unit tests for Metrics Collector
 */

import { MetricsCollector, MetricType } from '../../../src/lib/metrics';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector('test-service');
  });

  describe('increment', () => {
    it('should increment counter metric', () => {
      expect(() => {
        collector.increment('test.counter');
      }).not.toThrow();
    });

    it('should increment counter with custom value', () => {
      expect(() => {
        collector.increment('test.counter', {}, 5);
      }).not.toThrow();
    });

    it('should increment counter with tags', () => {
      expect(() => {
        collector.increment('test.counter', { environment: 'test' });
      }).not.toThrow();
    });
  });

  describe('histogram', () => {
    it('should record histogram value', () => {
      expect(() => {
        collector.histogram('test.histogram', 100);
      }).not.toThrow();
    });

    it('should record histogram with tags', () => {
      expect(() => {
        collector.histogram('test.histogram', 100, { operation: 'test' });
      }).not.toThrow();
    });
  });

  describe('gauge', () => {
    it('should set gauge value', () => {
      collector.gauge('test.gauge', 42);
      expect(collector.getGaugeValue('test.gauge')).toBe(42);
    });

    it('should update gauge value', () => {
      collector.gauge('test.gauge', 10);
      collector.gauge('test.gauge', 20);
      expect(collector.getGaugeValue('test.gauge')).toBe(20);
    });
  });

  describe('recordHttpRequest', () => {
    it('should record successful HTTP request', () => {
      expect(() => {
        collector.recordHttpRequest('GET', '/api/users', 200, 150);
      }).not.toThrow();
    });

    it('should record failed HTTP request', () => {
      expect(() => {
        collector.recordHttpRequest('POST', '/api/users', 500, 250);
      }).not.toThrow();
    });

    it('should record client error', () => {
      expect(() => {
        collector.recordHttpRequest('GET', '/api/users/999', 404, 50);
      }).not.toThrow();
    });
  });

  describe('recordOperation', () => {
    it('should record successful operation', () => {
      expect(() => {
        collector.recordOperation('database.query', 100, true);
      }).not.toThrow();
    });

    it('should record failed operation', () => {
      expect(() => {
        collector.recordOperation('database.query', 200, false);
      }).not.toThrow();
    });

    it('should record operation with tags', () => {
      expect(() => {
        collector.recordOperation('api.call', 150, true, { service: 'external' });
      }).not.toThrow();
    });
  });

  describe('time', () => {
    it('should time async function', async () => {
      const result = await collector.time('test.operation', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should time function and handle errors', async () => {
      await expect(
        collector.time('test.operation', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('startTimer', () => {
    it('should create timer and return duration', done => {
      const timer = collector.startTimer('test.timer');

      setTimeout(() => {
        const duration = timer.end();
        expect(duration).toBeGreaterThan(0);
        done();
      }, 10);
    });

    it('should accept additional tags on end', done => {
      const timer = collector.startTimer('test.timer', { initial: 'tag' });

      setTimeout(() => {
        timer.end({ additional: 'tag' });
        done();
      }, 10);
    });
  });

  describe('record', () => {
    it('should record counter metric', () => {
      expect(() => {
        collector.record({
          name: 'test.custom.counter',
          value: 1,
          type: MetricType.COUNTER
        });
      }).not.toThrow();
    });

    it('should record histogram metric', () => {
      expect(() => {
        collector.record({
          name: 'test.custom.histogram',
          value: 100,
          type: MetricType.HISTOGRAM
        });
      }).not.toThrow();
    });

    it('should record gauge metric', () => {
      collector.record({
        name: 'test.custom.gauge',
        value: 50,
        type: MetricType.GAUGE
      });

      expect(collector.getGaugeValue('test.custom.gauge')).toBe(50);
    });
  });
});