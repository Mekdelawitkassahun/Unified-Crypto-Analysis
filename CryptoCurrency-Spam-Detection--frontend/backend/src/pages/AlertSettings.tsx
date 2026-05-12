import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Beaker, Save } from 'lucide-react'
import { fetchAlertSettings, saveAlertSettings } from '../lib/endpoints'
import type { AlertSettings } from '../types/api'
import { Skeleton } from '../components/Skeleton'

export function AlertSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AlertSettings>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const s = await fetchAlertSettings()
      setSettings(s ?? {})
    } catch {
      toast.error('Failed to load alert settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(async (extra?: { test?: 'telegram' | 'discord' | 'email' }) => {
    setSaving(true)
    try {
      const next = await saveAlertSettings({ ...(settings ?? {}), ...(extra ?? {}) })
      setSettings(next ?? settings)
      toast.success(extra?.test ? 'Test sent (if configured)' : 'Settings saved')
    } catch {
      toast.error(extra?.test ? 'Test failed' : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [settings])

  const rules = settings.rules ?? {}
  const telegram = settings.telegram ?? {}
  const discord = settings.discord ?? {}
  const email = settings.email ?? {}

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-2xl font-semibold text-gray-100">Alerts</div>
            <div className="mt-1 text-sm text-gray-400">Configure delivery channels and rules.</div>
          </div>
          <button type="button" className="btn-primary" onClick={() => save()} disabled={saving || loading}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-4 h-10 w-full" />
                <Skeleton className="mt-3 h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass glass-hover p-4">
                <div className="text-sm font-semibold text-gray-100">Telegram</div>
                <div className="mt-1 text-xs text-gray-400">Bot Token + Chat ID</div>
                <div className="mt-4 grid gap-3">
                  <input
                    className="input"
                    placeholder="Bot Token"
                    value={telegram.botToken ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, telegram: { ...(s.telegram ?? {}), botToken: e.target.value } }))
                    }
                  />
                  <input
                    className="input"
                    placeholder="Chat ID"
                    value={telegram.chatId ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, telegram: { ...(s.telegram ?? {}), chatId: e.target.value } }))
                    }
                  />
                  <div className="flex justify-end">
                    <button type="button" className="btn-ghost" onClick={() => save({ test: 'telegram' })} disabled={saving}>
                      <Beaker className="h-4 w-4" />
                      Test
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass glass-hover p-4">
                <div className="text-sm font-semibold text-gray-100">Discord</div>
                <div className="mt-1 text-xs text-gray-400">Webhook URL</div>
                <div className="mt-4 grid gap-3">
                  <input
                    className="input"
                    placeholder="Webhook URL"
                    value={discord.webhookUrl ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, discord: { ...(s.discord ?? {}), webhookUrl: e.target.value } }))
                    }
                  />
                  <div className="flex justify-end">
                    <button type="button" className="btn-ghost" onClick={() => save({ test: 'discord' })} disabled={saving}>
                      <Beaker className="h-4 w-4" />
                      Test
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass glass-hover p-4">
                <div className="text-sm font-semibold text-gray-100">Email</div>
                <div className="mt-1 text-xs text-gray-400">Destination address</div>
                <div className="mt-4 grid gap-3">
                  <input
                    className="input"
                    placeholder="Email address"
                    value={email.address ?? ''}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, email: { ...(s.email ?? {}), address: e.target.value } }))
                    }
                  />
                  <div className="flex justify-end">
                    <button type="button" className="btn-ghost" onClick={() => save({ test: 'email' })} disabled={saving}>
                      <Beaker className="h-4 w-4" />
                      Test
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass glass-hover p-4">
                <div className="text-sm font-semibold text-gray-100">Alert rules</div>
                <div className="mt-1 text-xs text-gray-400">Thresholds and toggles</div>
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-gray-400">Minimum amount</label>
                    <input
                      className="input"
                      inputMode="decimal"
                      placeholder="e.g. 10"
                      value={rules.minimumAmount ?? ''}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          rules: { ...(s.rules ?? {}), minimumAmount: e.target.value === '' ? undefined : Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium text-gray-400">Minimum risk score</label>
                    <input
                      className="input"
                      inputMode="numeric"
                      placeholder="e.g. 70"
                      value={rules.minimumRiskScore ?? ''}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          rules: { ...(s.rules ?? {}), minimumRiskScore: e.target.value === '' ? undefined : Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-200">
                    <span>
                      Flagged interaction alerts
                      <div className="mt-1 text-xs text-gray-500">Notify on high-risk counterparties/mixers.</div>
                    </span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-violet-500"
                      checked={Boolean(rules.flaggedInteractionEnabled)}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          rules: { ...(s.rules ?? {}), flaggedInteractionEnabled: e.target.checked },
                        }))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

