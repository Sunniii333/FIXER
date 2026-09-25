import { useEffect, useRef, useState } from 'react'
import type { Mission, MissionPatch } from '../core/fixer'
import type { Ui } from './App'
import { NameStep } from './MissionPage'

/** A picked date is stored as the end of that local day (there is no time-of-day field). */
export const fromDateInput = (v: string) => {
  if (!v) return undefined
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}
const toDateInput = (ms?: number) => {
  if (ms === undefined) return ''
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Set = (p: MissionPatch) => void
/** `long` is the walkthrough (the question, big); otherwise the edit form's short label. */
type Q = { key: string; topic: string; render: (p: MissionPatch, set: Set, ui: Ui, long: boolean) => React.ReactNode }

const text = (
  field: 'doneDefinition' | 'constraints' | 'risk' | 'planB',
  topic: string,
  question: string,
  short: string,
  hint?: string,
  placeholder?: string,
): Q => ({
  key: field,
  topic,
  render: (p, set, _ui, long) => (
    <>
      <label>
        {long ? <span className="q-text">{question}</span> : short}
        <textarea rows={long ? 4 : 2} placeholder={placeholder} value={p[field] ?? ''} onChange={(e) => set({ [field]: e.target.value })} />
      </label>
      {hint && <span className="hint">{hint}</span>}
    </>
  ),
})

function Deadline({ p, set, long }: { p: MissionPatch; set: Set; long: boolean }) {
  return (
    <>
      <label>
        {long ? <span className="q-text">ต้องเสร็จเมื่อไร?</span> : 'พูดไว้ว่า'}
        <input placeholder="เช่น ก่อนประชุมวันพฤหัส" value={p.deadlineText ?? ''} onChange={(e) => set({ deadlineText: e.target.value })} />
      </label>
      <label>
        วันที่
        <input type="date" value={toDateInput(p.deadlineAt)} onChange={(e) => set({ deadlineAt: fromDateInput(e.target.value) })} />
      </label>
      {p.deadlineText?.trim() && p.deadlineAt === undefined && (
        <p className="hint">ใส่วันที่ด้วยไหม? ถ้ามีวันที่ แอปจะบอกเมื่อเลยกำหนด</p>
      )}
    </>
  )
}

function PeoplePicker({ p, set, ui, long }: { p: MissionPatch; set: Set; ui: Ui; long: boolean }) {
  const people = ui.fixer.people()
  if (people.length === 0)
    return (
      <>
        {long && <span className="q-text">ใครสั่ง ใครช่วยได้?</span>}
        <p className="hint">ยังไม่มีรายชื่อคน เพิ่มได้ที่แท็บ “คน” แล้วกลับมาเลือกผู้สั่งงานและคนที่ช่วยได้</p>
      </>
    )
  const helperIds = p.helperIds ?? []
  return (
    <>
      {long && <span className="q-text">ใครสั่ง ใครช่วยได้?</span>}
      <label>
        ผู้สั่งงาน
        <select value={p.assignerId ?? ''} onChange={(e) => set({ assignerId: e.target.value || undefined })}>
          <option value="">ไม่ระบุ</option>
          {people.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ fontSize: 14, fontWeight: 700, padding: 0, marginBottom: 6 }}>คนที่ช่วยได้</legend>
        <div className="chips">
          {people.map((x) => (
            <label key={x.id} className="chip">
              <input
                type="checkbox"
                checked={helperIds.includes(x.id)}
                onChange={() =>
                  set({ helperIds: helperIds.includes(x.id) ? helperIds.filter((h) => h !== x.id) : [...helperIds, x.id] })
                }
              />
              {x.name}
            </label>
          ))}
        </div>
      </fieldset>
    </>
  )
}

const questions: Q[] = [
  text('doneDefinition', 'เป้าหมาย', 'งานเสร็จแล้ว หน้าตาเป็นอย่างไร?', 'เสร็จแล้วหน้าตาเป็นอย่างไร', 'บอกให้เห็นภาพว่าใครได้อะไร ในรูปแบบไหน', 'เช่น ส่งไฟล์สรุปให้หัวหน้าทางอีเมล'),
  { key: 'deadline', topic: 'กำหนดส่ง', render: (p, set, _ui, long) => <Deadline p={p} set={set} long={long} /> },
  text('constraints', 'ข้อจำกัด', 'มีอะไรที่ห้ามทำ หรือข้อจำกัดไหม?', 'ข้อจำกัด'),
  { key: 'people', topic: 'คน', render: (p, set, ui, long) => <PeoplePicker p={p} set={set} ui={ui} long={long} /> },
  text('risk', 'ความเสี่ยง', 'แผนนี้อาจพังตรงไหน?', 'อาจพังตรงไหน'),
  text('planB', 'แผนสำรอง', 'ถ้าพัง จะทำอะไรแทน?', 'แผนสำรอง'),
]

const pick = (m: Mission): MissionPatch => ({
  instruction: m.instruction,
  doneDefinition: m.doneDefinition,
  deadlineText: m.deadlineText,
  deadlineAt: m.deadlineAt,
  constraints: m.constraints,
  assignerId: m.assignerId,
  helperIds: m.helperIds,
  risk: m.risk,
  planB: m.planB,
})

