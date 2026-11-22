/** Local HTTP is supported. An HTTPS installation can pin its exact origin. */
export function validOrigin(
  request: Request,
  configuredOrigin = process.env.STUDIO_ORIGIN,
) {
  const supplied = request.headers.get("origin");
  if (!supplied || request.headers.get("sec-fetch-site") === "cross-site")
    return false;
  try {
    const source = new URL(supplied);
    const target = new URL(request.url);
    const host = request.headers.get("host") ?? target.host;
    if (source.origin !== supplied || source.host !== host.toLowerCase())
      return false;
    if (configuredOrigin) {
      return (
        source.protocol === "https:" &&
        supplied === new URL(configuredOrigin).origin
      );
    }
    return (
      ["localhost", "127.0.0.1", "[::1]"].includes(source.hostname) &&
      source.protocol === target.protocol &&
      ["http:", "https:"].includes(source.protocol)
    );
  } catch {
    return false;
  }
}

export function json(data: object, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
