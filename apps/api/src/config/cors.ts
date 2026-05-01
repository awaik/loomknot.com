const DEFAULT_PRODUCTION_ORIGIN = 'https://loomknot.com';
const DEFAULT_DEVELOPMENT_ORIGIN = 'http://localhost:8026';

export function getCorsOrigin(): string | string[] {
  const configuredOrigin = process.env.CORS_ORIGIN;
  if (configuredOrigin) {
    const origins = configuredOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    return origins.length === 1 ? origins[0] : origins;
  }

  return process.env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_ORIGIN
    : DEFAULT_DEVELOPMENT_ORIGIN;
}
