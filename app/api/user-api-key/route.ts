import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/user-api-key
 *
 * Proxies to the Architect backend to exchange the caller's Keycloak
 * Bearer token for their PAGOS API key. The deployed app calls this
 * once after SSO login; the resolved key is cached client-side for
 * the session and used in subsequent agent calls instead of the
 * owner's baked-in LYZR_API_KEY.
 *
 * Only active when ARCHITECT_BACKEND_URL is set (deployed link).
 * Returns { enabled: false } in sandbox/preview mode.
 *
 * NOTE: The `enabled` field name differs from `allowed` in verify-access/route.ts
 * for historical reasons. The client checks `api_key` directly (not the enabled field),
 * so this inconsistency is safe but should be unified if refactoring both routes together.
 */
export async function GET(request: NextRequest) {
  if (process.env.SANDBOX_MODE === 'true') {
    return NextResponse.json({ enabled: false })
  }

  const backendUrl = process.env.ARCHITECT_BACKEND_URL
  const tenantId = process.env.ARCHITECT_TENANT_ID || process.env.TENANT_ID

  if (!backendUrl) {
    return NextResponse.json({ enabled: false })
  }

  const authorization = request.headers.get('authorization')
  if (!authorization) {
    return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
  }

  try {
    const res = await fetch(`${backendUrl}/api/v1/tenant/user-api-key`, {
      headers: {
        Authorization: authorization,
        ...(tenantId ? { 'X-Tenant': tenantId } : {}),
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch user API key' }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
