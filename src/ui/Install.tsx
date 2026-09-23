import type { Ui } from './App'

export type Permission = NotificationPermission | 'unsupported'
export type InviteFlag = 'firstOpen' | 'firstReminder'

/** What the browser can do about installing and notifications. Faked in UI tests. */
export type Platform = {
  ios: boolean
  standalone: boolean
  permission(): Permission
  requestPermission(): Promise<Permission>
  /** true once the browser offered its own install prompt (Android / desktop Chrome) */
  canPrompt(): boolean
  prompt(): Promise<void>
  seen(flag: InviteFlag): boolean
  markSeen(flag: InviteFlag): void
}

export function InstallInvite({ ui, done }: { ui: Ui; done: () => void }) {
  const p = ui.ports.platform
  return (
    <div className="sheet" role="dialog" aria-label="ติดตั้งแอป">
      <h2>ติดตั้ง The Fixer ลงหน้าจอโฮม</h2>
      <p>เปิดได้เหมือนแอปทั่วไป และรับการแจ้งเตือนได้ตอนปิดแอป เช่น เมื่อครบ 5 นาที</p>
      {p.ios ? (
        <ol className="how">
          <li>
            กดปุ่ม <strong>แชร์</strong> (สี่เหลี่ยมมีลูกศรชี้ขึ้น) ใน Safari
          </li>
          <li>
            เลือก <strong>เพิ่มไปยังหน้าจอโฮม</strong> (Add to Home Screen)
          </li>
          <li>เปิด The Fixer จากไอคอนบนหน้าจอโฮม แล้วเปิดการแจ้งเตือน</li>
        </ol>
      ) : (
        !p.canPrompt() && <p className="muted">ใช้เมนูของเบราว์เซอร์ → “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอหลัก”</p>
      )}
      <div className="row">
        <button onClick={done}>ไว้ทีหลัง</button>
        {!p.ios && p.canPrompt() && (
          <button
            className="primary"
            onClick={async () => {
              await p.prompt()
              done()
            }}
          >
            ติดตั้ง
          </button>
        )}
      </div>
    </div>
  )
}

/** Says plainly when reminders can't reach the owner, with a way to fix it later. */
export function RemindersNotice({ ui, showInstall }: { ui: Ui; showInstall: () => void }) {
  const p = ui.ports.platform
  if (!ui.fixer.settings().reminderEnabled) return null
  const permission = p.permission()
  const ask = async () => {
    if ((await p.requestPermission()) === 'granted') ui.resync()
  }
  const [text, action] =
    p.ios && !p.standalone
      ? ['บน iPhone ต้องติดตั้งแอปลงหน้าจอโฮมก่อน ถึงจะได้รับการแจ้งเตือน', <button onClick={showInstall}>วิธีติดตั้ง</button>]
      : permission === 'unsupported'
        ? ['เบราว์เซอร์นี้รับการแจ้งเตือนไม่ได้', null]
        : permission === 'denied'
          ? [
              'คุณปิดสิทธิ์การแจ้งเตือนของแอปนี้ไว้ เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์ แล้วกดลองอีกครั้ง',
              <button onClick={ask}>ลองอีกครั้ง</button>,
            ]
          : permission === 'default'
            ? ['ยังไม่ได้เปิดการแจ้งเตือน', <button onClick={ask}>เปิดการแจ้งเตือน</button>]
            : [null, null]
  if (!text) return null
  return (
    <div className="notice" role="status">
      <strong>ไม่มีการแจ้งเตือน</strong> <span>{text}</span> {action}
    </div>
  )
}
