'use client'
// Every screen that touches Mission content lives under this client component.
// Mission data is loaded from the Storage port in the browser, never from the server.
import { useEffect, useReducer, useRef, useState } from 'react'
import { Fixer, UNDO_MS, currentStep, type Clock, type Mission, type ReminderKind, type Storage } from '../core/fixer'
import { MissionPage, ReplanScreen, dateLabel, mmss } from './MissionPage'
import { EditForm, Walkthrough } from './EditMission'
import { People } from './People'
import { Review } from './Review'
import { Rules, Settings } from './Settings'
import { InstallInvite, RemindersNotice, type InviteFlag, type Platform } from './Install'

/** Share: the native share sheet where there is one, else the clipboard. */
export type Share = { share(text: string): Promise<'shared' | 'copied'> }

/** ReminderSync: posts the derived, content-blind schedule to the reminder backend. */
export type SyncEntry = { dueAt: number; kind: ReminderKind; count?: number }
export type ReminderSync = { sync(entries: SyncEntry[]): Promise<void> }

export type Ports = { clock: Clock; storage: Storage; share: Share; reminders: ReminderSync; platform: Platform }

export type Ui = {
  fixer: Fixer
  ports: Ports
  run: (fn: () => Promise<unknown>) => Promise<void>
  go: (path: string) => void
  /** Call after a delete: goes home and offers undo for a few seconds. */
  deleted: () => void
  /** Sync the schedule again even if unchanged, e.g. once notification permission is granted. */
  resync: () => void
  invite: () => void
}

