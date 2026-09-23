import { useState } from 'react'
import { currentStep, flags, replanReasonLabels, replanReasons, type Mission, type ReplanReason, type Step } from '../core/fixer'
import type { Ui } from './App'
import { helpText } from './People'

export const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

export function mmss(ms: number) {
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
  const [mode, setMode] = useState<'replan' | 'drop' | 'reopen'>()
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
      <Replans m={m} />
      {fixer.isStuck(id) && (
        <p className="tag bad" role="status">
          ก้าวนี้นานเกิน {fixer.settings().stuckAfter} นาทีแล้ว — ถามคนที่ช่วยได้ก่อนจะติดจริง
        </p>
      )}
      <Helpers ui={ui} id={id} />

      <ol className="steps">
        {m.steps.map((s) => (
          <StepItem
            key={s.id}
            ui={ui}
            missionId={id}
            step={s}
            isCurrent={s === current}
            replanned={m.replans.some((r) => r.abandonedStepId === s.id)}
          />
        ))}
      </ol>

      <div className="row">
        <button onClick={() => ui.go(`walk/${id}`)}>เติมรายละเอียด</button>
        <button onClick={() => ui.go(`edit/${id}`)}>แก้ไข</button>
      </div>

      {m.status === 'done' && <p className="tag">เสร็จแล้ว {dateLabel(m.doneAt!)} {clockTime(m.doneAt!)}</p>}
      <StatusBox ui={ui} id={id} />
      {m.status === 'dropped' && <p className="tag bad">ยกเลิกแล้ว: {m.dropReason}</p>}

      {current && !mode && (
        <div className="row">
          <button className="link" onClick={() => setMode('drop')}>
            ยกเลิกภารกิจ
          </button>
          <button
            className="link"
            onClick={async () => {
              await ui.run(() => fixer.delete(id))
              ui.deleted()
            }}
          >
            ลบ (สร้างผิด)
          </button>
        </div>
      )}

      <div className="actions">
        {mode === 'replan' ? (
          <ReplanForm ui={ui} m={m} done={() => setMode(undefined)} />
        ) : mode === 'drop' ? (
          <NameStep
            label="ทำไมถึงยกเลิก?"
            button="ยืนยันยกเลิก"
            onCancel={() => setMode(undefined)}
            onSave={async (reason) => {
              await ui.run(() => fixer.drop(id, reason))
              setMode(undefined)
            }}
          />
        ) : mode === 'reopen' ? (
          <NameStep
            button="เปิดงาน"
            onCancel={() => setMode(undefined)}
            onSave={async (step) => {
              await ui.run(() => fixer.reopen(id, step))
              setMode(undefined)
            }}
          />
        ) : m.status === 'done' ? (
          <button onClick={() => setMode('reopen')}>เปิดงานอีกครั้ง</button>
        ) : !current ? null : !current.text.trim() ? (
          <>
            <NameStep key={current.id} onSave={(text) => ui.run(() => fixer.editStep(id, current.id, text))} />
            <button onClick={() => ui.run(() => fixer.close(id))}>ปิดงาน (ไม่มีก้าวต่อไป)</button>
          </>
        ) : (
          <>
            <button className="primary big" onClick={() => ui.run(() => fixer.completeStep(id))}>
              {firstStepPending ? 'ทำก้าวแรกแล้ว' : 'เสร็จก้าวนี้'}
            </button>
            <div className="row">
              <button className="danger" onClick={() => setMode('replan')}>
                แผนพัง
              </button>
              <button onClick={() => ui.run(() => fixer.close(id))}>ปิดงาน</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Replans({ m }: { m: Mission }) {
  if (m.replans.length === 0) return null
  const reasons = m.replans.map((r) => replanReasonLabels[r.reason] + (r.note ? ` (${r.note})` : ''))
  return <p className="tag warn">{`แผนพัง ${m.replans.length} ครั้ง: ${reasons.join(', ')}`}</p>
}

function ReplanForm({ ui, m, done }: { ui: Ui; m: Mission; done: () => void }) {
  const [reason, setReason] = useState<ReplanReason>()
  const [note, setNote] = useState('')
  const [step, setStep] = useState('')
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!reason || !step.trim()) return
        await ui.run(() => ui.fixer.replan(m.id, { reason, note, step }))
        done()
      }}
    >
      <h2>แผนพัง — เปลี่ยนทาง ไม่เปลี่ยนเป้า</h2>
      <div className="planb">
        <strong>Plan B:</strong> {m.planB?.trim() || <span className="muted">ยังไม่ได้เขียน Plan B</span>}
      </div>
      <fieldset className="checks">
        <legend>พังเพราะอะไร</legend>
        {replanReasons.map((r) => (
          <label key={r} className="check">
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
            {replanReasonLabels[r]}
          </label>
        ))}
      </fieldset>
      <label>
        รายละเอียด (ไม่ใส่ก็ได้)
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <label>
        ก้าวใหม่คืออะไร?
        <input value={step} onChange={(e) => setStep(e.target.value)} />
      </label>
      <div className="row">
        <button type="button" onClick={done}>
          ยกเลิก
        </button>
        <button className="primary" disabled={!reason || !step.trim()}>
          เปลี่ยนแผน
        </button>
      </div>
    </form>
  )
}

export function NameStep({
  onSave,
  label = 'ก้าวต่อไปคืออะไร?',
  button = 'ตั้งก้าวนี้',
  initial = '',
  onCancel,
}: {
  onSave: (text: string) => unknown
  onCancel?: () => void
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
      {onCancel && (
        <button type="button" onClick={onCancel}>
          ไม่ใช่ตอนนี้
        </button>
      )}
    </form>
  )
}

function StepItem({
  ui,
  missionId,
  step,
  isCurrent,
  replanned,
}: {
  ui: Ui
  missionId: string
  step: Step
  isCurrent: boolean
  replanned: boolean
}) {
  const [editing, setEditing] = useState(false)
  if (!step.text && isCurrent) return null
  return (
    <li className={`step ${step.outcome ?? 'current'}`}>
      {editing ? (
        <NameStep
          label="แก้ข้อความก้าวนี้"
          initial={step.text}
          onCancel={() => setEditing(false)}
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
            {step.outcome === 'abandoned' && (replanned ? 'แผนพัง — เลิกทางนี้' : 'ไม่ได้ทำ')}
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

function StatusBox({ ui, id }: { ui: Ui; id: string }) {
  const [result, setResult] = useState<string>()
  const sentence = ui.fixer.statusSentence(id)
  if (!sentence) return null
  const done = ui.fixer.mission(id)!.status === 'done'
  return (
    <section className="status" aria-label="ประโยคสถานะ">
      <p>{sentence}</p>
      <button
        className={done ? 'primary' : ''}
        onClick={async () => setResult((await ui.ports.share.share(sentence)) === 'copied' ? 'คัดลอกแล้ว' : undefined)}
      >
        {done ? 'บอกผู้สั่งงานว่าเสร็จแล้ว' : 'ส่งสถานะ'}
      </button>
      {result && <small role="status">{result}</small>}
    </section>
  )
}
