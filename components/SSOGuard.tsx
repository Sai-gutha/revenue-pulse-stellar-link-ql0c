"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface SSOConfig {
  enabled: boolean
  keycloak_url?: string
  realm?: string
  client_id?: string
  idp_hint?: string
}

function AccessDeniedScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm mx-auto">
        <CardContent className="pt-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function SSOGuard({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState<string | null>(null)
  const initialised = useRef(false)

  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    // Skip SSO when running inside an iframe (Architect sandbox preview).
    // The builder shouldn't be gated by Keycloak, and Keycloak's
    // frame-ancestors CSP blocks the silent-check-sso iframe anyway.
    // SSO is enforced on the standalone preview URL and deployed URL.
    if (window.self !== window.top) {
      setReady(true)
      return
    }

    fetch("/api/sso-config")
      .then<SSOConfig>((r) => r.json())
      .then(async (config) => {
        if (!config.enabled) {
          setReady(true)
          return
        }

        const { default: Keycloak } = await import("keycloak-js")
        const kc = new Keycloak({
          url: config.keycloak_url!,
          realm: config.realm!,
          clientId: config.client_id!,
        })

        try {
          // silentCheckSsoRedirectUri is intentionally omitted — Keycloak's
          // frame-ancestors 'self' CSP blocks the hidden iframe it creates,
          // causing every check-sso to fail and trigger an unwanted kc.login().
          // Without it, Keycloak JS falls back to a redirect round-trip which
          // is transparent when the user already has an active session.
          const authenticated = await kc.init({
            onLoad: "check-sso",
            checkLoginIframe: false,
          })

          if (authenticated) {
            if (kc.token) {
              sessionStorage.setItem("sso_token", kc.token)

              // Check if this user has been invited to use Architect.
              // The backend enforces the architect_members allowlist when
              // require_architect_invite=true for the tenant. A 403 means
              // the user authenticated via SSO but has not been invited.
              try {
                const accessRes = await fetch("/api/verify-access", {
                  headers: { Authorization: `Bearer ${kc.token}` },
                })
                if (accessRes.status === 403) {
                  const body = await accessRes.json().catch(() => ({}))
                  setBlocked(body?.detail ?? "Please connect with admin to get invited")
                  return
                }
                if (!accessRes.ok) {
                  if (accessRes.status < 500) {
                    setBlocked("Access verification failed. Please contact your administrator.")
                    return
                  }
                }
              } catch {
                // Network error (fetch throws) — fail open so a transient outage
                // doesn't lock out legitimate users
              }

              // Resolve and cache the user's own Lyzr API key so agent calls
              // use their key instead of the app owner's baked-in key.
              try {
                const keyRes = await fetch("/api/user-api-key", {
                  headers: { Authorization: `Bearer ${kc.token}` },
                })
                if (keyRes.ok) {
                  const keyData = await keyRes.json()
                  if (keyData?.api_key) {
                    sessionStorage.setItem("user_lyzr_api_key", keyData.api_key)
                  }
                }
              } catch {
                // Non-fatal — falls back to owner's key in /api/agent
              }
            }
            setReady(true)
          } else {
            kc.login({
              idpHint: config.idp_hint || undefined,
              redirectUri: window.location.origin + "/",
            })
          }
        } catch {
          // If check-sso fails (network, config), redirect to login
          kc.login({
            idpHint: config.idp_hint || undefined,
            redirectUri: window.location.origin + "/",
          })
        }
      })
      .catch(() => {
        // If /api/sso-config is unreachable, let the app through
        setReady(true)
      })
  }, [])

  if (blocked) {
    return <AccessDeniedScreen message={blocked} />
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
