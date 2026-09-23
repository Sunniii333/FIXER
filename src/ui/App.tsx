'use client'
// Every screen that touches Mission content lives under this client component.
// Mission data is loaded from the Storage port in the browser, never from the server.
import { useEffect, useReducer, useState } from 'react'
import { Fixer, UNDO_MS, type Clock, type Mission, type Storage } from '../core/fixer'
import { MissionPage } from './MissionPage'
import { EditForm, Walkthrough } from './EditMission'
import { People } from './People'
import { Review } from './Review'

/** Share: the native share sheet where there is one, else the clipboard. */
export type Share = { share(text: string): Promise<'shared' | 'copied'> }

export type Ports = { clock: Clock; storage: Storage; share: Share }

export type Ui = {
  fixer: Fixer
  ports: Ports
  run: (fn: () => Promise<unknown>) => Promise<void>
  go: (path: string) => void
  /** Call after a delete: goes home and offers undo for a few seconds. */
  deleted: () => void
}

function useHashRoute() {
  const [hash, setHash] = useState(() => location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  const go = (path: string) => {
    location.hash = path
    setHash(location.hash)
  }
  return [hash.replace(/^#\/?/, '').split('/'), go] as const
}

export function App({ ports }: { ports: Ports }) {
  const [fixer, setFixer] = useState<Fixer>()
  const [, rerender] = useReducer((n: number) => n + 1, 0)
  const [[screen, param], go] = useHashRoute()
  const [undoable, setUndoable] = useState(false)
  useEffect(() => {
    if (!undoable) return
    const t = setTimeout(() => setUndoable(false), UNDO_MS)
    return () => clearTimeout(t)
  }, [undoable])

  useEffect(() => {
    const t = setInterval(rerender, 500) // the Five-minute clock and Stuck are derived from the Clock
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    Fixer.open(ports.clock, ports.storage).then(setFixer)
  }, [ports])

  if (!fixer) return null
  const ui: Ui = {
    fixer,
    ports,
    go,
    // Core commands change state synchronously before their first await (the save),
    // so re-rendering straight away keeps controlled inputs in step with typing.
    run: (fn) => {
      const saved = fn()
      rerender()
      return saved.then(rerender)
    },
    deleted: () => {
      setUndoable(true)
      go('')
    },
  }

  return (
    <div className="app">
      <main className="screen">
        {screen === 'people' ? (
          <People ui={ui} />
        ) : screen === 'review' ? (
          <Review ui={ui} />
        ) : screen === 'receive' ? (
          <Receive ui={ui} captureId={param} />
        ) : !fixer.mission(param) ? (
          <Home ui={ui} />
        ) : screen === 'm' ? (
          <MissionPage ui={ui} id={param} />
        ) : screen === 'walk' ? (
          <Walkthrough ui={ui} id={param} back={missionPath(fixer.mission(param)!)} />
        ) : screen === 'edit' ? (
          <EditForm ui={ui} id={param} />
        ) : (
          <Home ui={ui} />
        )}
      </main>
      {undoable && (
        <div className="toast" role="status">
          ลบแล้ว
          <button
            onClick={async () => {
              setUndoable(false)
              await ui.run(() => fixer.undoDelete())
            }}
          >
            เลิกทำ
          </button>
        </div>
      )}
      <nav className="tabbar">
        {[
          ['', 'หน้าหลัก'],
          ['people', 'คน'],
          ['review', 'ทบทวน'],
        ].map(([path, label]) => (
          <button key={path} aria-current={(screen || '') === path ? 'page' : undefined} onClick={() => go(path)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export const missionPath = (m: Mission) => (m.status === 'draft' ? `receive/${m.id}` : `m/${m.id}`)

function StatsStrip({ ui }: { ui: Ui }) {
  const s = ui.fixer.stats()
  const pct = s.rate.total ? Math.round((100 * s.rate.onTime) / s.rate.total) : undefined
  return (
    <dl className="stats" aria-label="สถิติ">
      <div>
        <dt>เริ่มทันเวลา (เดือนนี้)</dt>
        <dd>{pct === undefined ? '—' : `${pct}%`}</dd>
        <small>{s.rate.onTime}/{s.rate.total}</small>
      </div>
      <div>
        <dt>ปิดเดือนนี้</dt>
        <dd>{s.closedThisMonth}</dd>
      </div>
      <div className={s.overdue ? 'hot' : ''}>
        <dt>ค้างอยู่</dt>
        <dd>{s.open}</dd>
        {s.overdue > 0 && <small>เลยกำหนด {s.overdue}</small>}
      </div>
    </dl>
  )
}

const statusLabel = { draft: 'ร่าง', active: 'กำลังทำ', done: 'เสร็จแล้ว', dropped: 'ยกเลิกแล้ว' }

function Home({ ui }: { ui: Ui }) {
  const missions = ui.fixer.homeList()
  const dropped = ui.fixer.missions().filter((m) => m.status === 'dropped')
  return (
    <>
      <h1>ภารกิจ</h1>
      <StatsStrip ui={ui} />
      {missions.length === 0 && <p className="muted">ยังไม่มีภารกิจ กด “รับภารกิจ” เมื่อได้รับงาน</p>}
      <ul className="list">
        {missions.map((m) => (
          <li key={m.id}>
            <a className="card" href={`#/${missionPath(m)}`}>
              {ui.fixer.isOverdue(m.id) ? (
                <span className="tag bad">เลยกำหนด</span>
              ) : (
                <span className="tag">{statusLabel[m.status]}</span>
              )}
              <span>{m.instruction || '(ยังไม่มีคำสั่งงาน)'}</span>
            </a>
          </li>
        ))}
      </ul>
      {dropped.length > 0 && (
        <details className="history">
          <summary>ยกเลิกแล้ว ({dropped.length})</summary>
          <section aria-label="ยกเลิกแล้ว">
            <ul className="list">
              {dropped.map((m) => (
                <li key={m.id}>
                  <a className="card" href={`#/m/${m.id}`}>
                    <span>{m.instruction}</span>
                    <small className="muted">{m.dropReason}</small>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </details>
      )}
      <div className="actions">
        <button className="primary big" onClick={() => ui.go(`receive/${crypto.randomUUID()}`)}>
          รับภารกิจ
        </button>
      </div>
    </>
  )
}

function Receive({ ui, captureId }: { ui: Ui; captureId: string }) {
  const { fixer } = ui
  useEffect(() => {
    ui.run(() => fixer.receive(captureId))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId])
  const m = fixer.mission(captureId)
  if (!m) return null
  if (m.status !== 'draft') return <MissionPage ui={ui} id={m.id} />
  const ready = m.instruction.trim() && m.steps[0]?.text.trim()
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ready) return
        await ui.run(() => fixer.activate(m.id))
        ui.go(`m/${m.id}`)
      }}
    >
      <h1>รับภารกิจ</h1>
      <label>
        คำสั่งงาน
        <textarea
          autoFocus
          rows={3}
          value={m.instruction}
          onChange={(e) => ui.run(() => fixer.edit(m.id, { instruction: e.target.value }))}
        />
      </label>
      <label>
        ก้าวแรก
        <input
          value={m.steps[0]?.text ?? ''}
          placeholder="สิ่งที่ลงมือทำได้ภายใน 5 นาที"
          onChange={(e) => ui.run(() => fixer.edit(m.id, { firstStep: e.target.value }))}
        />
      </label>
      <div className="actions">
        <button type="button" onClick={() => ui.go(`walk/${m.id}`)}>
          ถามทีละข้อ (เป้าหมาย กำหนดส่ง แผนสำรอง)
        </button>
        <button className="primary big" disabled={!ready}>
          เริ่มลงมือ
        </button>
      </div>
    </form>
  )
}
