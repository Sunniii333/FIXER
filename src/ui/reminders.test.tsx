import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePorts, T0 } from './test-ports'
import { quickCapture } from './helpers'

const MIN = 60_000
const fiveMinute = (ports: ReturnType<typeof fakePorts>) => ports.synced.at(-1)?.filter((e) => e.kind === 'fiveMinute')

it('re-syncs the five-minute alert on create and First step, with only generic fields', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await quickCapture(screen, 'ความลับบริษัท')
  await expect.poll(() => fiveMinute(ports)).toEqual([{ dueAt: T0 + 5 * MIN, kind: 'fiveMinute' }])
  expect(JSON.stringify(ports.synced)).not.toContain('ความลับ')

  await screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' }).click()
  await expect.poll(() => fiveMinute(ports)).toEqual([])
})

it('re-syncs when a Mission without a First step is deleted', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await quickCapture(screen)
  await expect.poll(() => fiveMinute(ports)).toHaveLength(1)
  await screen.getByText('จัดการภารกิจ').click()
  await screen.getByRole('button', { name: 'ลบ (สร้างผิด)' }).click()
  await expect.poll(() => fiveMinute(ports)).toEqual([])
})

const last = (ports: ReturnType<typeof fakePorts>) => ports.synced.at(-1) ?? []

it('re-syncs on a settings change, and turning reminders off clears the schedule', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await quickCapture(screen)
  await expect.poll(() => last(ports).find((e) => e.kind === 'review')?.dueAt).toBe(new Date(2026, 8, 1, 20, 0).getTime())

  await screen.getByRole('button', { name: 'ตั้งค่า' }).click()
  await screen.getByLabelText('เตือนทบทวนประจำวัน').fill('21:15')
  await expect.poll(() => last(ports).find((e) => e.kind === 'review')?.dueAt).toBe(new Date(2026, 8, 1, 21, 15).getTime())
  await screen.getByLabelText('เตือนเมื่อค้างก้าวเดียวเกิน (นาที)').fill('60')
  await expect.poll(() => last(ports).find((e) => e.kind === 'stuck')?.dueAt).toBe(T0 + 60 * MIN)

  await screen.getByRole('switch', { name: 'แจ้งเตือน' }).click()
  await expect.poll(() => last(ports)).toEqual([])
})

it('opening a stuck notification shows the stuck Mission and offers the People list when it has no Helpers', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await quickCapture(screen, 'งานที่ติด')
  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  ports.clock.advance(31 * MIN)
  location.hash = '#/stuck'
  await expect.element(screen.getByRole('heading', { name: 'งานที่ติด' })).toBeVisible()
  await expect.element(screen.getByText('ก้าวนี้นานเกิน 30 นาทีแล้ว', { exact: false })).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'เลือกจากรายชื่อคน' })).toBeVisible()
})
