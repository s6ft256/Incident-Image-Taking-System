/**
 * Centralized Error Handler
 * Provides consistent error handling, logging, and user-friendly messages.
 */

import { sendToast } from '../services/notificationService';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  context?: Record<string, unknown>;
  timestamp: Date;
  stack?: string;
}

type ErrorSeverity = 'info' | 'warning' | 'critical';

const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'NETWORK_OFFLINE': 'You appear to be offline. Changes will sync when connection is restored.',
  'NETWORK_TIMEOUT': 'Request timed out. Please check your connection and try again.',
  'NETWORK_ERROR': 'Network error occurred. Please check your connection.',
  
  // Authentication errors
  'AUTH_FAILED': 'Authentication failed. Please check your credentials.',
  'AUTH_EXPIRED': 'Your session has expired. Please log in again.',
  'AUTH_PERMISSION': 'You do not have permission to perform this action.',
  
  // Data errors
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'DATA_NOT_FOUND': 'The requested data could not be found.',
  'DATA_CONFLICT': 'Data conflict detected. Please refresh and try again.',
  
  // Storage errors
  'STORAGE_FULL': 'Storage is full. Please free up space.',
  'STORAGE_ERROR': 'Failed to save data locally.',
  
  // Upload errors
  'UPLOAD_FAILED': 'File upload failed. Please try again.',
  'UPLOAD_TOO_LARGE': 'File is too large. Maximum size is 10MB.',
  'UPLOAD_INVALID_TYPE': 'Invalid file type. Please upload an image.',
  
  // API errors
  'API_ERROR': 'Service temporarily unavailable. Please try again later.',
  'API_RATE_LIMIT': 'Too many requests. Please wait a moment.',
  
  // Generic
  'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again.'
};

/**
 * Determines error code from various error types
 */
const getErrorCode = (error: unknown): string => {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return navigator.onLine ? 'NETWORK_ERROR' : 'NETWORK_OFFLINE';
  }
  
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'NETWORK_TIMEOUT';
  }
  
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    if (msg.includes('401') || msg.includes('authentication')) return 'AUTH_FAILED';
    if (msg.includes('403') || msg.includes('permission') || msg.includes('access denied')) return 'AUTH_PERMISSION';
    if (msg.includes('404') || msg.includes('not found')) return 'DATA_NOT_FOUND';
    if (msg.includes('422') || msg.includes('validation') || msg.includes('mismatch')) return 'VALIDATION_ERROR';
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('throttl')) return 'API_RATE_LIMIT';
    if (msg.includes('timeout')) return 'NETWORK_TIMEOUT';
    if (msg.includes('quota') || msg.includes('storage')) return 'STORAGE_FULL';
    if (msg.includes('upload')) return 'UPLOAD_FAILED';
    if (msg.includes('offline')) return 'NETWORK_OFFLINE';
  }
  
  return 'UNKNOWN_ERROR';
};

/**
 * Determines severity based on error code
 */
const getSeverity = (code: string): ErrorSeverity => {
  if (code.startsWith('AUTH_') || code === 'API_ERROR' || code === 'UNKNOWN_ERROR') {
    return 'critical';
  }
  if (code.startsWith('NETWORK_') || code === 'API_RATE_LIMIT' || code === 'DATA_CONFLICT') {
    return 'warning';
  }
  return 'info';
};

/**
 * Formats an error into a structured AppError
 */
export const formatError = (error: unknown, context?: Record<string, unknown>): AppError => {
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);
  
  return {
    code,
    message,
    userMessage: ERROR_MESSAGES[code] || ERROR_MESSAGES['UNKNOWN_ERROR'],
    context,
    timestamp: new Date(),
    stack: error instanceof Error ? error.stack : undefined
  };
};

/**
 * Logs error to console with context (can be extended to external logging)
 */
const logError = (appError: AppError): void => {
  const logData = {
    code: appError.code,
    message: appError.message,
    context: appError.context,
    timestamp: appError.timestamp.toISOString()
  };
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.group(`🚨 Error [${appError.code}]`);
    console.error('Message:', appError.message);
    console.error('User Message:', appError.userMessage);
    if (appError.context) console.error('Context:', appError.context);
    if (appError.stack) console.error('Stack:', appError.stack);
    console.groupEnd();
  } else {
    console.error('Application Error:', logData);
  }
  
  // Future: Send to external error tracking service
  // await sendToErrorTracker(appError);
};

/**
 * Main error handler - logs, notifies user, and returns structured error
 */
export const handleError = (
  error: unknown, 
  context?: Record<string, unknown>,
  options?: { silent?: boolean; customMessage?: string }
): AppError => {
  const appError = formatError(error, context);
  
  // Always log
  logError(appError);
  
  // Notify user unless silent
  if (!options?.silent) {
    const severity = getSeverity(appError.code);
    const message = options?.customMessage || appError.userMessage;
    sendToast(message, severity);
  }
  
  return appError;
};

/**
 * Wraps an async function with error handling
 */
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  contextName: string
): ((...args: Parameters<T>) => Promise<ReturnType<T> | null>) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, { function: contextName, args: args.map(a => typeof a) });
      return null;
    }
  };
};

/**
 * Checks if error is recoverable (worth retrying)
 */
export const isRetryableError = (error: unknown): boolean => {
  const code = getErrorCode(error);
  return ['NETWORK_ERROR', 'NETWORK_TIMEOUT', 'API_RATE_LIMIT', 'API_ERROR'].includes(code);
};

/**
 * Retry utility with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number; context?: string }
): Promise<T> => {
  const { maxRetries = 3, baseDelayMs = 1000, context = 'operation' } = options || {};
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt);
      if (import.meta.env.DEV) {
        console.warn(`Retry ${attempt + 1}/${maxRetries} for ${context} in ${delay}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};
