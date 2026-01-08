/**
 * Retry Utilities
 * Provides retry logic with exponential backoff, timeout wrappers, and circuit breaker
 */

// ============================================================================
// Types
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Jitter factor (0-1) to add randomness */
  jitterFactor: number;
  /** Retryable error types or predicate */
  retryOn?: (error: Error) => boolean;
}

export interface TimeoutConfig {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Error message on timeout */
  timeoutMessage?: string;
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close circuit */
  resetTimeoutMs: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryOn: (error: Error) => {
    // Retry on rate limits, timeouts, and transient errors
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket hang up') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502')
    );
  },
};

export const DEFAULT_LLM_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 15000,
};

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  timeoutMs: 30000, // 30 seconds
  timeoutMessage: 'Operation timed out',
};

export const DEFAULT_LLM_TIMEOUT_CONFIG: TimeoutConfig = {
  timeoutMs: 60000, // 60 seconds for LLM calls
  timeoutMessage: 'LLM request timed out',
};

// ============================================================================
// Retry Implementation
// ============================================================================

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = cappedDelay * config.jitterFactor * Math.random();
  return cappedDelay + jitter;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      const shouldRetry = fullConfig.retryOn?.(lastError) ?? true;
      
      if (!shouldRetry || attempt >= fullConfig.maxRetries) {
        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
          totalTimeMs: Date.now() - startTime,
        };
      }

      // Calculate and wait for delay
      const delay = calculateDelay(attempt, fullConfig);
      console.log(
        `[Retry] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms: ${lastError.message}`
      );
      await sleep(delay);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: fullConfig.maxRetries + 1,
    totalTimeMs: Date.now() - startTime,
  };
}

/**
 * Execute a function with retry, throwing on final failure
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const result = await withRetry(fn, config);
  
  if (!result.success) {
    const error = result.error || new Error('Unknown error after retries');
    error.message = `Failed after ${result.attempts} attempts (${result.totalTimeMs}ms): ${error.message}`;
    throw error;
  }
  
  return result.data!;
}

// ============================================================================
// Timeout Implementation
// ============================================================================

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  config: Partial<TimeoutConfig> = {}
): Promise<T> {
  const { timeoutMs, timeoutMessage } = { ...DEFAULT_TIMEOUT_CONFIG, ...config };

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Execute a function with both timeout and retry
 */
export async function withTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  options: {
    timeout?: Partial<TimeoutConfig>;
    retry?: Partial<RetryConfig>;
  } = {}
): Promise<T> {
  return retryAsync(
    () => withTimeout(fn(), options.timeout),
    options.retry
  );
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

interface CircuitState {
  failures: number;
  lastFailure: number | null;
  state: 'closed' | 'open' | 'half-open';
}

const circuitStates = new Map<string, CircuitState>();

/**
 * Execute a function with circuit breaker pattern
 */
export async function withCircuitBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  config: CircuitBreakerConfig = { failureThreshold: 5, resetTimeoutMs: 30000 }
): Promise<T> {
  let state = circuitStates.get(key);
  
  if (!state) {
    state = { failures: 0, lastFailure: null, state: 'closed' };
    circuitStates.set(key, state);
  }

  // Check if circuit should reset
  if (state.state === 'open' && state.lastFailure) {
    const timeSinceFailure = Date.now() - state.lastFailure;
    if (timeSinceFailure >= config.resetTimeoutMs) {
      state.state = 'half-open';
    }
  }

  // Reject if circuit is open
  if (state.state === 'open') {
    throw new Error(`Circuit breaker open for ${key}. Service temporarily unavailable.`);
  }

  try {
    const result = await fn();
    
    // Success - reset state
    state.failures = 0;
    state.state = 'closed';
    
    return result;
  } catch (error) {
    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= config.failureThreshold) {
      state.state = 'open';
      console.error(`[CircuitBreaker] Circuit opened for ${key} after ${state.failures} failures`);
    }
    
    throw error;
  }
}

/**
 * Reset a circuit breaker
 */
export function resetCircuitBreaker(key: string): void {
  circuitStates.delete(key);
}

/**
 * Get circuit breaker status
 */
export function getCircuitBreakerStatus(key: string): CircuitState | null {
  return circuitStates.get(key) || null;
}
