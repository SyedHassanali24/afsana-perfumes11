export function base64ToBytes(encoded) {
  if (typeof encoded !== "string") throw new TypeError("Expected a base64 string.");
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function responseFromNetlify(result) {
  const responseHeaders = new Headers(result?.headers || {});
  const multi = result?.multiValueHeaders || {};
  for (const [key, values] of Object.entries(multi)) {
    if (Array.isArray(values)) {
      responseHeaders.delete(key);
      for (const value of values) responseHeaders.append(key, String(value));
    }
  }

  const body = result?.isBase64Encoded
    ? base64ToBytes(result.body || "")
    : (result?.body ?? "");

  return new Response(body, {
    status: result?.statusCode || 200,
    headers: responseHeaders,
  });
}
