export function getMissingRuntimeConfig() {
  const required = [
    "DATABASE_URL",
    "ENCRYPTION_KEY",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REDIRECT_URI",
  ];

  return required.filter((key) => !process.env[key]);
}

export function getDatabaseConfigError() {
  return !process.env.DATABASE_URL
    ? "DATABASE_URL is not configured. Create .env.local from .env.example and restart npm run dev."
    : null;
}
