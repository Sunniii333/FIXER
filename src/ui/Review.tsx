import { useState } from 'react'
import { replanReasonLabels, type Mission, type ReplanReason } from '../core/fixer'
import { missionPath, type Ui } from './App'

const DAY = 24 * 60 * 60_000
const ranges = [
  [1, '24 ชม.'],
  [7, '7 วัน'],
  [30, '30 วัน'],
  [0, 'ทั้งหมด'],
] as const

export function Review({ ui }: { ui: Ui }) {
  const [days, setDays] = useState<number>(7)
  const now = ui.ports.clock.now()
  const r = ui.fixer.review({ from: days ? now - days * DAY : 0, to: now })
  const rates = Object.entries(ui.fixer.rateByMonth()).sort().reverse()
  const missed = Object.entries(r.missedByMonth).sort().reverse()
  return (
    <div className="stack">
      <h1>ทบทวน</h1>
      <div className="segmented" role="group" aria-label="ช่วงเวลา">
        {ranges.map(([d, label]) => (
          <button key={d} aria-pressed={days === d} onClick={() => setDays(d)}>
            {label}
          </button>
        ))}
      </div>

      <Section title="ยังเปิดอยู่" ms={r.open} ui={ui} />
      <Section title="เลยกำหนด" ms={r.overdue} ui={ui} />
      <Section title="ร่างค้าง" ms={r.staleDrafts} ui={ui} />
      <Section title="เป้ายังไม่ชัด" ms={r.goalUnclear} ui={ui} />
      <Section title="แผนพังบ่อย" ms={r.oftenReplanned} ui={ui} note={(m) => `${m.replans.length} ครั้ง`} />

      <section aria-label="แผนพังเพราะอะไร">
        <h2>แผนพังเพราะอะไร</h2>
        {Object.keys(r.replansByReason).length === 0 ? (
          <p className="muted">ยังไม่มี</p>
        ) : (
          <ul>
            {(Object.entries(r.replansByReason) as [ReplanReason, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([reason, n]) => (
                <li key={reason}>{`${replanReasonLabels[reason]}: ${n} ครั้ง`}</li>
              ))}
          </ul>
        )}
      </section>

      <section aria-label="ตัวเลข">
        <h2>ตัวเลข</h2>
        <ul>
          <li>{`เปลี่ยนเป้า (Done definition) ${r.doneDefinitionChanged} ภารกิจ`}</li>
          <li>{`กำหนดส่งไม่มีวันที่ ไม่ได้นับเลยกำหนด ${r.textOnlyExcluded} ภารกิจ`}</li>
        </ul>
        <h2>เลยกำหนดต่อเดือน (ตามเดือนที่รับงาน)</h2>
        {missed.length === 0 ? (
          <p className="muted">ไม่มี</p>
        ) : (
          <ul>
            {missed.map(([month, n]) => (
              <li key={month}>{`${month}: ${n} ภารกิจ`}</li>
            ))}
          </ul>
        )}
        <h2>เริ่มทันเวลาต่อเดือน</h2>
        {rates.length === 0 ? (
          <p className="muted">ยังไม่มีข้อมูล</p>
        ) : (
          <ul>
            {rates.map(([month, { onTime, total }]) => (
              <li key={month}>{`${month}: ${onTime}/${total} (${Math.round((100 * onTime) / total)}%)`}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Section({ title, ms, ui, note }: { title: string; ms: Mission[]; ui: Ui; note?: (m: Mission) => string }) {
  return (
    <section aria-label={title}>
      <h2>
        {title} ({ms.length})
      </h2>
      <ul className="list">
        {ms.map((m) => (
          <li key={m.id}>
            <a className="card" href={`#/${missionPath(m)}`}>
              <span>{m.instruction || '(ยังไม่มีคำสั่งงาน)'}</span>
              {note && <small className="muted">{note(m)}</small>}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
