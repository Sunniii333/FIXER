import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePorts } from './test-ports'

it('queue → waits with no clock → pick up starts at 5:00 in the First step → on time', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)

  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  await expect.element(screen.getByRole('button', { name: /เข้าคิว/ })).toBeDisabled()
  await screen.getByLabelText('คำสั่งงาน').fill('ตอบอีเมลลูกค้า')
  await screen.getByRole('button', { name: /เข้าคิว/ }).click()

  const queue = screen.getByRole('region', { name: 'รอคิว' })
  await expect.element(queue.getByText('ตอบอีเมลลูกค้า')).toBeVisible()
  ports.clock.advance(2 * 60 * 60_000)
  await expect.element(queue.getByText(/รอมา 2 ชม\./)).toBeVisible()
  expect(screen.getByLabelText('เวลาที่เหลือของห้านาที').elements()).toHaveLength(0)

  await queue.getByRole('button', { name: 'หยิบ' }).click()
  await expect.element(screen.getByText('5:00')).toBeVisible()
  await expect.element(screen.getByRole('textbox', { name: 'คำสั่งงาน' })).toHaveValue('ตอบอีเมลลูกค้า')
  await expect.element(screen.getByRole('textbox', { name: 'ก้าวแรก' })).toHaveFocus()
  // R2 / example 4: no second trip through the Queue
  expect(screen.getByRole('button', { name: /เข้าคิว/ }).elements()).toHaveLength(0)

  await screen.getByLabelText('ก้าวแรก').fill('เปิดอีเมล')
  await screen.getByRole('button', { name: 'เริ่มลงมือ' }).click()
  ports.clock.advance(3 * 60_000)
  await screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' }).click()
  await expect.element(screen.getByText('เริ่มทันเวลา')).toBeVisible()
})

it('R1: the เข้าคิว button is gone after five minutes', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  ports.clock.advance(5 * 60_000)
  await expect.element(screen.getByRole('button', { name: /เข้าคิว/ })).toBeVisible()
  ports.clock.advance(1000)
  await expect.element(screen.getByRole('button', { name: /เข้าคิว/ })).not.toBeInTheDocument()
})

it('a picked-up Draft left unfinished shows ทำต่อ on home (example 4)', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  await screen.getByLabelText('คำสั่งงาน').fill('งานด่วน')
  await screen.getByRole('button', { name: /เข้าคิว/ }).click()
  await screen.getByRole('button', { name: 'หยิบ' }).click()
  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  await expect.element(screen.getByText('ทำต่อ ›')).toBeVisible()
  expect(screen.getByRole('region', { name: 'รอคิว' }).elements()).toHaveLength(0)
})

it('R13 theme: the รอคิว heading and หยิบ reuse the app styles in light and dark', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  await screen.getByLabelText('คำสั่งงาน').fill('x')
  await screen.getByRole('button', { name: /เข้าคิว/ }).click()
  for (const theme of ['light', 'dark']) {
    document.documentElement.dataset.theme = theme
    const style = (el: Element) => getComputedStyle(el)
    const pick = style(screen.getByRole('button', { name: 'หยิบ' }).element())
    const receive = style(screen.getByRole('button', { name: 'รับภารกิจ' }).element())
    expect([pick.backgroundColor, pick.color]).toEqual([receive.backgroundColor, receive.color])
    const h2 = style(screen.getByRole('heading', { name: /รอคิว/ }).element())
    expect(h2.color).toBe(style(document.body).color)
  }
})
