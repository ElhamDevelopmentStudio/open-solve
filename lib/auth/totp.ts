import { authenticator } from "@otplib/preset-default";
import crypto from "crypto";

export function generateTOTPSecret(): string {
  return authenticator.generateSecret();
}

export function generateTOTPUri(email: string, secret: string): string {
  return authenticator.keyuri(email, "OpenSolve", secret);
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(code);
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function verifyRecoveryCode(code: string, hashedCode: string): boolean {
  const computedHash = hashRecoveryCode(code);
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hashedCode));
}





