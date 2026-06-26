import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/verify-access
 *
 * Proxies to the Architect backend's /api/v1/tenant/me with the caller's
 * Keycloak Bearer token. The backend enforces the architect_members allowlist
 * check when the tenant has require_architect_invite=true — returning 403
 * with "Please connect with admin to get invited" for uninvited users.
 *
 * SSOGuard calls this after successful Keycloak authentication. A 403
 * response means the user authenticated against Keycloak (they're in the
 * org) but has not been invited to use Architect — the deployed app should
 * show a blocked screen instead of loading.
 *
 * Only active when ARCHITECT_BACKEND_URL is set (deployed link).
 * Returns { allowed: true } in sandbox/preview mode (no gate in builder).
 */
export async function GET(request: NextRequest) {
  if (process.env.SANDBOX_MODE === 'true') {
    return NextResponse.json({ allowed: true })
  }

  const backendUrl = process.env.ARCHITECT_BACKEND_URL
  const tenantId = process.env.ARCHITECT_TENANT_ID || process.env.TENANT_ID

  if (!backendUrl) {
    return NextResponse.json({ allowed: true })
  }

  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }

  try {
    const res = await fetch(`${backendUrl}/api/v1/tenant/me`, {
      headers: {
        Authorization: authorization,
        ...(tenantId ? { 'X-Tenant': tenantId } : {}),
      },
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({ allowed: true, user: data })
    }

    // Pass through 403 (not invited) with the backend's detail message
    if (res.status === 403) {
      let detail = 'Please connect with admin to get invited'
      try {
        const body = await res.json()
        if (body?.detail) detail = body.detail
      } catch { /* ignore parse errors */ }
      return NextResponse.json({ allowed: false, detail }, { status: 403 })
    }

    // Other errors (401 expired token, 5xx) — return status so SSOGuard can handle.
    // SSOGuard only blocks on non-5xx errors (line 90-94); 5xx intentionally fails open
    // so transient backend outages don't lock users out (same as catch block behavior).
    return NextResponse.json({ error: 'Access check failed' }, { status: res.status })
  } catch {
    // Backend unreachable — fail open so a transient outage doesn't lock everyone out
    return NextResponse.json({ allowed: true })
  }
}
