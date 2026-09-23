import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePorts } from './test-ports'
import { quickCapture } from './helpers'

const DAY = 24 * 60 * 60_000

it('Review: sections follow the date range; an old Draft shows as ร่างค้าง', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  await screen.getByLabelText('คำสั่งงาน').fill('ร่างที่ลืมไว้')
  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  ports.clock.advance(3 * DAY)
  await quickCapture(screen, 'งานใหม่')

  await screen.getByRole('button', { name: 'ทบทวน' }).click()
  const stale = screen.getByRole('region', { name: 'ร่างค้าง' })
  await expect.element(stale.getByText('ร่างที่ลืมไว้')).toBeVisible()
  await expect.element(screen.getByRole('region', { name: 'เป้ายังไม่ชัด' }).getByText('งานใหม่')).toBeVisible()

  await screen.getByRole('button', { name: '24 ชม.' }).click()
  await expect.element(stale.getByText('ร่างที่ลืมไว้')).not.toBeInTheDocument()
  await expect.element(screen.getByRole('region', { name: 'ยังเปิดอยู่' }).getByText('งานใหม่')).toBeVisible()
})
