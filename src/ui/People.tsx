import { useState } from 'react'
import type { HelpKind, Person } from '../core/fixer'
import type { Ui } from './App'

export const helpLabels: Record<HelpKind, string> = { info: 'ข้อมูล', permission: 'อนุมัติ/สิทธิ์', skill: 'ทักษะ' }

export const helpText = (p: Person) => p.canHelpWith.map((k) => helpLabels[k]).join(', ')

export function People({ ui }: { ui: Ui }) {
  const [editing, setEditing] = useState<Person>()
  if (editing) return <PersonForm ui={ui} person={editing} done={() => setEditing(undefined)} />
  const people = ui.fixer.people()
  return (
    <div className="stack">
      <h1>คนที่ช่วยได้</h1>
      {people.length === 0 && <p className="muted">ใครช่วยเรื่องข้อมูล อนุมัติ หรือทักษะได้บ้าง เพิ่มไว้ก่อนติดขัด</p>}
      <ul className="list">
        {people.map((p) => (
          <li key={p.id} className="card">
            <strong>{p.name}</strong>
            <span className="muted">{helpText(p) || '—'}</span>
            {p.note && <small>{p.note}</small>}
            <div className="row">
              <button aria-label={`แก้ ${p.name}`} onClick={() => setEditing(p)}>
                แก้
              </button>
              <button aria-label={`ลบ ${p.name}`} onClick={() => ui.run(() => ui.fixer.removePerson(p.id))}>
                ลบ
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="actions">
        <button className="primary big" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', canHelpWith: [] })}>
          เพิ่มคน
        </button>
      </div>
    </div>
  )
}

function PersonForm({ ui, person, done }: { ui: Ui; person: Person; done: () => void }) {
  const [p, setP] = useState(person)
  const toggle = (k: HelpKind) =>
    setP({ ...p, canHelpWith: p.canHelpWith.includes(k) ? p.canHelpWith.filter((x) => x !== k) : [...p.canHelpWith, k] })
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!p.name.trim()) return
        await ui.run(() => ui.fixer.savePerson({ ...p, name: p.name.trim(), note: p.note?.trim() || undefined }))
        done()
      }}
    >
      <h1>{person.name ? `แก้ ${person.name}` : 'เพิ่มคน'}</h1>
      <label>
        ชื่อ
        <input autoFocus value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
      </label>
      <fieldset className="checks">
        <legend>ช่วยเรื่องอะไรได้</legend>
        {(Object.keys(helpLabels) as HelpKind[]).map((k) => (
          <label key={k} className="check">
            <input type="checkbox" checked={p.canHelpWith.includes(k)} onChange={() => toggle(k)} />
            {helpLabels[k]}
          </label>
        ))}
      </fieldset>
      <label>
        หมายเหตุ
        <input value={p.note ?? ''} onChange={(e) => setP({ ...p, note: e.target.value })} />
      </label>
      <div className="actions row">
        <button type="button" onClick={done}>
          ยกเลิก
        </button>
        <button className="primary">บันทึก</button>
      </div>
    </form>
  )
}
