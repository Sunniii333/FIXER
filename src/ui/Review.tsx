import { useState } from 'react'
import { monthKey, replanReasonLabels, type Mission, type ReplanReason } from '../core/fixer'
import { MissionRow, type Ui } from './App'

const DAY = 24 * 60 * 60_000
const ranges = [
  [1, '24 ชม.'],
  [7, '7 วัน'],
  [30, '30 วัน'],
  [0, 'ทั้งหมด'],
] as const

const monthName = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'short' })
}
const pct = (r: { onTime: number; total: number }) => Math.round((100 * r.onTime) / r.total)

export function Review({ ui }: { ui: Ui }) {
  const [days, setDays] = useState<number>(7)
  const now = ui.ports.clock.now()
  const r = ui.fixer.review({ from: days ? now - days * DAY : 0, to: now })
  const rates = ui.fixer.rateByMonth()
  const thisMonth = rates[monthKey(now)]
  const lastFour = Object.keys(rates).sort().slice(-4)
  const missed = Object.entries(r.missedByMonth).sort().reverse()
  const reasons = (Object.entries(r.replansByReason) as [ReplanReason, number][]).sort((a, b) => b[1] - a[1])
  const most = reasons[0]?.[1] ?? 1

  const sections: [string, Mission[], ((m: Mission) => string)?][] = [
    ['เลยกำหนด', r.overdue],
    ['ร่างค้าง', r.staleDrafts],
    ['คิวค้าง', r.staleQueue],
    ['เป้ายังไม่ชัด', r.goalUnclear],
    ['แผนพังบ่อย', r.oftenReplanned, (m) => `พัง ${m.replans.length} ครั้ง`],
    ['ยังเปิดอยู่', r.open],
  ]
  const empty = sections.filter(([, ms]) => ms.length === 0).map(([t]) => t)

  return (
    <>
      <h1>ทบทวน</h1>
      <div className="chips cols" role="group" aria-label="ช่วงเวลา" style={{ marginBottom: 16 }}>
        {ranges.map(([d, label]) => (
          <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>
            {label}
          </button>
        ))}
      </div>

      <section className="row thick" aria-label="เริ่มทันเวลา">
        <div className="full" style={{ gap: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>เริ่มทันเวลา เดือนนี้</span>
          {thisMonth ? (
            <>
              <p className="clock">{`${pct(thisMonth)}%`}</p>
              <p className="muted">{`${thisMonth.onTime} จาก ${thisMonth.total} ภารกิจ`}</p>
            </>
          ) : (
            <p className="muted">ยังไม่มีข้อมูลเดือนนี้ จะนับเมื่อภารกิจแรกผ่าน 5 นาทีไปแล้ว</p>
          )}
        </div>
      </section>
      {lastFour.length > 0 && (
        <div className="months" aria-label="เริ่มทันเวลาต่อเดือน">
          {lastFour.map((k) => (
            <div key={k} className={k === monthKey(now) ? 'now' : undefined}>
              <div className="col" aria-hidden>
                <span style={{ height: `${Math.max(4, pct(rates[k]))}%` }} />
              </div>
              <span>{`${monthName(k)} ${pct(rates[k])}%`}</span>
            </div>
          ))}
        </div>
      )}

      {sections.map(
        ([title, ms, note]) =>
          ms.length > 0 && (
            <section key={title} className="row mid" aria-label={title}>
              <div className="lab">
                <p className="count">{ms.length}</p>
                <h2>{title}</h2>
              </div>
              <div className="val items" style={{ gap: 0 }}>
                {ms.map((m) => (
                  <div key={m.id}>
                    <MissionRow ui={ui} m={m} />
                    {note && <p className="muted">{note(m)}</p>}
                  </div>
                ))}
              </div>
            </section>
          ),
      )}
      {empty.length > 0 && <p className="muted" style={{ padding: '8px 0' }}>{`ไม่มี: ${empty.join(', ')}`}</p>}

      <section className="row mid" aria-label="แผนพังเพราะอะไร">
        <h2 className="lab">แผนพังเพราะ</h2>
        <div className="val">
          {reasons.length === 0 ? (
            <p className="muted">ยังไม่มี</p>
          ) : (
            reasons.map(([reason, n]) => (
              <div key={reason} className="stack" style={{ gap: 4 }}>
                <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}>
                  <span>{replanReasonLabels[reason]}</span>
                  <strong>{`${n} ครั้ง`}</strong>
                </p>
                <div className="bar ink" aria-hidden>
                  <span style={{ width: `${(100 * n) / most}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="row" aria-label="ตัวเลข">
        <h2 className="lab">ตัวเลข</h2>
        <div className="val" style={{ gap: 4 }}>
          <p>{`เปลี่ยนเป้า ${r.doneDefinitionChanged} ภารกิจ`}</p>
          <p>{`กำหนดส่งไม่มีวันที่ ไม่ได้นับเลยกำหนด ${r.textOnlyExcluded} ภารกิจ`}</p>
          {missed.map(([month, n]) => (
            <p key={month}>{`เลยกำหนดเดือน ${monthName(month)} ${month.slice(0, 4)}: ${n} ภารกิจ`}</p>
          ))}
        </div>
      </section>
    </>
  )
}
