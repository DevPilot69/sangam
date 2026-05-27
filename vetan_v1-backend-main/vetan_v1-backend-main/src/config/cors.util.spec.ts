import {
  buildCorsOriginConfig,
  isOriginAllowed,
} from './cors.util';

describe('cors.util', () => {
  const config = buildCorsOriginConfig({
    FRONTEND_URL: 'https://vetan-v1-frontend.vercel.app',
    NODE_ENV: 'production',
  });

  it('allows production Vercel URL', () => {
    expect(
      isOriginAllowed('https://vetan-v1-frontend.vercel.app', config),
    ).toBe(true);
  });

  it('allows Vercel preview deployment URL', () => {
    expect(
      isOriginAllowed(
        'https://vetan-v1-frontend-8dqzmprwb-harshbrickred-9834s-projects.vercel.app',
        config,
      ),
    ).toBe(true);
  });

  it('rejects unrelated origins', () => {
    expect(isOriginAllowed('https://evil.example.com', config)).toBe(false);
  });
});
