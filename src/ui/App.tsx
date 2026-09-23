'use client'
// Every screen that touches Mission content lives under this client component.
// Mission data is loaded from the Storage port in the browser, never from the server.
import { useEffect, useReducer, useState } from 'react'
import { Fixer, type Clock, type Storage } from '../core/fixer'

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
        {screen === 'receive' ? (
          <Receive ui={ui} captureId={param} />
        ) : screen === 'm' && fixer.mission(param) ? (
          <MissionPage ui={ui} id={param} />
        ) : (
          <Home ui={ui} />
        )}
      </main>
      <nav className="tabbar">
        <button onClick={() => go('')}>หน้าหลัก</button>
      </nav>
    </div>
  )
}

function Home({ ui }: { ui: Ui }) {
  const missions = ui.fixer.missions()
  return (
    <>
      <h1>ภารกิจ</h1>
      {missions.length === 0 && <p className="muted">ยังไม่มีภารกิจ กด “รับภารกิจ” เมื่อได้รับงาน</p>}
      <ul className="list">
        {missions.map((m) => (
          <li key={m.id}>
            <a className="card" href={`#/m/${m.id}`}>
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
        <button className="primary big" disabled={!ready}>
          เริ่มลงมือ
        </button>
      </div>
    </form>
  )
}

function MissionPage({ ui, id }: { ui: Ui; id: string }) {
  const m = ui.fixer.mission(id)!
  return (
    <div className="stack">
      <h1>{m.instruction}</h1>
      <p>ก้าวปัจจุบัน: {m.steps.at(-1)?.text}</p>
    </div>
  )
}
