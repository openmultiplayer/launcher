// Performance monitoring and optimization utilities

import React from "react";
import { DEBUG_MODE } from "../constants/app";

export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  static time(name: string): () => void {
    const start = performance.now();

    return () => {
      const end = performance.now();
      const duration = end - start;

      if (!this.metrics.has(name)) {
        this.metrics.set(name, []);
      }

      const measurements = this.metrics.get(name)!;
      measurements.push(duration);

      // Keep only last 100 measurements
      if (measurements.length > 100) {
        measurements.shift();
      }

      // Log slow operations in development
      if (DEBUG_MODE && duration > 16) {
        console.warn(
          `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`
        );
      }
    };
  }

  static getMetrics(
    name: string
  ): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.metrics.get(name);
    if (!measurements || measurements.length === 0) return null;

    const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  static getAllMetrics(): Record<
    string,
    ReturnType<typeof PerformanceMonitor.getMetrics>
  > {
    const result: Record<string, any> = {};

    for (const [name] of this.metrics) {
      result[name] = this.getMetrics(name);
    }

    return result;
  }

  static clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }
}

// React performance optimization hooks
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const ref = React.useRef<T>(callback);

  React.useEffect(() => {
    ref.current = callback;
  }, deps);

  return React.useCallback(
    ((...args: any[]) => {
      return ref.current(...args);
    }) as T,
    []
  );
};

export const usePrevious = <T>(value: T): T | undefined => {
  const ref = React.useRef<T>();

  React.useEffect(() => {
    ref.current = value;
  });

  return ref.current;
};

export const useDeepCompareMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  const ref = React.useRef<{ deps: React.DependencyList; value: T }>();

  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = { deps, value: factory() };
  }

  return ref.current.value;
};

// Deep equality check for dependencies
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    if (aKeys.length !== bKeys.length) return false;

    return aKeys.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

// Memory usage monitoring
export class MemoryMonitor {
  static logMemoryUsage(label?: string): void {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      console.log(`Memory usage ${label ? `(${label})` : ""}:`, {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
      });
    }
  }

  static isMemoryPressure(): boolean {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      return usage > 0.85; // Consider 85% as high memory usage
    }
    return false;
  }
}

// Bundle size analyzer
export const analyzeBundleSize = async (): Promise<void> => {
  if (DEBUG_MODE) {
    console.group("Bundle Analysis");

    // Analyze loaded modules
    const modules = Array.from(document.querySelectorAll("script[src]"));
    let totalSize = 0;

    for (const script of modules) {
      try {
        const src = (script as HTMLScriptElement).src;
        const response = await fetch(src, { method: "HEAD" });
        const size = parseInt(response.headers.get("content-length") || "0");
        totalSize += size;

        if (size > 100000) {
          // Log large chunks (>100KB)
          console.log(
            `Large chunk: ${src.split("/").pop()} - ${(size / 1024).toFixed(
              2
            )} KB`
          );
        }
      } catch (error) {
        // Ignore CORS errors for external resources
      }
    }

    console.log(
      `Total estimated bundle size: ${(totalSize / 1024).toFixed(2)} KB`
    );
    console.groupEnd();
  }
};

export default PerformanceMonitor;
