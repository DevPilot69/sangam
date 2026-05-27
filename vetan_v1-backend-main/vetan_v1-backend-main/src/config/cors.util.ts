/**
 * CORS for split deployment: API on Render, web on Vercel.
 * Allows FRONTEND_URL plus Vercel preview hosts (same project prefix).
 */
export type CorsOriginConfig = {
  frontendUrl: string;
  extraOrigins?: string[];
  nodeEnv: string;
};

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/$/, '');
}

function parseExtraOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

export function buildCorsOriginConfig(env: {
  FRONTEND_URL: string;
  CORS_EXTRA_ORIGINS?: string;
  NODE_ENV: string;
}): CorsOriginConfig {
  return {
    frontendUrl: normalizeOrigin(env.FRONTEND_URL),
    extraOrigins: parseExtraOrigins(env.CORS_EXTRA_ORIGINS),
    nodeEnv: env.NODE_ENV,
  };
}

export function isOriginAllowed(
  origin: string | undefined,
  config: CorsOriginConfig,
): boolean {
  // Non-browser clients (no Origin header)
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  const explicit = new Set([
    config.frontendUrl,
    ...(config.extraOrigins ?? []),
  ]);
  if (explicit.has(normalized)) return true;

  if (config.nodeEnv === 'development') {
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized)) return true;
    if (/^https?:\/\/localhost(:\d+)?$/.test(normalized)) return true;
  }

  try {
    const prod = new URL(config.frontendUrl);
    const req = new URL(normalized);
    if (req.protocol !== prod.protocol) return false;

    // Vercel production + preview: vetan-v1-frontend.vercel.app, vetan-v1-frontend-*-*.vercel.app
    if (prod.hostname.endsWith('.vercel.app') && req.hostname.endsWith('.vercel.app')) {
      const prefix = prod.hostname.replace(/\.vercel\.app$/, '');
      if (req.hostname === prod.hostname) return true;
      if (req.hostname.startsWith(`${prefix}-`)) return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function createCorsOriginDelegate(config: CorsOriginConfig) {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (isOriginAllowed(origin, config)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  };
}
