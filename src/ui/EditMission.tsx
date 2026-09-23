import { useEffect, useRef, useState } from 'react'
import type { Mission, MissionPatch } from '../core/fixer'
import type { Ui } from './App'

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

type Q = { key: string; render: (p: MissionPatch, set: (p: MissionPatch) => void, ui: Ui) => React.ReactNode }

const text = (field: 'doneDefinition' | 'constraints' | 'risk' | 'planB', label: string, hint?: string): Q => ({
  key: field,
  render: (p, set) => (
    <label>
      {label}
      <textarea rows={3} placeholder={hint} value={p[field] ?? ''} onChange={(e) => set({ [field]: e.target.value })} />
    </label>
  ),
})

function Deadline({ p, set }: { p: MissionPatch; set: (p: MissionPatch) => void }) {
  return (
    <>
      <label>
        ต้องเสร็จเมื่อไร?
        <input placeholder="เช่น ก่อนประชุมวันพฤหัส" value={p.deadlineText ?? ''} onChange={(e) => set({ deadlineText: e.target.value })} />
      </label>
      <label>
        วันที่กำหนดส่ง
        <input type="date" value={toDateInput(p.deadlineAt)} onChange={(e) => set({ deadlineAt: fromDateInput(e.target.value) })} />
      </label>
      {p.deadlineText?.trim() && p.deadlineAt === undefined && (
        <p className="muted">ใส่วันที่ด้วยไหม? ถ้ามีวันที่ แอปจะบอกเมื่อเลยกำหนด</p>
      )}
    </>
  )
}

function PeoplePicker({ p, set, ui }: { p: MissionPatch; set: (p: MissionPatch) => void; ui: Ui }) {
  const people = ui.fixer.people()
  if (people.length === 0)
    return (
      <p className="muted">
        ยังไม่มีรายชื่อคน — เพิ่มได้ที่แท็บ “คน” แล้วกลับมาเลือกผู้สั่งงานและคนที่ช่วยได้
      </p>
    )
  const helperIds = p.helperIds ?? []
  return (
    <>
      <label>
        ผู้สั่งงาน (Assigner)
        <select value={p.assignerId ?? ''} onChange={(e) => set({ assignerId: e.target.value || undefined })}>
          <option value="">— ไม่ระบุ —</option>
          {people.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="checks">
        <legend>ใครช่วยได้ (Helpers)</legend>
        {people.map((x) => (
          <label key={x.id} className="check">
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
      </fieldset>
    </>
  )
}

const questions: Q[] = [
  text('doneDefinition', 'งานเสร็จแล้วหน้าตาเป็นอย่างไร?', 'เช่น ส่งไฟล์สรุปให้หัวหน้าทางอีเมล'),
  { key: 'deadline', render: (p, set) => <Deadline p={p} set={set} /> },
  text('constraints', 'มีอะไรที่ห้ามทำหรือข้อจำกัดไหม?'),
  { key: 'people', render: (p, set, ui) => <PeoplePicker p={p} set={set} ui={ui} /> },
  text('risk', 'แผนนี้อาจพังตรงไหน? (Risk)'),
  text('planB', 'ถ้าพัง จะทำอะไรแทน? (Plan B)'),
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

/** Asks one question per screen; every question can be skipped. */
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
    <div className="stack" key={q.key} ref={box}>
      <p className="muted">
        ข้อ {i + 1} / {questions.length}
      </p>
      {q.render(p, (patch) => setP({ ...p, ...patch }), ui)}
      <div className="actions row">
        <button onClick={() => next(false)}>ข้าม</button>
        <button className="primary" onClick={() => next(true)}>
          ถัดไป
        </button>
      </div>
    </div>
  )
}

/** Everything on one form, for later changes. */
export function EditForm({ ui, id }: { ui: Ui; id: string }) {
  const [p, setP] = useState(() => pick(ui.fixer.mission(id)!))
  const set = (patch: MissionPatch) => setP({ ...p, ...patch })
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!p.instruction?.trim()) return
        await ui.run(() => ui.fixer.edit(id, p))
        ui.go(`m/${id}`)
      }}
    >
      <h1>แก้ไขภารกิจ</h1>
      <label>
        คำสั่งงาน
        <textarea rows={3} value={p.instruction ?? ''} onChange={(e) => set({ instruction: e.target.value })} />
      </label>
      {questions.map((q) => (
        <div key={q.key} className="stack">
          {q.render(p, set, ui)}
        </div>
      ))}
      <div className="actions row">
        <button type="button" onClick={() => ui.go(`m/${id}`)}>
          ยกเลิก
        </button>
        <button className="primary">บันทึก</button>
      </div>
    </form>
  )
}
