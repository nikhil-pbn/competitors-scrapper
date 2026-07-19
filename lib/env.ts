/**
 * Centralized, validated access to server-side environment variables.
 *
 * Import these getters from server code only (services / route handlers). They
 * throw a clear error at call time if a required variable is missing, instead
 * of failing deep inside an API client.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

export function getAhrefsApiKey(): string {
  return required("AHREFS_API_KEY");
}

export function getSpreadsheetId(): string {
  return required("GOOGLE_SHEETS_SPREADSHEET_ID");
}

export function getServiceAccountEmail(): string {
  return required("GOOGLE_SERVICE_ACCOUNT_EMAIL");
}

/**
 * The private key is stored in .env with literal "\n" sequences (env files
 * cannot hold real newlines), so we convert them back to real newlines here.
 */
export function getServiceAccountPrivateKey(): string {
  return required("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
}
