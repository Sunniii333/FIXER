import { useState } from 'react'
import type { Data, Settings as S } from '../core/fixer'
import type { Ui } from './App'
import { clockTime, dateLabel } from './MissionPage'

const WEEK = 7 * 24 * 60 * 60_000

export function Settings({ ui }: { ui: Ui }) {
  return (
    <>
      <h1>ตั้งค่า</h1>
      <Prefs ui={ui} />
      <Backup ui={ui} />
      <div className="row mid">
        <h2 className="lab">อื่นๆ</h2>
        <div className="val">
          <button className="item" onClick={() => ui.go('rules')}>
            <span className="body">
              <strong>กฎ 9 ข้อของ The Fixer</strong>
            </span>
            <span className="go" aria-hidden>
              ›
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

const themes: [S['theme'], string][] = [
  ['light', 'สว่าง'],
  ['dark', 'มืด'],
  ['system', 'ตามเครื่อง'],
]

function Prefs({ ui }: { ui: Ui }) {
  const s = ui.fixer.settings()
  const set = (patch: Partial<S>) => ui.run(() => ui.fixer.updateSettings(patch))
  const stuck = (n: number) => n >= 1 && set({ stuckAfter: Math.min(600, Math.round(n)) })
  return (
    <>
      <section className="row thick" aria-label="หน้าตา">
        <span className="lab" id="theme" style={{ paddingTop: 12 }}>
          ธีม
        </span>
        <div className="val chips" role="radiogroup" aria-labelledby="theme" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--gutter)' }}>
          {themes.map(([value, label]) => (
            <label key={value} className="chip">
              <input type="radio" name="theme" checked={s.theme === value} onChange={() => set({ theme: value })} />
              {label}
            </label>
          ))}
        </div>
      </section>
      <section className="row mid" aria-label="การแจ้งเตือน">
        <h2 className="lab">แจ้งเตือน</h2>
        <div className="val items" style={{ gap: 0 }}>
          <label className="item" style={{ fontSize: 16 }}>
            <span className="body">
              <strong>แจ้งเตือน</strong>
              <span className="muted">ครบ 5 นาที ค้างก้าว ทบทวน และวันครบกำหนด</span>
            </span>
            <input type="checkbox" role="switch" aria-label="แจ้งเตือน" className="switch" checked={s.reminderEnabled} onChange={(e) => set({ reminderEnabled: e.target.checked })} />
          </label>
          {s.reminderEnabled && (
            <>
              <div className="item">
                <div className="body">
                  <label htmlFor="stuck-after" style={{ fontSize: 16 }}>
                    เตือนเมื่อค้างก้าวเดียวเกิน (นาที)
                  </label>
                  <span className="muted">ถามคนช่วยก่อนจะติดจริง</span>
                </div>
                <div className="stepper">
                  <button type="button" aria-label="ลด 5 นาที" onClick={() => stuck(Math.max(5, s.stuckAfter - 5))}>
                    −
                  </button>
                  <input
                    id="stuck-after"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={600}
                    value={s.stuckAfter}
                    onChange={(e) => stuck(e.target.valueAsNumber)}
                  />
                  <button type="button" aria-label="เพิ่ม 5 นาที" onClick={() => stuck(s.stuckAfter + 5)}>
                    +
                  </button>
                </div>
              </div>
              <div className="item">
                <label className="body" htmlFor="review-time" style={{ fontSize: 16 }}>
                  เตือนทบทวนประจำวัน
                </label>
                <input id="review-time" type="time" style={{ width: 'auto', fontWeight: 700 }} value={s.reviewTime} onChange={(e) => e.target.value && set({ reviewTime: e.target.value })} />
              </div>
              <div className="item">
                <label className="body" htmlFor="deadline-time" style={{ fontSize: 16 }}>
                  เตือนวันครบกำหนด
                </label>
                <input id="deadline-time" type="time" style={{ width: 'auto', fontWeight: 700 }} value={s.deadlineTime} onChange={(e) => e.target.value && set({ deadlineTime: e.target.value })} />
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}

function Backup({ ui }: { ui: Ui }) {
  const [pending, setPending] = useState<{ data: Data; compare: Record<'file' | 'device', { missions: number; people: number }> }>()
  const [message, setMessage] = useState<string>()
  const last = ui.fixer.settings().lastExportAt
  const stale = last === undefined || ui.ports.clock.now() - last > WEEK
  return (
    <section className="row mid" aria-label="สำรองข้อมูล">
      <h2 className="lab">ข้อมูล</h2>
      <div className="val">
        {stale ? (
          <p style={{ display: 'flex', gap: 10 }}>
            <span aria-hidden style={{ width: 8, flex: 'none', background: 'var(--accent)' }} />
            <span>
              <strong>{last ? `สำรองล่าสุด ${dateLabel(last)}` : 'ยังไม่เคยสำรอง'}</strong> ข้อมูลอยู่ในเครื่องนี้เท่านั้น
              ถ้าเปลี่ยนเครื่องหรือล้างเบราว์เซอร์ ภารกิจทั้งหมดจะหาย
            </span>
          </p>
        ) : (
          <p className="muted">{`สำรองล่าสุด ${dateLabel(last!)} ${clockTime(last!)}`}</p>
        )}
        <div className="grid" style={{ rowGap: 8 }}>
          <button
            className="primary c12"
            style={{ fontSize: 16, minHeight: 48 }}
            onClick={async () => {
              let file = ''
              await ui.run(async () => void (file = await ui.fixer.exportData()))
              const a = document.createElement('a')
              a.href = URL.createObjectURL(new Blob([file], { type: 'application/json' }))
              a.download = `the-fixer-${new Date(ui.ports.clock.now()).toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(a.href)
            }}
          >
            สำรองตอนนี้
          </button>
          <label className="button c34" style={{ gridColumn: '3 / 5', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: '2px solid var(--ink)', minHeight: 48, cursor: 'pointer' }}>
            กู้จากไฟล์
            <input
              type="file"
              accept="application/json,.json"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                const parsed = ui.fixer.parseImport(await file.text())
                setMessage(parsed.ok ? undefined : parsed.error)
                setPending(parsed.ok ? parsed : undefined)
              }}
            />
          </label>
        </div>
        <p className="muted">ไม่มีการติดตามใดๆ กู้จากไฟล์จะแทนที่ข้อมูลทั้งหมดในเครื่องนี้</p>
        {message && (
          <p className="hot" role="alert">
            {message}
          </p>
        )}
        {pending && (
          <div className="confirm" role="dialog" aria-label="ยืนยันการนำเข้า">
            <table>
              <thead>
                <tr>
                  <th />
                  <th>ในไฟล์</th>
                  <th>ในเครื่องนี้</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>ภารกิจ</th>
                  <td>{pending.compare.file.missions}</td>
                  <td>{pending.compare.device.missions}</td>
                </tr>
                <tr>
                  <th>คน</th>
                  <td>{pending.compare.file.people}</td>
                  <td>{pending.compare.device.people}</td>
                </tr>
              </tbody>
            </table>
            <p>ข้อมูลในเครื่องนี้จะถูกแทนที่ทั้งหมดด้วยข้อมูลในไฟล์</p>
            <div className="grid">
              <button className="c12" onClick={() => setPending(undefined)}>
                ยกเลิก
              </button>
              <button
                className="primary c34"
                style={{ gridColumn: '3 / 5' }}
                onClick={async () => {
                  await ui.run(() => ui.fixer.replaceAll(pending.data))
                  setPending(undefined)
                  setMessage(undefined)
                }}
              >
                แทนที่ข้อมูล
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ponytail: placeholder wording — the owner will supply the final nine rules
const rules = [
  'รับงานแล้ว ลงมือก้าวแรกภายใน 5 นาที',
  'ก้าวแรกต้องเป็นการกระทำ ไม่ใช่ความคิด',
  'รู้ว่า "เสร็จ" หน้าตาเป็นอย่างไรก่อนลงแรง',
  'ถามคนที่ช่วยได้ก่อนจะติดจริง',
  'คิดไว้ก่อนว่าแผนจะพังตรงไหน',
  'แผนพังได้ เปลี่ยนทาง ไม่เปลี่ยนเป้า',
  'ตอบผู้สั่งงานได้ทุกเมื่อว่าถึงไหนแล้ว',
  'ปิดงานพร้อมบอกคนที่สั่ง',
  'ทบทวนทุกวัน ดูหลักฐาน ไม่ใช่ความรู้สึก',
]

export function Rules() {
  return (
    <>
      <h1>กฎ 9 ข้อ</h1>
      <ol className="rules">
        {rules.map((r) => (
          <li key={r}>
            <span>{r}</span>
          </li>
        ))}
      </ol>
    </>
  )
}
