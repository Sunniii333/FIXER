import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePorts } from './test-ports'
import { quickCapture } from './helpers'

it('walkthrough: one question per screen, each skippable, flags update', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await quickCapture(screen)
  await expect.element(screen.getByText('เป้ายังไม่ชัด')).toBeVisible()

  await screen.getByRole('button', { name: 'เติมรายละเอียด' }).click()
  await screen.getByLabelText('งานเสร็จแล้วหน้าตาเป็นอย่างไร?').fill('ส่งไฟล์ให้หัวหน้าทางอีเมล')
  await screen.getByRole('button', { name: 'ถัดไป' }).click()
  await screen.getByLabelText('ต้องเสร็จเมื่อไร?').fill('ก่อนประชุมวันพฤหัส')
  await expect.element(screen.getByText('ใส่วันที่ด้วยไหม?', { exact: false })).toBeVisible()
  await screen.getByRole('button', { name: 'ถัดไป' }).click()
  while (await screen.getByRole('button', { name: 'ข้าม' }).query()) {
    await screen.getByRole('button', { name: 'ข้าม' }).click()
  }

  await expect.element(screen.getByText('ส่งไฟล์ให้หัวหน้าทางอีเมล')).toBeVisible()
  await expect.element(screen.getByText('ไม่มีวันกำหนด')).toBeVisible()
  await expect.element(screen.getByText('เป้ายังไม่ชัด')).not.toBeInTheDocument()
})
