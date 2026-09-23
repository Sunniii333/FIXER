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

  screen.unmount()
  const again = await render(<App ports={ports} />)
  await expect.element(again.getByText('ทำรายงานยอดขาย Q3')).toBeVisible()
})

it('keeps the receive button in the lower half of a phone screen', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  const button = screen.getByRole('button', { name: 'รับภารกิจ' })
  await expect.element(button).toBeVisible()
  const box = button.element().getBoundingClientRect()
  expect(box.top).toBeGreaterThan(844 / 2)
})
