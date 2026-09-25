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
    <>
      <h1 style={{ marginBottom: 4 }}>คนที่ช่วยได้</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        ใครช่วยเรื่องข้อมูล อนุมัติ หรือทักษะได้บ้าง ติดเมื่อไรเปิดดูที่นี่
      </p>
      <div style={{ borderTop: '6px solid var(--ink)' }}>
        {people.length === 0 && <p className="empty">ยังไม่มีรายชื่อ เพิ่มไว้ก่อนจะติดขัด</p>}
        {people.map((p) => (
          <button key={p.id} className="item grid" aria-label={`แก้ ${p.name}`} onClick={() => setEditing(p)}>
            <strong className="c1" style={{ overflowWrap: 'anywhere' }}>
              {p.name}
            </strong>
            <span className="c24" style={{ display: 'flex', flexDirection: 'column' }}>
              {p.note && <span>{p.note}</span>}
              <span className="hot" style={{ fontSize: 14 }}>
                {helpText(p) ? `ช่วยเรื่อง${helpText(p)}` : 'ยังไม่ได้ระบุว่าช่วยเรื่องอะไร'}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', canHelpWith: [] })}>
          เพิ่มคน
        </button>
      </div>
    </>
  )
}

function PersonForm({ ui, person, done }: { ui: Ui; person: Person; done: () => void }) {
  const [p, setP] = useState(person)
  const [confirming, setConfirming] = useState(false)
  const exists = !!ui.fixer.people().find((x) => x.id === person.id)
  const toggle = (k: HelpKind) =>
    setP({ ...p, canHelpWith: p.canHelpWith.includes(k) ? p.canHelpWith.filter((x) => x !== k) : [...p.canHelpWith, k] })
  return (
    <form
      className="stack"
      style={{ flex: 1, gap: 0 }}
      onSubmit={async (e) => {
        e.preventDefault()
        if (!p.name.trim()) return
        await ui.run(() => ui.fixer.savePerson({ ...p, name: p.name.trim(), note: p.note?.trim() || undefined }))
        done()
      }}
    >
      <h1>{exists ? `แก้ ${person.name}` : 'เพิ่มคน'}</h1>
      <div className="row thick">
        <label className="lab" htmlFor="person-name">
          ชื่อ
        </label>
        <div className="val">
          <input id="person-name" autoFocus value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </div>
      </div>
      <div className="row">
        <span className="lab" id="can-help">
          ช่วยเรื่อง
        </span>
        <div className="val chips" role="group" aria-labelledby="can-help">
          {(Object.keys(helpLabels) as HelpKind[]).map((k) => (
            <label key={k} className="chip">
              <input type="checkbox" checked={p.canHelpWith.includes(k)} onChange={() => toggle(k)} />
              {helpLabels[k]}
            </label>
          ))}
        </div>
      </div>
      <div className="row">
        <label className="lab" htmlFor="person-note">
          หมายเหตุ
        </label>
        <div className="val">
          <input id="person-note" placeholder="เช่น ฝ่ายบัญชี ดูแลไฟล์ยอดขาย" value={p.note ?? ''} onChange={(e) => setP({ ...p, note: e.target.value })} />
        </div>
      </div>
      {exists && (
        <div className="row">
          <span className="lab">ลบ</span>
          <div className="val">
            {confirming ? (
              <div className="chips">
                <button
                  type="button"
                  className="small"
                  onClick={async () => {
                    await ui.run(() => ui.fixer.removePerson(person.id))
                    done()
                  }}
                >
                  ยืนยันลบ {person.name}
                </button>
                <button type="button" className="link" onClick={() => setConfirming(false)}>
                  ไม่ลบ
                </button>
              </div>
            ) : (
              <button type="button" className="link" onClick={() => setConfirming(true)}>
                ลบ {person.name} ออกจากรายชื่อ
              </button>
            )}
          </div>
        </div>
      )}
      <div className="actions">
        <button type="button" className="c1" onClick={done}>
          ยกเลิก
        </button>
        <button className="primary c24">บันทึก</button>
      </div>
    </form>
  )
}
