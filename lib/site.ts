/**
 * Where this deployment lives.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when it is set, because it is the only one that
 * survives a custom domain. Failing that we take Vercel's own `VERCEL_URL`,
 * which is injected automatically — that way a deployment where somebody
 * forgot to set the site URL still talks to itself rather than to localhost.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
