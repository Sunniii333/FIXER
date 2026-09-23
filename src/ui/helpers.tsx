import { render } from 'vitest-browser-react'

export type Screen = Awaited<ReturnType<typeof render>>

export async function quickCapture(screen: Screen, instruction = 'ทำรายงาน', first = 'เปิดไฟล์') {
  await screen.getByRole('button', { name: 'รับภารกิจ' }).click()
  await screen.getByLabelText('คำสั่งงาน').fill(instruction)
  await screen.getByLabelText('ก้าวแรก').fill(first)
  await screen.getByRole('button', { name: 'เริ่มลงมือ' }).click()
}
