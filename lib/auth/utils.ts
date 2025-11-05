import { headers } from "next/headers";

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function getClientInfo(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const userAgent = headersList.get("user-agent");

  let ipAddress: string | null = null;

  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    ipAddress = first.trim();
  } else if (realIp) {
    ipAddress = realIp;
  }

  return {
    ipAddress,
    userAgent,
  };
}

export function generateHandle(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 20) + Math.random().toString(36).substring(2, 8)
  );
}

export function isValidHandle(handle: string): boolean {
  return /^[a-z0-9_-]{3,20}$/.test(handle);
}







