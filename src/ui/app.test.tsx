import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePorts } from './test-ports'

it('quick capture: receive → Instruction + First step → shows on home, survives reload', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)

  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  await screen.getByLabelText('คำสั่งงาน').fill('ทำรายงานยอดขาย Q3')
  await screen.getByLabelText('ก้าวแรก').fill('เปิดไฟล์ยอดขาย')
  await screen.getByRole('button', { name: 'เริ่มลงมือ' }).click()
  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()

  await expect.element(screen.getByText('ทำรายงานยอดขาย Q3')).toBeVisible()

  await screen.unmount()
  const again = await render(<App ports={ports} />)
  await expect.element(again.getByText('ทำรายงานยอดขาย Q3')).toBeVisible()
})

async function quickCapture(screen: Awaited<ReturnType<typeof render>>, instruction = 'ทำรายงาน', first = 'เปิดไฟล์') {
  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  await screen.getByLabelText('คำสั่งงาน').fill(instruction)
  await screen.getByLabelText('ก้าวแรก').fill(first)
  await screen.getByRole('button', { name: 'เริ่มลงมือ' }).click()
}

it('first-step tap: countdown from receipt, tap records the start, then the next Step is named', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await quickCapture(screen)
  await expect.element(screen.getByText('5:00')).toBeVisible()
  ports.clock.advance(2 * 60_000 + 30_000)
  await expect.element(screen.getByText('2:30')).toBeVisible()

  await screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' }).click()
  await expect.element(screen.getByText('เริ่มทันเวลา')).toBeVisible()
  await screen.getByLabelText('ก้าวต่อไปคืออะไร?').fill('โทรหาฝ่ายบัญชี')
  await screen.getByRole('button', { name: 'ตั้งก้าวนี้' }).click()
  await expect.element(screen.getByRole('button', { name: 'เสร็จก้าวนี้' })).toBeVisible()
  await expect.element(screen.getByText('โทรหาฝ่ายบัญชี')).toBeVisible()
})

it('keeps the receive button in the lower half of a phone screen', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  const button = screen.getByRole('button', { name: 'รับภารกิจ' })
  await expect.element(button).toBeVisible()
  const box = button.element().getBoundingClientRect()
  expect(box.top).toBeGreaterThan(844 / 2)
})
