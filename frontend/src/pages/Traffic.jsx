import { useCallback, useEffect, useState } from 'react'
import { Activity, Eye, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import { SectionHead } from '../components/ui'

function timeLabel(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Table({ title, rows }) {
  return (
    <section className="panel">
      <div className="section-head"><h2>{title}</h2></div>
      {rows.length === 0
        ? <div className="small muted">No views in this period yet.</div>
        : (
          <table className="traffic-table">
            <thead><tr><th>Page / source</th><th>Views</th><th>Visitors</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.views}</td>
                  <td>{row.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </section>
  )
}

export default function Traffic() {
  const { user, mode } = useApp()
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await api.owner.traffic(days))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    if (user?.is_owner) load()
  }, [user?.is_owner, load])

  if (!user?.is_owner) {
    return (
      <section className="panel owner-gate">
        <div className="brand-mark"><ShieldCheck size={19} color="var(--sage-deep)" /></div>
        <h2>Owner only</h2>
        <p className="small muted" style={{ margin: '6px 0 0' }}>
          Site traffic is visible only to the account set as DAYFLOW owner. If that is you, sign in with the owner email.
        </p>
      </section>
    )
  }

  const maxDaily = Math.max(1, ...(data?.daily || []).map((row) => row.views))
  const summary = data?.summary

  return (
    <div className="stack">
      <SectionHead
        title="Traffic"
        description="A quiet, privacy-light view of how the site is being used."
        actions={(
          <div className="row" style={{ gap: 8 }}>
            <select className="select" value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="Traffic period">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button className="btn btn-sm btn-soft" onClick={load} disabled={loading}><RefreshCw size={14} /> Refresh</button>
          </div>
        )}
      />

      {mode === 'local' && <div className="panel tint-butter small">Traffic is recorded only by the deployed API. Local browser mode shows no database-wide traffic.</div>}
      {error && <div className="panel tint-peach small">{error}</div>}

      {loading && !data ? (
        <div className="empty">Gathering the numbers…</div>
      ) : (
        <>
          <div className="kpi-row">
            <div className="kpi"><div className="kpi-value">{summary?.views ?? 0}</div><div className="kpi-label">page views</div></div>
            <div className="kpi"><div className="kpi-value">{summary?.unique_visitors ?? 0}</div><div className="kpi-label">unique visitors</div></div>
            <div className="kpi"><div className="kpi-value">{summary?.unique_sessions ?? 0}</div><div className="kpi-label">visits</div></div>
            <div className="kpi"><div className="kpi-value">{summary?.days_with_views ?? 0}</div><div className="kpi-label">active days</div></div>
          </div>

          <section className="panel">
            <div className="section-head">
              <h2>Daily views</h2>
              <span className="small muted">First {timeLabel(summary?.first_view)} · Last {timeLabel(summary?.last_view)}</span>
            </div>
            {(data?.daily || []).length === 0
              ? <div className="small muted">No traffic recorded yet. Once the site is live, views will appear here.</div>
              : (
                <div className="stack-sm">
                  {data.daily.map((row) => (
                    <div key={row.label} className="traffic-day">
                      <span>{row.label.slice(5)}</span>
                      <div className="progress-track"><div className="progress-fill" style={{ width: `${(row.views / maxDaily) * 100}%` }} /></div>
                      <strong>{row.views}</strong>
                    </div>
                  ))}
                </div>
              )}
          </section>

          <div className="grid-2" style={{ alignItems: 'start' }}>
            <Table title="Pages" rows={data?.pages || []} />
            <Table title="Devices" rows={data?.devices || []} />
          </div>
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <Table title="Referrers" rows={data?.referrers || []} />
            <section className="panel">
              <div className="section-head"><h2>Recent views</h2><Activity size={17} color="var(--sky-deep)" /></div>
              {(data?.recent || []).length === 0
                ? <div className="small muted">Nothing yet.</div>
                : (
                  <div className="stack-sm">
                    {data.recent.map((row, index) => (
                      <div key={`${row.at}-${index}`} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <span className="small">{timeLabel(row.at)} · {row.path}</span>
                        <span className="tiny muted">{row.device}{row.referrer_host ? ` · ${row.referrer_host}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
            </section>
          </div>

          <div className="panel flat tint-sage">
            <div className="row"><Eye size={16} color="var(--sage-deep)" /><Users size={16} color="var(--sage-deep)" /><strong className="small">Privacy</strong></div>
            <p className="small muted" style={{ margin: '7px 0 0' }}>{data?.note}</p>
          </div>
        </>
      )}
    </div>
  )
}
