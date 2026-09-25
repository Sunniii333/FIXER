import { useState } from 'react'
import { currentStep, flags, replanReasonLabels, replanReasons, type Mission, type ReplanReason, type Step } from '../core/fixer'
import type { Ui } from './App'
import { helpText } from './People'

const FIVE_MIN = 5 * 60_000

export const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

export function mmss(ms: number) {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const dateLabel = (ms: number) => new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })

/** One Mission, top to bottom by importance: the clock, the Step to do now, then everything else. */
export function MissionPage({ ui, id }: { ui: Ui; id: string }) {
  const { fixer } = ui
  const m = fixer.mission(id)!
  const left = fixer.countdown(id)
  const onTime = fixer.onTimeStart(id)
  const current = currentStep(m)
  const firstStepPending = !m.steps[0]?.outcome
  const f = flags(m)
  const assigner = fixer.person(m.assignerId)
  const open = m.status === 'active' || m.status === 'draft'
  const [mode, setMode] = useState<'drop' | 'reopen'>()
  const deadline = [m.deadlineText, m.deadlineAt !== undefined && dateLabel(m.deadlineAt)].filter(Boolean).join(', ')
  const del = async () => {
    await ui.run(() => fixer.delete(id))
    ui.deleted()
  }

  const actions =
    mode === 'drop' ? (
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
    ) : firstStepPending ? (
      <>
        <button className="primary c13" onClick={() => ui.run(() => fixer.completeStep(id))}>
          ทำก้าวแรกแล้ว
        </button>
        <button className="c4" onClick={() => ui.go(`replan/${id}`)}>
          แผนพัง
        </button>
      </>
    ) : (
      <>
        <button className="primary c12" onClick={() => ui.run(() => fixer.completeStep(id))}>
          เสร็จก้าวนี้
        </button>
        <button className="c34" onClick={() => ui.run(() => fixer.close(id))}>
          ปิดงาน
        </button>
        <button className="c4" onClick={() => ui.go(`replan/${id}`)}>
          แผนพัง
        </button>
      </>
    )

  return (
    <div className="stack" style={{ flex: 1, gap: 0 }}>
      <div className="row plain">
        <span className="lab">ภารกิจ</span>
        <div className="val" style={{ gap: 2 }}>
          <h1 className="small">{m.instruction}</h1>
          {assigner && <p className="muted">สั่งโดย {assigner.name}</p>}
          {onTime !== undefined && left === undefined && (
            <span className={onTime ? 'tag plain' : 'tag'}>{onTime ? 'เริ่มทันเวลา' : 'เริ่มช้า'}</span>
          )}
        </div>
      </div>

      {m.status === 'done' && (
        <div className="row thick">
          <span className="lab">เสร็จแล้ว</span>
          <p className="val">
            {dateLabel(m.doneAt!)} {clockTime(m.doneAt!)}
          </p>
        </div>
      )}
      {m.status === 'dropped' && (
        <div className="row thick">
          <p className="full">{`ยกเลิกแล้ว: ${m.dropReason}`}</p>
        </div>
      )}

      {left !== undefined && (
        <section className="row thick" aria-label="นาฬิกา 5 นาที">
          <div className="full" style={{ gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{left === 0 ? 'ครบ 5 นาทีแล้ว' : 'เริ่มให้ทันใน'}</span>
            <p className={left === 0 ? 'clock over' : 'clock'} aria-label="เวลาที่เหลือของห้านาที">
              {mmss(left)}
            </p>
            <div className="bar" aria-hidden>
              <span style={{ width: `${(100 * left) / FIVE_MIN}%` }} />
            </div>
            {left === 0 && <p className="muted">ยังทำก้าวแรกได้ บันทึกตามจริง แต่จะนับว่าเริ่มช้า</p>}
          </div>
        </section>
      )}

      {open && current?.text.trim() && (
        <section className={left !== undefined ? 'row mid' : 'row thick'} aria-label="ก้าวที่ต้องทำตอนนี้">
          <span className="lab">{firstStepPending ? 'ก้าวแรก' : 'ก้าวตอนนี้'}</span>
          <div className="val" style={{ gap: 2 }}>
            <p className="step-text">{current.text}</p>
            {!firstStepPending && <p className="muted">ตั้งแต่ {clockTime(current.startedAt)}</p>}
          </div>
        </section>
      )}

      {fixer.isStuck(id) && (
        <section className="row mid" role="status">
          <span className="lab hot">ติดขัด</span>
          <p className="val">ก้าวนี้นานเกิน {fixer.settings().stuckAfter} นาทีแล้ว ถามคนที่ช่วยได้ก่อนจะติดจริง</p>
        </section>
      )}

      <div className="row">
        <span className="lab">เป้า</span>
        <div className="val">
          {m.doneDefinition?.trim() ? (
            <p style={{ whiteSpace: 'pre-wrap' }}>{m.doneDefinition}</p>
          ) : f.goalUnclear ? (
            <>
              <span className="tag">เป้ายังไม่ชัด</span>
              <p className="muted">ยังไม่ได้บอกว่างานเสร็จแล้วหน้าตาเป็นอย่างไร</p>
              <button className="small" onClick={() => ui.go(`walk/${id}`)}>
                กำหนดเป้า
              </button>
            </>
          ) : (
            <p className="muted">ไม่ได้ระบุ</p>
          )}
        </div>
      </div>

      {deadline && (
        <div className="row">
          <span className="lab">กำหนดส่ง</span>
          <div className="val" style={{ gap: 4 }}>
            <p>{deadline}</p>
            {fixer.isOverdue(id) && <span className="tag">เลยกำหนด</span>}
            {f.noDate && <span className="tag plain">ไม่มีวันกำหนด</span>}
          </div>
        </div>
      )}

      <div className="row">
        <span className="lab">คนช่วย</span>
        <div className="val">
          <Helpers ui={ui} id={id} />
        </div>
      </div>

      {m.replans.length > 0 && (
        <div className="row">
          <span className="lab">เปลี่ยนแผน</span>
          <p className="val">
            {`แผนพัง ${m.replans.length} ครั้ง: ${m.replans.map((r) => replanReasonLabels[r.reason] + (r.note ? ` (${r.note})` : '')).join(', ')}`}
          </p>
        </div>
      )}

      <StatusBox ui={ui} id={id} />

      <div className="row">
        <span className="lab">เพิ่มเติม</span>
        <div className="val" style={{ gap: 0 }}>
          <details>
            <summary>รายละเอียดงาน</summary>
            <div className="stack" style={{ paddingBottom: 12 }}>
              <Facts m={m} />
              <button className="small" onClick={() => ui.go(`walk/${id}`)}>
                เติมรายละเอียด
              </button>
            </div>
          </details>
          <details>
            <summary>ประวัติก้าว ({m.steps.filter((s) => s.text).length})</summary>
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
          </details>
          <details>
            <summary>จัดการภารกิจ</summary>
            <div className="stack" style={{ paddingBottom: 12 }}>
              <button className="small" onClick={() => ui.go(`edit/${id}`)}>
                แก้ไข
              </button>
              {open && current?.text.trim() && firstStepPending && (
                <button className="small" onClick={() => ui.run(() => fixer.close(id))}>
                  ปิดงาน (ยังไม่ได้ทำก้าวแรก)
                </button>
              )}
              {current && (
                <>
                  <button className="small" onClick={() => setMode('drop')}>
                    ยกเลิกภารกิจ
                  </button>
                  <button className="link" onClick={del}>
                    ลบ (สร้างผิด)
                  </button>
                </>
              )}
            </div>
          </details>
        </div>
      </div>

      {actions && <div className="actions">{actions}</div>}
    </div>
  )
}

/** A full screen of its own: the goal stays, the path changes. */
export function ReplanScreen({ ui, id }: { ui: Ui; id: string }) {
  const m = ui.fixer.mission(id)!
  const current = currentStep(m)
  const [reason, setReason] = useState<ReplanReason>()
  const [note, setNote] = useState('')
  const [step, setStep] = useState('')
  const [showNote, setShowNote] = useState(false)
  const back = () => ui.go(`m/${id}`)
  if (!current) return <MissionPage ui={ui} id={id} />
  return (
    <form
      className="stack"
      style={{ flex: 1, gap: 0 }}
      onSubmit={async (e) => {
        e.preventDefault()
        if (!reason || !step.trim()) return
        await ui.run(() => ui.fixer.replan(id, { reason, note, step }))
        back()
      }}
    >
      <div className="topbar">
        <button type="button" className="back" aria-label="ปิด" onClick={back}>
          ×
        </button>
        <div className="c24" style={{ padding: '8px 0' }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>แผนพัง</h1>
          <p className="muted">เปลี่ยนทาง ไม่เปลี่ยนเป้า</p>
        </div>
      </div>
      <div className="row thick">
        <span className="lab">เป้า</span>
        <p className="val" style={{ fontWeight: 700 }}>
          {m.doneDefinition?.trim() || m.instruction}
        </p>
      </div>
      <div className="row">
        <span className="lab">ทางที่พัง</span>
        <p className="val strike">{current.text || '(ยังไม่ได้ตั้ง)'}</p>
      </div>
      <div className="row mid">
        <span className="lab" id="why">
          พังเพราะ
        </span>
        <div className="val chips" role="radiogroup" aria-labelledby="why">
          {replanReasons.map((r) => (
            <label key={r} className="chip">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} />
              {replanReasonLabels[r]}
            </label>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="lab" htmlFor="new-step">
          ก้าวใหม่
        </label>
        <div className="val">
          <input
            id="new-step"
            aria-label="ก้าวใหม่คืออะไร?"
            placeholder="สิ่งที่ลงมือได้ทันที"
            value={step}
            onChange={(e) => setStep(e.target.value)}
          />
          {m.planB?.trim() ? (
            <button type="button" className="soft" onClick={() => setStep(m.planB!.trim())}>
              <span className="muted">ใช้แผนสำรองเป็นก้าวใหม่</span>
              <br />
              <strong>{m.planB.trim()}</strong>
            </button>
          ) : (
            <p className="muted">ยังไม่ได้เขียนแผนสำรอง</p>
          )}
          {showNote ? (
            <label>
              รายละเอียด (ไม่ใส่ก็ได้)
              <input value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          ) : (
            <button type="button" className="link" onClick={() => setShowNote(true)}>
              เพิ่มรายละเอียด
            </button>
          )}
        </div>
      </div>
      <div className="actions">
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
      <div className="grid" style={{ rowGap: 8 }}>
        <button className={onCancel ? 'primary c24' : 'primary c14'} disabled={!text.trim()}>
          {button}
        </button>
        {onCancel && (
          <button type="button" className="c1" style={{ gridRow: 1 }} onClick={onCancel}>
            ไม่ใช่ตอนนี้
          </button>
        )}
      </div>
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
    <li className={step.outcome ?? 'current'}>
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

function Facts({ m }: { m: Mission }) {
  const rows: [string, string | undefined][] = [
    ['ข้อจำกัด', m.constraints],
    ['อาจพังตรงไหน', m.risk],
    ['แผนสำรอง', m.planB],
  ]
  const shown = rows.filter(([, v]) => v?.trim())
  if (shown.length === 0) return <p className="muted">ยังไม่ได้เขียนข้อจำกัด ความเสี่ยง หรือแผนสำรอง</p>
  return (
    <dl className="facts">
      {shown.map(([k, v]) => (
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
      <>
        <p className="muted">ยังไม่ได้ระบุคนที่ช่วยได้</p>
        <button className="small" onClick={() => ui.go(`edit/${id}`)}>
          เลือกจากรายชื่อคน
        </button>
      </>
    )
  return (
    <ul className="items" aria-label="คนที่ช่วยได้" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
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
    <section className={done ? 'row mid' : 'row'} aria-label="ประโยคสถานะ">
      <span className="lab">สถานะ</span>
      <div className="val">
        <p className="muted">{sentence}</p>
        <button
          className={done ? 'primary' : 'small'}
          onClick={async () => setResult((await ui.ports.share.share(sentence)) === 'copied' ? 'คัดลอกแล้ว' : undefined)}
        >
          {done ? 'บอกผู้สั่งงานว่าเสร็จแล้ว' : 'ส่งสถานะ'}
        </button>
        {result && (
          <small role="status" className="muted">
            {result}
          </small>
        )}
      </div>
    </section>
  )
}
