import { useState } from 'react'
import { currentStep, flags, type Mission, type Step } from '../core/fixer'
import type { Ui } from './App'
import { helpText } from './People'

export const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

function mmss(ms: number) {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function MissionPage({ ui, id }: { ui: Ui; id: string }) {
  const { fixer } = ui
  const m = fixer.mission(id)!
  const left = fixer.countdown(id)
  const onTime = fixer.onTimeStart(id)
  const current = currentStep(m)
  const firstStepPending = !m.steps[0]?.outcome
  const f = flags(m)
  const assigner = fixer.person(m.assignerId)
  return (
    <div className="stack">
      <h1>{m.instruction}</h1>
      {left !== undefined ? (
        <p className={`clock ${left === 0 ? 'over' : ''}`} aria-label="เวลาที่เหลือของห้านาที">
          {mmss(left)}
        </p>
      ) : (
        onTime !== undefined && <span className={`tag ${onTime ? '' : 'warn'}`}>{onTime ? 'เริ่มทันเวลา' : 'เริ่มช้า'}</span>
      )}

      <div className="row tags">
        {f.goalUnclear && <span className="tag warn">เป้ายังไม่ชัด</span>}
        {f.noDate && <span className="tag">ไม่มีวันกำหนด</span>}
      </div>
      {assigner && <p className="muted">สั่งโดย {assigner.name}</p>}
      <Facts m={m} />
      <Helpers ui={ui} id={id} />

      <ol className="steps">
        {m.steps.map((s) => (
          <StepItem key={s.id} ui={ui} missionId={id} step={s} isCurrent={s === current} />
        ))}
      </ol>

      <div className="row">
        <button onClick={() => ui.go(`walk/${id}`)}>เติมรายละเอียด</button>
        <button onClick={() => ui.go(`edit/${id}`)}>แก้ไข</button>
      </div>

      {current && (
        <div className="actions">
          {!current.text.trim() ? (
            <NameStep key={current.id} onSave={(text) => ui.run(() => fixer.editStep(id, current.id, text))} />
          ) : (
            <button className="primary big" onClick={() => ui.run(() => fixer.completeStep(id))}>
              {firstStepPending ? 'ทำก้าวแรกแล้ว' : 'เสร็จก้าวนี้'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function NameStep({
  onSave,
  label = 'ก้าวต่อไปคืออะไร?',
  button = 'ตั้งก้าวนี้',
  initial = '',
}: {
  onSave: (text: string) => unknown
  label?: string
  button?: string
  initial?: string
}) {
  const [text, setText] = useState(initial)
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (text.trim()) onSave(text.trim())
      }}
    >
      <label>
        {label}
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <button className="primary big" disabled={!text.trim()}>
        {button}
      </button>
    </form>
  )
}

function StepItem({ ui, missionId, step, isCurrent }: { ui: Ui; missionId: string; step: Step; isCurrent: boolean }) {
  const [editing, setEditing] = useState(false)
  if (!step.text && isCurrent) return null
  return (
    <li className={`step ${step.outcome ?? 'current'}`}>
      {editing ? (
        <NameStep
          label="แก้ข้อความก้าวนี้"
          initial={step.text}
          button="บันทึก"
          onSave={async (text) => {
            await ui.run(() => ui.fixer.editStep(missionId, step.id, text))
            setEditing(false)
          }}
        />
      ) : (
        <>
          <span>{step.text}</span>
          <small className="muted">
            {step.outcome === 'done' && `เสร็จ ${clockTime(step.doneAt!)}`}
            {step.outcome === 'abandoned' && 'แผนพัง — เลิกทางนี้'}
            {isCurrent && `ก้าวปัจจุบัน ตั้งแต่ ${clockTime(step.startedAt)}`}
          </small>
          {step.outcome === 'done' && (
            <button className="link" onClick={() => setEditing(true)}>
              แก้ข้อความ
            </button>
          )}
        </>
      )}
    </li>
  )
}

export const dateLabel = (ms: number) => new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

function Facts({ m }: { m: Mission }) {
  const deadline = [m.deadlineText, m.deadlineAt !== undefined && dateLabel(m.deadlineAt)].filter(Boolean).join(' · ')
  const rows: [string, string | undefined][] = [
    ['เสร็จเมื่อ', m.doneDefinition],
    ['กำหนดส่ง', deadline],
    ['ข้อจำกัด', m.constraints],
    ['Risk', m.risk],
    ['Plan B', m.planB],
  ]
  return (
    <dl className="facts">
      {rows
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  )
}

/** Who to ask before getting stuck. With no Helpers, offer the People list. */
export function Helpers({ ui, id }: { ui: Ui; id: string }) {
  const helpers = ui.fixer.helpers(id)
  if (helpers.length === 0)
    return (
      <p className="muted">
        ยังไม่ได้ระบุคนที่ช่วยได้ —{' '}
        <button className="link" onClick={() => ui.go(`edit/${id}`)}>
          เลือกจากรายชื่อคน
        </button>
      </p>
    )
  return (
    <ul className="helpers" aria-label="คนที่ช่วยได้">
      {helpers.map((p) => (
        <li key={p.id}>
          <strong>{p.name}</strong> <span className="muted">{helpText(p)}</span>
        </li>
      ))}
    </ul>
  )
}
