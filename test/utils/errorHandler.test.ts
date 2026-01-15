import { formatError, isRetryableError, handleError } from '../../utils/errorHandler';

describe('errorHandler utils', () => {
  test('formatError returns user-friendly structure for TypeError fetch', () => {
    const err = new TypeError('Failed to fetch');
    const formatted = formatError(err, { operation: 'test' });

    expect(formatted).toHaveProperty('code');
    expect(formatted).toHaveProperty('message');
    expect(formatted).toHaveProperty('userMessage');
    expect(formatted.context).toMatchObject({ operation: 'test' });
    expect(formatted.userMessage.length).toBeGreaterThan(0);
  });

  test('isRetryableError flags network and rate limit issues', () => {
    const networkErr = new TypeError('Failed to fetch');
    expect(isRetryableError(networkErr)).toBe(true);

    const rateLimitErr = new Error('429 Too Many Requests');
    expect(isRetryableError(rateLimitErr)).toBe(true);

    const authErr = new Error('401 Unauthorized');
    expect(isRetryableError(authErr)).toBe(false);
  });

  describe('handleError', () => {
    it('should return a default error message for unknown errors', () => {
      const result = handleError(new Error('Unknown error'));
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    });

    it('should return a specific error message for known errors', () => {
      const result = handleError({ message: 'Network error' });
      expect(result.userMessage).toBe('Network error');
    });

    it('should handle empty error objects gracefully', () => {
      const result = handleError({});
      expect(result.userMessage).toBe('An unexpected error occurred. Please try again.');
    });
  });
});