function syncEntries(fixer: Fixer): SyncEntry[] {
  if (!fixer.settings().reminderEnabled) return []
  return fixer.pendingReminders().map(({ kind, at, count }) => ({ dueAt: at, kind, ...(count !== undefined && { count }) }))
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
  const { platform } = ports
  // Invite to install on first open, and again the first time a reminder would be relied on.
  const [invite, setInvite] = useState<InviteFlag | 'asked'>()
  useEffect(() => {
    if (!platform.standalone && !platform.seen('firstOpen')) setInvite('firstOpen')
  }, [platform])
  const relyingOnReminder = !!fixer && screen === 'm' && !!fixer.mission(param) && fixer.countdown(param) !== undefined
  useEffect(() => {
    if (relyingOnReminder && !invite && !platform.standalone && !platform.seen('firstReminder')) setInvite('firstReminder')
  }, [relyingOnReminder, invite, platform])
  const closeInvite = () => {
    if (invite && invite !== 'asked') platform.markSeen(invite)
    setInvite(undefined)
  }
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

  // The theme is a device-only preference: applied here, never synced anywhere. 'system' follows the phone.
  const theme = fixer?.settings().theme
  useEffect(() => {
    if (!theme) return
    if (theme === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  }, [theme])

  // Re-sync whenever the derived schedule changes (create, Step change, close, drop, delete, settings…).
  const schedule = fixer && JSON.stringify(syncEntries(fixer))
  const synced = useRef<string>(undefined)
  useEffect(() => {
    if (schedule === undefined || schedule === synced.current) return
    synced.current = schedule
    ports.reminders.sync(JSON.parse(schedule)).catch(() => {})
  })

  // A stuck notification is content-blind, so it can't name a Mission: open the one that went Stuck.
  useEffect(() => {
    if (!fixer || screen !== 'stuck') return
    const stuck = fixer.homeList().find((m) => fixer.isStuck(m.id))
    go(stuck ? `m/${stuck.id}` : '')
  })

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
    resync: () => {
      synced.current = undefined
      rerender()
    },
    invite: () => setInvite('asked'),
  }

  // Focused flows hide the tab bar: one task, one way out.
  const focus = screen === 'walk' || screen === 'edit' || screen === 'replan'
  return (
    <div className={focus ? 'app focus' : 'app'}>
      <main className="screen">
        {screen === 'people' ? (
          <People ui={ui} />
        ) : screen === 'review' ? (
          <Review ui={ui} />
        ) : screen === 'settings' ? (
          <Settings ui={ui} />
        ) : screen === 'rules' ? (
          <Rules />
        ) : screen === 'receive' ? (
          <Receive ui={ui} captureId={param} />
        ) : !fixer.mission(param) ? (
          <Home ui={ui} />
        ) : screen === 'm' ? (
          <MissionPage ui={ui} id={param} />
        ) : screen === 'replan' ? (
          <ReplanScreen ui={ui} id={param} />
        ) : screen === 'walk' ? (
          <Walkthrough ui={ui} id={param} back={missionPath(fixer.mission(param)!)} />
        ) : screen === 'edit' ? (
          <EditForm ui={ui} id={param} />
        ) : (
          <Home ui={ui} />
        )}
      </main>
      {invite && <InstallInvite ui={ui} done={closeInvite} />}
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
      {!focus && (
        <nav className="tabbar">
          {[
            ['', 'หน้าหลัก'],
            ['people', 'คน'],
            ['review', 'ทบทวน'],
            ['settings', 'ตั้งค่า'],
          ].map(([path, label]) => (
            <button key={path} aria-current={(screen || '') === path ? 'page' : undefined} onClick={() => go(path)}>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

export const missionPath = (m: Mission) =>
  m.status === 'draft' ? `receive/${m.id}` : m.status === 'queued' ? `edit/${m.id}` : `m/${m.id}`

function StatsStrip({ ui }: { ui: Ui }) {
  const s = ui.fixer.stats()
  const pct = s.rate.total ? Math.round((100 * s.rate.onTime) / s.rate.total) : undefined
  return (
    <section className="row thick" aria-label="สถิติ" style={{ alignItems: 'end' }}>
      <div className="c12">
        <p className="big-num" style={{ color: 'var(--accent)' }}>
          {pct === undefined ? '—' : `${pct}%`}
        </p>
        <p className="muted">
          เริ่มทันเวลา เดือนนี้ {s.rate.total > 0 && `(${s.rate.onTime}/${s.rate.total})`}
        </p>
      </div>
      <div className="c3">
        <p className="num">{s.closedThisMonth}</p>
        <p className="muted">ปิดแล้ว</p>
      </div>
      <div className="c4">
        <p className="num">{s.open}</p>
        <p className="muted">ค้างอยู่</p>
        {s.overdue > 0 && <p className="hot" style={{ fontSize: 14 }}>เลยกำหนด {s.overdue}</p>}
      </div>
    </section>
  )
}

/** One Mission in a list: what it is and what happens next. */
export function MissionRow({ ui, m }: { ui: Ui; m: Mission }) {
  const { fixer } = ui
  const left = fixer.countdown(m.id)
  const current = currentStep(m)
  const sub =
    m.status === 'draft'
      ? m.steps[0]?.text.trim()
        ? `ร่าง ก้าวแรก: ${m.steps[0].text}`
        : 'ร่าง ยังไม่ตั้งก้าวแรก'
      : m.status === 'done'
        ? `เสร็จ ${dateLabel(m.doneAt!)}`
        : current?.text.trim()
          ? `ต่อไป: ${current.text}`
          : m.status === 'active'
            ? 'ยังไม่ได้ตั้งก้าวต่อไป'
            : undefined
  return (
    <a className="item" href={`#/${missionPath(m)}`}>
      {fixer.isOverdue(m.id) ? (
        <span className="tag">เลยกำหนด</span>
      ) : (
        left !== undefined && (
          <span className="item-clock" aria-label="เวลาที่เหลือของห้านาที">
            {mmss(left)}
          </span>
        )
      )}
      <span className="body">
        <strong>{m.instruction || '(ยังไม่มีคำสั่งงาน)'}</strong>
        {sub && <span className="muted">{sub}</span>}
        {fixer.isStuck(m.id) && <span className="dot">ค้างก้าวนี้เกิน {fixer.settings().stuckAfter} นาที</span>}
      </span>
      <span className="go" aria-hidden={m.status !== 'draft'}>
        {m.status === 'draft' ? 'ทำต่อ ›' : '›'}
      </span>
    </a>
  )
}

function Home({ ui }: { ui: Ui }) {
  const { fixer } = ui
  const missions = fixer.homeList()
  const notStarted = (m: Mission) => (m.status === 'draft' || m.status === 'active') && !m.steps.some((s) => s.outcome)
  const urgent = missions.filter((m) => fixer.isOverdue(m.id) || notStarted(m))
  const doing = missions.filter((m) => !urgent.includes(m) && m.status === 'active')
  // An overdue Queued Mission joins the overdue group at the top (homeList already puts it there).
  const queued = missions.filter((m) => m.status === 'queued' && !urgent.includes(m))
  const done = missions.filter((m) => m.status === 'done')
  const dropped = fixer.missions().filter((m) => m.status === 'dropped')
  const group = (label: string, ms: Mission[]) =>
    ms.length > 0 && (
      <section className="row mid" aria-label={label}>
        <h2 className="lab">{label}</h2>
        <div className="val items">
          {ms.map((m) => (
            <MissionRow key={m.id} ui={ui} m={m} />
          ))}
        </div>
      </section>
    )
  return (
    <>
      <h1>ภารกิจ</h1>
      <RemindersNotice ui={ui} showInstall={ui.invite} />
      <StatsStrip ui={ui} />
      {missions.length === 0 && dropped.length === 0 && (
        <p className="empty">ยังไม่มีภารกิจ ได้รับงานเมื่อไร กด “รับภารกิจ” แล้วเวลา 5 นาทีจะเริ่มนับ</p>
      )}
      {group('ต้องจัดการก่อน', urgent)}
      {group('กำลังทำ', doing)}
      {queued.length > 0 && (
        <section className="row mid" aria-label="รอคิว">
          <h2 className="lab">รอคิว ({queued.length})</h2>
          <div className="val items">
            {queued.map((m) => (
              <QueuedRow key={m.id} ui={ui} m={m} />
            ))}
          </div>
        </section>
      )}
      {(done.length > 0 || dropped.length > 0) && (
        <div className="row mid">
          <h2 className="lab">ปิดแล้ว</h2>
          <div className="val">
            {done.length > 0 && (
              <details>
                <summary>เสร็จแล้ว ({done.length})</summary>
                <div className="items">
                  {done.map((m) => (
                    <MissionRow key={m.id} ui={ui} m={m} />
                  ))}
                </div>
              </details>
            )}
            {dropped.length > 0 && (
              <details>
                <summary>ยกเลิกแล้ว ({dropped.length})</summary>
                <section aria-label="ยกเลิกแล้ว" className="items">
                  {dropped.map((m) => (
                    <a key={m.id} className="item" href={`#/m/${m.id}`}>
                      <span className="body">
                        <strong>{m.instruction}</strong>
                        <span className="muted">{m.dropReason}</span>
                      </span>
                      <span className="go" aria-hidden>
                        ›
                      </span>
                    </a>
                  ))}
                </section>
              </details>
            )}
          </div>
        </div>
      )}
      <div className="actions">
        <button className="primary" onClick={() => ui.go(`receive/${crypto.randomUUID()}`)}>
          รับภารกิจ
        </button>
      </div>
    </>
  )
}

function waited(ms: number) {
  const min = Math.floor(ms / 60_000)
  return min < 60 ? `${min} นาที` : min < 24 * 60 ? `${Math.floor(min / 60)} ชม.` : `${Math.floor(min / (24 * 60))} วัน`
}

/** No countdown while Queued: only how long it has waited. Dropping or deleting lives in its edit screen. */
function QueuedRow({ ui, m }: { ui: Ui; m: Mission }) {
  return (
    <div className="item">
      <a className="body" href={`#/${missionPath(m)}`}>
        <strong>{m.instruction}</strong>
        <span className="muted">
          {m.deadlineAt !== undefined && `ส่ง ${dateLabel(m.deadlineAt)}, `}
          รอมา {waited(ui.ports.clock.now() - m.queuedAt!)}
        </span>
      </a>
      <button
        className="primary"
        style={{ minHeight: 44, fontSize: 15, flex: 'none' }}
        onClick={async () => {
          await ui.run(() => ui.fixer.pickUp(m.id))
          ui.go(`receive/${m.id}`)
        }}
      >
        หยิบ
      </button>
    </div>
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
  if (m.status === 'queued') return <Home ui={ui} />
  if (m.status !== 'draft') return <MissionPage ui={ui} id={m.id} />
  const pickedUp = m.pickedUpAt !== undefined
  const ready = m.instruction.trim() && m.steps[0]?.text.trim()
  const left = fixer.countdown(m.id)!
  return (
    <form
      className="stack"
      style={{ flex: 1, gap: 0 }}
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ready) return
        await ui.run(() => fixer.activate(m.id))
        ui.go(`m/${m.id}`)
      }}
    >
      <div className="grid" style={{ alignItems: 'end', paddingBottom: 12 }}>
        <h1 className="c13" style={{ margin: 0 }}>
          รับภารกิจ
        </h1>
        <p
          className="c4 num"
          style={{ textAlign: 'right', color: left === 0 ? 'var(--ink)' : 'var(--accent)' }}
          aria-label="เวลาที่เหลือของห้านาที"
        >
          {mmss(left)}
        </p>
      </div>
      <div className="row mid">
        <label className="lab" htmlFor="instruction">
          คำสั่งงาน
        </label>
        <div className="val">
          <textarea
            id="instruction"
            autoFocus={!pickedUp}
            rows={3}
            value={m.instruction}
            placeholder="เขียนตามที่ผู้สั่งพูด"
            onChange={(e) => ui.run(() => fixer.edit(m.id, { instruction: e.target.value }))}
          />
        </div>
      </div>
      <div className="row">
        <label className="lab" htmlFor="first-step">
          ก้าวแรก
        </label>
        <div className="val">
          <input
            id="first-step"
            autoFocus={pickedUp}
            value={m.steps[0]?.text ?? ''}
            placeholder="สิ่งที่ลงมือทำได้ภายใน 5 นาที"
            onChange={(e) => ui.run(() => fixer.edit(m.id, { firstStep: e.target.value }))}
          />
        </div>
      </div>
      <div className="row">
        <span className="lab">ตัวเลือก</span>
        <div className="val">
          <div className="chips">
            <button type="button" className="small" onClick={() => ui.go(`walk/${m.id}`)}>
              ตอบคำถามเพิ่ม
            </button>
            {fixer.canQueue(m.id) && (
              <button
                type="button"
                className="small"
                disabled={!m.instruction.trim()}
                onClick={async () => {
                  await ui.run(() => fixer.queue(m.id))
                  ui.go('')
                }}
              >
                เข้าคิวไว้ก่อน
              </button>
            )}
          </div>
          <button
            type="button"
            className="link"
            onClick={async () => {
              await ui.run(() => fixer.delete(m.id))
              ui.deleted()
            }}
          >
            ลบร่างนี้
          </button>
        </div>
      </div>
      <div className="actions">
        <button className="primary" disabled={!ready}>
          เริ่มลงมือ
        </button>
      </div>
    </form>
  )
}
