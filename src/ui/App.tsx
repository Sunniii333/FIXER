'use client'
// Every screen that touches Mission content lives under this client component.
// Mission data is loaded from the Storage port in the browser, never from the server.
import { useEffect, useReducer, useState } from 'react'
import { Fixer, type Clock, type Mission, type Storage } from '../core/fixer'
import { MissionPage } from './MissionPage'
import { EditForm, Walkthrough } from './EditMission'
import { People } from './People'

export type Ports = { clock: Clock; storage: Storage }

export type Ui = { fixer: Fixer; ports: Ports; run: (fn: () => Promise<unknown>) => Promise<void>; go: (path: string) => void }

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
  }

  return (
    <div className="app">
      <main className="screen">
        {screen === 'people' ? (
          <People ui={ui} />
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
      <nav className="tabbar">
        {[
          ['', 'หน้าหลัก'],
          ['people', 'คน'],
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

function Home({ ui }: { ui: Ui }) {
  const missions = ui.fixer.missions()
  return (
    <>
      <h1>ภารกิจ</h1>
      {missions.length === 0 && <p className="muted">ยังไม่มีภารกิจ กด “รับภารกิจ” เมื่อได้รับงาน</p>}
      <ul className="list">
        {missions.map((m) => (
          <li key={m.id}>
            <a className="card" href={`#/${missionPath(m)}`}>
              <span className="tag">{m.status === 'draft' ? 'ร่าง' : 'กำลังทำ'}</span>
              <span>{m.instruction || '(ยังไม่มีคำสั่งงาน)'}</span>
            </a>
          </li>
        ))}
      </ul>
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
