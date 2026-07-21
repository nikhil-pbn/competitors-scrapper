/*
 * Client/server-safe auth helpers. The server-only modules (password,
 * rate-limit) are imported directly by the login route, not re-exported here.
 */
export * from "@/lib/auth/config";
export * from "@/lib/auth/session";
