import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, RefreshCw } from 'lucide-react'
import AppShell from '../components/layout/AppShell.jsx'
import DashboardHeader from '../components/layout/DashboardHeader.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../features/auth/useAuth.js'
import CreateJournalModal from '../features/journals/CreateJournalModal.jsx'
import {
  saveJournalWithMedia,
  JournalMediaUploadError,
} from '../features/journals/saveJournalWithMedia.js'
import UnlockPinModal from '../features/vault/UnlockPinModal.jsx'
import { useVault } from '../features/vault/useVault.js'
import { ApiError } from '../services/api.js'
import MetricBar from '../features/admin/MetricBar.jsx'
import StatusBadge from '../features/admin/StatusBadge.jsx'
import {
  classifyStatus,
  formatBytes,
  formatUptime,
} from '../features/admin/monitoringFormat.js'
import { getMonitoringOverview } from '../features/admin/monitoringService.js'

function Panel({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  )
}

function StatusRow({ label, children }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {children}
      </div>
    </div>
  )
}

function serviceBadge(entry) {
  if (!entry || typeof entry !== 'object') {
    return <StatusBadge tone="warn" label="Unavailable" detail="No data" />
  }

  if (entry.status === 'error') {
    return (
      <StatusBadge
        tone="bad"
        label="Error"
        detail={typeof entry.reason === 'string' ? entry.reason : undefined}
      />
    )
  }

  const { tone, label } = classifyStatus(entry.status)
  const details = []
  if (typeof entry.pid === 'number') details.push(`pid ${entry.pid}`)
  if (typeof entry.restartCount === 'number') {
    details.push(`${entry.restartCount} restarts`)
  }
  if (typeof entry.uptimeSeconds === 'number') {
    details.push(formatUptime(entry.uptimeSeconds))
  }

  return (
    <StatusBadge
      tone={tone}
      label={label}
      detail={details.length > 0 ? details.join(' · ') : undefined}
    />
  )
}

function listenerBadge(entry) {
  if (!entry || typeof entry !== 'object') {
    return <StatusBadge tone="warn" label="Unavailable" detail="No data" />
  }

  if (entry.status === 'error') {
    return (
      <StatusBadge
        tone="bad"
        label="Error"
        detail={typeof entry.reason === 'string' ? entry.reason : undefined}
      />
    )
  }

  const portLabel =
    typeof entry.port === 'number' ? `Port ${entry.port}` : 'Port —'
  const { tone, label } = classifyStatus(undefined, {
    listening: entry.listening,
  })

  return <StatusBadge tone={tone} label={label} detail={portLabel} />
}

function upstreamBadge(entry) {
  if (!entry || typeof entry !== 'object') {
    return <StatusBadge tone="warn" label="Unavailable" detail="No data" />
  }

  if (entry.status === 'error') {
    return (
      <StatusBadge
        tone="bad"
        label="Error"
        detail={typeof entry.reason === 'string' ? entry.reason : undefined}
      />
    )
  }

  const host = typeof entry.host === 'string' ? entry.host : '—'
  const port = typeof entry.port === 'number' ? entry.port : '—'

  return (
    <StatusBadge tone="ok" label="Proxy target" detail={`${host}:${port}`} />
  )
}

function AdminMonitoringPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isUnlocked, lock, ensureCryptoMaterial } = useVault()
  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [overview, setOverview] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadOverview = useCallback(async ({ soft = false } = {}) => {
    if (soft) {
      setIsRefreshing(true)
    } else {
      setIsInitialLoading(true)
    }
    setLoadError('')

    try {
      const data = await getMonitoringOverview()
      setOverview(data)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message || 'Unable to load monitoring data'
          : 'Unable to load monitoring data'
      setLoadError(message)
      if (!soft) {
        setOverview(null)
      }
    } finally {
      setIsInitialLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOverview({ soft: false })
  }, [loadOverview])

  function handleVaultStatusClick() {
    if (isUnlocked) {
      lock()
      return
    }
    setIsUnlockOpen(true)
  }

  async function handleSaveJournal(draft, { updateToast, toastId } = {}) {
    const onProgress = (message) => {
      if (updateToast && toastId) {
        updateToast(toastId, { status: 'loading', message, persistent: true })
      }
    }

    try {
      await saveJournalWithMedia(draft, {
        ensureCryptoMaterial,
        onProgress,
      })
    } catch (error) {
      if (error instanceof JournalMediaUploadError) {
        return
      }
      throw error
    }
  }

  const system = overview?.system
  const backend = overview?.backend
  const services = overview?.services
  const network = overview?.network
  const users = overview?.users

  const cpuWaiting = system != null && system.cpuUsagePercent === null
  const memory = system?.memory
  const disk = system?.disk

  return (
    <AppShell
      username={user?.username}
      isUnlocked={isUnlocked}
      onCreateJournal={() => setIsCreateOpen(true)}
      onVaultStatusClick={handleVaultStatusClick}
    >
      <DashboardHeader
        isUnlocked={isUnlocked}
        onUnlockClick={() => setIsUnlockOpen(true)}
        onLockClick={lock}
        onLogoutClick={async () => {
          await logout()
          navigate('/login', { replace: true })
        }}
      />

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-brand uppercase">
                <Activity size={14} strokeWidth={2.25} aria-hidden="true" />
                Operations
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
                Admin Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted">
                Live system health for this Unsend host.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-auto shrink-0"
              onClick={() => loadOverview({ soft: true })}
              disabled={isInitialLoading || isRefreshing}
              aria-busy={isRefreshing}
            >
              <RefreshCw
                size={14}
                strokeWidth={2}
                className={isRefreshing ? 'animate-spin' : undefined}
                aria-hidden="true"
              />
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {loadError ? (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              <p className="font-semibold">Monitoring unavailable</p>
              <p className="mt-1">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-auto"
                onClick={() => loadOverview({ soft: Boolean(overview) })}
              >
                Try again
              </Button>
            </div>
          ) : null}

          {isInitialLoading && !overview ? (
            <p className="text-sm text-muted" role="status">
              Loading monitoring data…
            </p>
          ) : null}

          {overview ? (
            <>
              <Panel
                title="System"
                description="Host resources and process uptime"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricBar
                    label="CPU"
                    percent={system?.cpuUsagePercent}
                    waiting={cpuWaiting}
                    waitingLabel="Collecting…"
                    detail={
                      cpuWaiting
                        ? 'Need a second sample for utilization'
                        : undefined
                    }
                  />
                  <MetricBar
                    label="Memory"
                    percent={memory?.usedPercent}
                    detail={
                      memory
                        ? `${formatBytes(memory.usedBytes)} used · ${formatBytes(memory.availableBytes)} available of ${formatBytes(memory.totalBytes)}`
                        : 'No memory data'
                    }
                  />
                  <MetricBar
                    label="Disk"
                    percent={disk?.usedPercent}
                    detail={
                      disk
                        ? `${formatBytes(disk.usedBytes)} used · ${formatBytes(disk.availableBytes)} free of ${formatBytes(disk.totalBytes)}`
                        : 'No disk data'
                    }
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-page/60 p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      Server uptime
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                      {formatUptime(system?.uptimeSeconds)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-page/60 p-4">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      Backend uptime
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
                      {formatUptime(backend?.uptimeSeconds)}
                    </p>
                  </div>
                </div>
              </Panel>

              <Panel
                title="Application"
                description="Registered Unsend accounts"
              >
                <div className="rounded-xl border border-border bg-page/60 p-4">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                    Total registered users
                  </p>
                  {users?.status === 'error' ? (
                    <div className="mt-2">
                      <StatusBadge
                        tone="bad"
                        label="Error"
                        detail={
                          typeof users.reason === 'string'
                            ? users.reason
                            : undefined
                        }
                      />
                    </div>
                  ) : (
                    <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
                      {typeof users?.total === 'number' ? users.total : '—'}
                    </p>
                  )}
                </div>
              </Panel>

              <Panel title="Services" description="Process and dependency health">
                <div>
                  <StatusRow label="Backend /health">
                    {serviceBadge(services?.backend)}
                  </StatusRow>
                  <StatusRow label="PM2 (unsend-backend)">
                    {serviceBadge(services?.pm2)}
                  </StatusRow>
                  <StatusRow label="Nginx">
                    {serviceBadge(services?.nginx)}
                  </StatusRow>
                  <StatusRow label="MySQL">
                    {serviceBadge(services?.mysql)}
                  </StatusRow>
                  <StatusRow label="Prisma">
                    {serviceBadge(services?.prisma)}
                  </StatusRow>
                </div>
              </Panel>

              <Panel
                title="Network"
                description="Runtime listeners and API proxy target"
              >
                <div>
                  <StatusRow label="Node listener">
                    {listenerBadge(network?.node)}
                  </StatusRow>
                  <StatusRow label="MySQL listener">
                    {listenerBadge(network?.mysql)}
                  </StatusRow>
                  <StatusRow label="Nginx HTTP">
                    {listenerBadge(network?.nginx?.http)}
                  </StatusRow>
                  <StatusRow label="Nginx HTTPS">
                    {listenerBadge(network?.nginx?.https)}
                  </StatusRow>
                  <StatusRow label="Nginx /api/ upstream">
                    {upstreamBadge(network?.nginxUpstream)}
                  </StatusRow>
                </div>
              </Panel>
            </>
          ) : null}
        </div>
      </main>

      <UnlockPinModal
        open={isUnlockOpen}
        onClose={() => setIsUnlockOpen(false)}
      />
      <CreateJournalModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveJournal}
      />
    </AppShell>
  )
}

export default AdminMonitoringPage
