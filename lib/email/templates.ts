import { env } from "@/lib/env";

export interface EmailTemplate {
  subject: string;
  html: string;
}

export function getVerifyEmailTemplate(token: string, email: string): EmailTemplate {
  const verifyUrl = `${env.APP_URL}/auth/verify-email?token=${token}`;

  return {
    subject: "Verify your email address",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">OpenSolve</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
    <p style="font-size: 16px; color: #666; margin: 20px 0;">
      Thanks for signing up! Please verify your email address to get started.
    </p>
    <p style="font-size: 14px; color: #999; margin: 10px 0;">
      This link is valid for 15 minutes.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verifyUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
        Verify Email
      </a>
    </div>
    
    <p style="font-size: 14px; color: #999; margin: 30px 0 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 4px;">
      ${verifyUrl}
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; margin: 0;">
      If you didn't request this verification, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>OpenSolve © 2025. All rights reserved.</p>
  </div>
</body>
</html>
    `,
  };
}

export function getPasswordResetTemplate(token: string, email: string): EmailTemplate {
  const resetUrl = `${env.APP_URL}/auth/reset-password?token=${token}`;

  return {
    subject: "Reset your password",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">OpenSolve</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
    <p style="font-size: 16px; color: #666; margin: 20px 0;">
      We received a request to reset your password. Click the button below to choose a new password.
    </p>
    <p style="font-size: 14px; color: #999; margin: 10px 0;">
      This link is valid for 15 minutes.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
        Reset Password
      </a>
    </div>
    
    <p style="font-size: 14px; color: #999; margin: 30px 0 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 4px;">
      ${resetUrl}
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; margin: 0;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>OpenSolve © 2025. All rights reserved.</p>
  </div>
</body>
</html>
    `,
  };
}

export function getMagicLinkTemplate(token: string, email: string): EmailTemplate {
  const magicUrl = `${env.APP_URL}/auth/magic-link?token=${token}`;

  return {
    subject: "Your sign-in link",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">OpenSolve</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Sign In to OpenSolve</h2>
    <p style="font-size: 16px; color: #666; margin: 20px 0;">
      Click the button below to sign in to your account.
    </p>
    <p style="font-size: 14px; color: #999; margin: 10px 0;">
      This link is valid for 15 minutes and can only be used once.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
        Sign In
      </a>
    </div>
    
    <p style="font-size: 14px; color: #999; margin: 30px 0 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #667eea; word-break: break-all; background: white; padding: 10px; border-radius: 4px;">
      ${magicUrl}
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; margin: 0;">
      If you didn't request this sign-in link, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>OpenSolve © 2025. All rights reserved.</p>
  </div>
</body>
</html>
    `,
  };
}

export function getTwoFactorEnabledTemplate(email: string): EmailTemplate {
  return {
    subject: "Two-factor authentication enabled",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">OpenSolve</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Two-Factor Authentication Enabled</h2>
    <p style="font-size: 16px; color: #666; margin: 20px 0;">
      Two-factor authentication has been successfully enabled on your account.
    </p>
    <p style="font-size: 14px; color: #666;">
      From now on, you'll need to enter a verification code from your authenticator app when signing in.
    </p>
    
    <div style="background: #ffe4e1; border-left: 4px solid #ff6b6b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Important:</strong> Make sure you've saved your recovery codes in a safe place. You'll need them to access your account if you lose access to your authenticator app.
      </p>
    </div>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; margin: 0;">
      If you didn't enable two-factor authentication, please contact support immediately.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>OpenSolve © 2025. All rights reserved.</p>
  </div>
</body>
</html>
    `,
  };
}

export function getEmailChangedTemplate(newEmail: string, oldEmail: string): EmailTemplate {
  return {
    subject: "Your email address has been changed",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">OpenSolve</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 40px 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Email Address Changed</h2>
    <p style="font-size: 16px; color: #666; margin: 20px 0;">
      Your email address has been successfully changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; margin: 0;">
      If you didn't make this change, please contact support immediately.
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>OpenSolve © 2025. All rights reserved.</p>
  </div>
</body>
</html>
    `,
  };
}

