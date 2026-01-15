import { formatError, isRetryableError } from '../../utils/errorHandler';

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
});
