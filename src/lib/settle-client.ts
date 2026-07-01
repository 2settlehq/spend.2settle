/**
 * Server-side client for the 2Settle payment engine.
 * Handles HMAC-SHA256 request signing.
 *
 * Required env vars:
 *   SETTLE_API_KEY    — the keyId (e.g. "pk_...")
 *   SETTLE_API_SECRET — the raw secret returned at key creation
 */
import crypto from "crypto";
import axios, { AxiosRequestConfig } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_SETTLE_API_URL; // e.g. http://localhost:3500/v1

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: string, data: string): string {
  return crypto.createHmac("sha256", key).update(data).digest("hex");
}

function buildAuthHeaders(
  method: string,
  path: string,
  body: unknown = {}
): Record<string, string> {
  const apiKey = process.env.SETTLE_API_KEY;
  const secret = process.env.SETTLE_API_SECRET;

  if (!apiKey || !secret) {
    throw new Error("SETTLE_API_KEY and SETTLE_API_SECRET must be set");
  }

  const timestamp = Date.now().toString();
  const bodyString = JSON.stringify(body);
  const bodyHash = sha256(bodyString);
  const payload = `${timestamp}|${method.toUpperCase()}|${path}|${bodyHash}`;

  // Server stores sha256(secret) as keyHash — we sign with that same derived key
  const keyHash = sha256(secret);
  const signature = hmacSha256(keyHash, payload);

  return {
    "X-API-Key": apiKey,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
    "Content-Type": "application/json",
  };
}

/**
 * Make a signed GET request to the payment engine.
 * `enginePath` must start with "/" and NOT include the base URL (e.g. "/history").
 */
export async function engineGet<T>(
  enginePath: string,
  params?: Record<string, string | number | undefined>
): Promise<T> {
  const fullPath = `/v1${enginePath}`; // path as seen by the engine (for signing)

  const config: AxiosRequestConfig = {
    params,
    headers: buildAuthHeaders("GET", fullPath),
    timeout: 15000,
  };

  const response = await axios.get<T>(`${BASE_URL}${enginePath}`, config);
  return response.data;
}

/**
 * Make a signed POST request to the payment engine.
 */
export async function enginePost<T>(
  enginePath: string,
  body: unknown = {}
): Promise<T> {
  const fullPath = `/v1${enginePath}`;
  const headers = buildAuthHeaders("POST", fullPath, body);
  const response = await axios.post<T>(`${BASE_URL}${enginePath}`, body, {
    headers,
    timeout: 30000,
  });
  return response.data;
}
