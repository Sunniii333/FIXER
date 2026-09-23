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

it('แผนพัง: shows Plan B, asks for the new Step and a reason, and the Mission shows the Replan', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await quickCapture(screen, 'ทำรายงาน', 'ขอไฟล์จากบัญชี')
  await screen.getByRole('button', { name: 'แก้ไข' }).click()
  await screen.getByLabelText('ถ้าพัง จะทำอะไรแทน? (Plan B)').fill('ใช้ตัวเลขเดือนก่อน')
  await screen.getByRole('button', { name: 'บันทึก' }).click()

  await screen.getByRole('button', { name: 'แผนพัง' }).click()
  await expect.element(screen.getByText('ใช้ตัวเลขเดือนก่อน')).toBeVisible()
  await screen.getByLabelText('รอคนอื่นอยู่').click()
  await screen.getByLabelText('ก้าวใหม่คืออะไร?').fill('ประมาณจากเดือนก่อน')
  await screen.getByRole('button', { name: 'เปลี่ยนแผน' }).click()

  await expect.element(screen.getByText('แผนพัง 1 ครั้ง: รอคนอื่นอยู่')).toBeVisible()
  await expect.element(screen.getByText('ประมาณจากเดือนก่อน')).toBeVisible()
  await expect.element(screen.getByText('แผนพัง — เลิกทางนี้')).toBeVisible()
  await expect.element(screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' })).not.toBeInTheDocument()
})
