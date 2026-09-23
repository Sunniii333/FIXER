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

it('close, reopen with a new Step, and drop with a reason', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await quickCapture(screen, 'งานหนึ่ง')
  await screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' }).click()
  await screen.getByLabelText('ก้าวต่อไปคืออะไร?').fill('ส่งไฟล์')
  await screen.getByRole('button', { name: 'ตั้งก้าวนี้' }).click()

  await screen.getByRole('button', { name: 'ปิดงาน' }).click()
  await expect.element(screen.getByText('เสร็จแล้ว', { exact: false })).toBeVisible()
  await screen.getByRole('button', { name: 'เปิดงานอีกครั้ง' }).click()
  await screen.getByLabelText('ก้าวต่อไปคืออะไร?').fill('แก้ตามคอมเมนต์')
  await screen.getByRole('button', { name: 'เปิดงาน' }).click()
  await expect.element(screen.getByRole('button', { name: 'เสร็จก้าวนี้' })).toBeVisible()
  await expect.element(screen.getByText('เริ่มทันเวลา')).toBeVisible()

  await screen.getByRole('button', { name: 'ยกเลิกภารกิจ' }).click()
  await screen.getByLabelText('ทำไมถึงยกเลิก?').fill('ลูกค้ายกเลิกโปรเจกต์')
  await screen.getByRole('button', { name: 'ยืนยันยกเลิก' }).click()
  await expect.element(screen.getByText('ยกเลิกแล้ว: ลูกค้ายกเลิกโปรเจกต์')).toBeVisible()

  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  await screen.getByText('ยกเลิกแล้ว (1)').click()
  const history = screen.getByRole('region', { name: 'ยกเลิกแล้ว' })
  await expect.element(history.getByText('งานหนึ่ง')).toBeVisible()
})

it('delete can be undone for a few seconds', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await quickCapture(screen, 'สร้างผิด')
  await screen.getByRole('button', { name: 'ลบ (สร้างผิด)' }).click()
  await expect.element(screen.getByText('สร้างผิด')).not.toBeInTheDocument()
  await screen.getByRole('button', { name: 'เลิกทำ' }).click()
  await expect.element(screen.getByText('สร้างผิด')).toBeVisible()
})
