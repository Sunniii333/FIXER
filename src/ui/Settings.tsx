import { useState } from 'react'
import type { Data } from '../core/fixer'
import type { Ui } from './App'
import { clockTime, dateLabel } from './MissionPage'

export function Settings({ ui }: { ui: Ui }) {
  return (
    <div className="stack">
      <h1>ตั้งค่า</h1>
      <Backup ui={ui} />
    </div>
  )
}

function Backup({ ui }: { ui: Ui }) {
  const [pending, setPending] = useState<{ data: Data; compare: Record<'file' | 'device', { missions: number; people: number }> }>()
  const [message, setMessage] = useState<string>()
  const last = ui.fixer.settings().lastExportAt
  return (
    <section className="stack" aria-label="สำรองข้อมูล">
      <h2>สำรองข้อมูล</h2>
      <p className="muted">
        ข้อมูลทั้งหมดอยู่ในเครื่องนี้เท่านั้น สำรองล่าสุด: {last ? `${dateLabel(last)} ${clockTime(last)}` : 'ยังไม่เคย'}
      </p>
      <button
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
        ส่งออกไฟล์สำรอง
      </button>
      <label>
        นำเข้าไฟล์สำรอง (แทนที่ข้อมูลทั้งหมด)
        <input
          type="file"
          accept="application/json,.json"
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
      {message && (
        <p className="tag bad" role="alert">
          {message}
        </p>
      )}
      {pending && (
        <div className="stack confirm" role="dialog" aria-label="ยืนยันการนำเข้า">
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
          <div className="row">
            <button onClick={() => setPending(undefined)}>ยกเลิก</button>
            <button
              className="danger"
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
    </section>
  )
}
