import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePlatform, fakePorts, T0 } from './test-ports'
import { quickCapture } from './helpers'

it('invites to install on first open with the browser prompt, can be skipped, and asks again before the first reminder', async () => {
  const platform = fakePlatform({ standalone: false, canPrompt: true })
  const screen = await render(<App ports={fakePorts(T0, platform)} />)
  const invite = screen.getByRole('dialog', { name: 'ติดตั้งแอป' })
  await invite.getByRole('button', { name: 'ติดตั้ง' }).click()
  expect(platform.calls).toContain('prompt')
  await expect.element(invite).not.toBeInTheDocument()

  await quickCapture(screen)
  await expect.element(invite).toBeVisible()
  await invite.getByRole('button', { name: 'ไว้ทีหลัง' }).click()
  await expect.element(invite).not.toBeInTheDocument()
  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  await quickCapture(screen, 'งานที่สอง')
  await expect.element(screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' })).toBeVisible()
  await expect.element(invite).not.toBeInTheDocument()
})

it('shows iPhone manual steps instead of a prompt, and a no-reminders notice until installed', async () => {
  const platform = fakePlatform({ ios: true, standalone: false, permission: 'default' })
  const screen = await render(<App ports={fakePorts(T0, platform)} />)
  const invite = screen.getByRole('dialog', { name: 'ติดตั้งแอป' })
  await expect.element(invite.getByText('เพิ่มไปยังหน้าจอโฮม', { exact: false })).toBeVisible()
  await expect.element(invite.getByRole('button', { name: 'ติดตั้ง' })).not.toBeInTheDocument()
  await invite.getByRole('button', { name: 'ไว้ทีหลัง' }).click()

  const notice = screen.getByText('ไม่มีการแจ้งเตือน')
  await expect.element(notice).toBeVisible()
  await screen.getByRole('button', { name: 'วิธีติดตั้ง' }).click()
  await expect.element(invite).toBeVisible()
})

it('says plainly when permission is refused, offers a retry, and the rest of the app keeps working', async () => {
  const platform = fakePlatform({ permission: 'denied' })
  const screen = await render(<App ports={fakePorts(T0, platform)} />)
  await expect.element(screen.getByText('คุณปิดสิทธิ์การแจ้งเตือน', { exact: false })).toBeVisible()
  await screen.getByRole('button', { name: 'ลองอีกครั้ง' }).click()
  expect(platform.calls).toContain('requestPermission')
  await quickCapture(screen, 'ยังใช้งานได้')
  await expect.element(screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' })).toBeVisible()
})

it('turning notifications on later clears the notice and re-syncs the schedule', async () => {
  const ports = fakePorts(T0, fakePlatform({ permission: 'default' }))
  const screen = await render(<App ports={ports} />)
  await expect.poll(() => ports.synced.length).toBe(1)
  await screen.getByRole('button', { name: 'เปิดการแจ้งเตือน' }).click()
  await expect.element(screen.getByText('ไม่มีการแจ้งเตือน')).not.toBeInTheDocument()
  await expect.poll(() => ports.synced.length).toBe(2)
})
