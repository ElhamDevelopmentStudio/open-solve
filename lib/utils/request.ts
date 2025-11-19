export function extractClientMeta(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for");
  const realIp = headers.get("x-real-ip");
  const userAgent = headers.get("user-agent");

  const ipAddress = forwardedFor
    ? (forwardedFor.split(",")[0]?.trim() ?? null)
    : (realIp?.trim() ?? null);

  return {
    ipAddress,
    userAgent,
  };
}
