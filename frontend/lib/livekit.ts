/**
 * Safely decode a LiveKit data message payload into a parsed object.
 * Returns `null` if the payload is malformed or not valid JSON.
 */
export function parseDataMessage(payload: Uint8Array): Record<string, unknown> | null {
  try {
    return JSON.parse(new TextDecoder().decode(payload));
  } catch {
    return null;
  }
}