/** Asks one question per screen; every question can be skipped, and you can step back or leave at any point. */
export function Walkthrough({ ui, id, back }: { ui: Ui; id: string; back: string }) {
  const [i, setI] = useState(0)
  const [p, setP] = useState(() => pick(ui.fixer.mission(id)!))
  const q = questions[i]
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => box.current?.querySelector<HTMLElement>('input, textarea, select')?.focus(), [i])
  const next = async (save: boolean) => {
    if (save) await ui.run(() => ui.fixer.edit(id, p))
    else setP(pick(ui.fixer.mission(id)!))
    if (i + 1 < questions.length) setI(i + 1)
    else ui.go(back)
  }
  return (
    <div className="stack" style={{ flex: 1, gap: 0 }} key={q.key} ref={box}>
      <div className="topbar">
        <button className="back" aria-label={i ? 'ข้อก่อนหน้า' : 'กลับ'} onClick={() => (i ? setI(i - 1) : ui.go(back))}>
          ←
        </button>
        <div className="progress" style={{ gridColumn: '2 / 4', ['--n' as string]: questions.length }} aria-label={`ข้อ ${i + 1} จาก ${questions.length}`}>
          {questions.map((x, n) => (
            <span key={x.key} className={n <= i ? 'on' : undefined} />
          ))}
        </div>
        <button
          className="end"
          onClick={async () => {
            await ui.run(() => ui.fixer.edit(id, p))
            ui.go(back)
          }}
        >
          เสร็จ
        </button>
      </div>
      <div className="row plain" style={{ paddingTop: 4 }}>
        <span className="c1 q-num">{i + 1}</span>
        <div className="val">
          <span style={{ fontSize: 14, fontWeight: 700 }}>{q.topic}</span>
          {q.render(p, (patch) => setP({ ...p, ...patch }), ui, true)}
        </div>
      </div>
      <div className="actions">
        <button className="c1" onClick={() => next(false)}>
          ข้าม
        </button>
        <button className="primary c24" onClick={() => next(true)}>
          ถัดไป
        </button>
      </div>
    </div>
  )
}

/** Everything on one form, grouped, for later changes. A Queued Mission is also dropped or deleted from here. */
export function EditForm({ ui, id }: { ui: Ui; id: string }) {
  const m = ui.fixer.mission(id)!
  const [p, setP] = useState(() => pick(m))
  const [dropping, setDropping] = useState(false)
  const set = (patch: MissionPatch) => setP({ ...p, ...patch })
  const queued = m.status === 'queued'
  const back = queued ? '' : `m/${id}` // editing a Queued Mission never picks it up
  const [q1, q2, q3, q4, q5, q6] = questions.map((q) => q.render(p, set, ui, false))
  const group = (label: string, body: React.ReactNode, weight = 'row mid') => (
    <section className={weight} aria-label={label} style={{ paddingBottom: 20 }}>
      <h2 className="lab">{label}</h2>
      <div className="val" style={{ gap: 12 }}>
        {body}
      </div>
    </section>
  )
  return (
    <div className="stack" style={{ flex: 1, gap: 0 }}>
      <div className="topbar">
        <button type="button" className="back" aria-label="กลับ" onClick={() => ui.go(back)}>
          ←
        </button>
        <h1 className="c24" style={{ margin: 0 }}>
          แก้ไข
        </h1>
      </div>
      <form
        id="edit-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!p.instruction?.trim()) return
          await ui.run(() => ui.fixer.edit(id, p))
          ui.go(back)
        }}
      >
      {group(
        'งาน',
        <>
          <label>
            คำสั่งงาน
            <textarea rows={3} value={p.instruction ?? ''} onChange={(e) => set({ instruction: e.target.value })} />
          </label>
          {q1}
          {q3}
        </>,
        'row thick',
      )}
      {group('กำหนดส่ง', q2)}
      {group('คน', q4)}
      {group(
        'ถ้าแผนพัง',
        <>
          {q5}
          {q6}
        </>,
      )}
      </form>
      {queued &&
        group(
          'จัดการ',
          dropping ? (
            <NameStep
              label="ทำไมถึงยกเลิก?"
              button="ยืนยันยกเลิก"
              onCancel={() => setDropping(false)}
              onSave={async (reason) => {
                await ui.run(() => ui.fixer.drop(id, reason))
                ui.go('')
              }}
            />
          ) : (
            <>
              <button type="button" className="small" onClick={() => setDropping(true)}>
                ยกเลิกภารกิจ
              </button>
              <button
                type="button"
                className="link"
                onClick={async () => {
                  await ui.run(() => ui.fixer.delete(id))
                  ui.deleted()
                }}
              >
                ลบ (สร้างผิด)
              </button>
            </>
          ),
        )}
      <div className="actions">
        <button type="button" className="c1" onClick={() => ui.go(back)}>
          ยกเลิก
        </button>
        <button className="primary c24" form="edit-form">
          บันทึกการแก้ไข
        </button>
      </div>
    </div>
  )
}
