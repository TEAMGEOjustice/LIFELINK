/**
 * Security utilities for LifeLink
 * Input sanitization, XSS prevention, and security headers.
 */

/**
 * Sanitize user text input — strips HTML tags and trims.
 * Use this on any free-text field before storage or display.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[<>"'&]/g, (char) => {
      const map: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
        "&": "&amp;",
      };
      return map[char] || char;
    })
    .trim();
}

/**
 * Sanitize text for safe display — decode entities back for rendering.
 * Only needed when reading back sanitized text.
 */
export function unsanitizeForDisplay(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Validate and sanitize a URL to prevent javascript: protocol injection.
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return parsed.href;
    }
    return "#"; // Block javascript:, data:, etc.
  } catch {
    return "#";
  }
}

/**
 * Generate a Content Security Policy string for production.
 * Used in meta tags or server headers.
 */
export function getCSPString(supabaseUrl: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, // Required for Vite HMR in dev
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https:`,
    `connect-src 'self' ${supabaseUrl} wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
}

/**
 * Rate limiter for client-side form submissions.
 * Prevents rapid repeated submissions.
 */
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts: number[] = [];
  return {
    check(): boolean {
      const now = Date.now();
      // Remove expired attempts
      while (attempts.length > 0 && attempts[0] < now - windowMs) {
        attempts.shift();
      }
      if (attempts.length >= maxAttempts) {
        return false; // Rate limited
      }
      attempts.push(now);
      return true;
    },
    remaining(): number {
      const now = Date.now();
      while (attempts.length > 0 && attempts[0] < now - windowMs) {
        attempts.shift();
      }
      return Math.max(0, maxAttempts - attempts.length);
    },
  };
}

/**
 * Validate password strength for signup.
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number;
  feedback: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const labels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
  return {
    valid: score >= 2 && password.length >= 6,
    score,
    feedback: labels[Math.min(score, labels.length - 1)],
  };
}
