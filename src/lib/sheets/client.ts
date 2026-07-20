import "server-only";

import { google, type sheets_v4 } from "googleapis";

import {
  getServiceAccountEmail,
  getServiceAccountPrivateKey,
} from "@/lib/env";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

let cachedClient: sheets_v4.Sheets | null = null;

/**
 * Returns an authenticated Google Sheets API client using the service account
 * credentials. The client is cached across invocations within the same server
 * process (the JWT auth handles token refresh internally).
 *
 * Prerequisite: the master spreadsheet must be shared with the service account
 * email (Editor) or every call will fail with a 403.
 */
export function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const auth = new google.auth.JWT({
    email: getServiceAccountEmail(),
    key: getServiceAccountPrivateKey(),
    scopes: SCOPES,
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}
