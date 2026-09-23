import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { App } from './App'
import { fakePorts } from './test-ports'
import { quickCapture } from './helpers'
import { Fixer } from '../core/fixer'
import { fakeClock, memoryStorage } from '../core/fakes'

async function backupFile(instructions: string[]) {
  const f = await Fixer.open(fakeClock(0), memoryStorage())
  for (const [i, text] of instructions.entries()) {
    await f.receive(`x${i}`)
    await f.edit(`x${i}`, { instruction: text })
  }
  return new File([await f.exportData()], 'backup.json', { type: 'application/json' })
}

it('export records the backup time; import compares, cancels untouched, then replaces on confirm', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await quickCapture(screen, 'งานในเครื่อง')
  await screen.getByRole('button', { name: 'ตั้งค่า' }).click()
  await expect.element(screen.getByText('ยังไม่เคย', { exact: false })).toBeVisible()
  await screen.getByRole('button', { name: 'ส่งออกไฟล์สำรอง' }).click()
  await expect.element(screen.getByText('ยังไม่เคย', { exact: false })).not.toBeInTheDocument()

  const input = screen.getByLabelText('นำเข้าไฟล์สำรอง (แทนที่ข้อมูลทั้งหมด)')
  await userEvent.upload(input, await backupFile(['จากไฟล์ 1', 'จากไฟล์ 2']))
  const dialog = screen.getByRole('dialog', { name: 'ยืนยันการนำเข้า' })
  await expect.element(dialog.getByRole('row', { name: 'ภารกิจ 2 1' })).toBeVisible()
  await dialog.getByRole('button', { name: 'ยกเลิก' }).click()
  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  await expect.element(screen.getByText('งานในเครื่อง')).toBeVisible()

  await screen.getByRole('button', { name: 'ตั้งค่า' }).click()
  await userEvent.upload(input, await backupFile(['จากไฟล์ 1']))
  await dialog.getByRole('button', { name: 'แทนที่ข้อมูล' }).click()
  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  await expect.element(screen.getByText('จากไฟล์ 1')).toBeVisible()
  await expect.element(screen.getByText('งานในเครื่อง')).not.toBeInTheDocument()
})

it('rejects a bad import file with a clear message', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await screen.getByRole('button', { name: 'ตั้งค่า' }).click()
  const input = screen.getByLabelText('นำเข้าไฟล์สำรอง (แทนที่ข้อมูลทั้งหมด)')
  await userEvent.upload(input, new File(['{"version": 9}'], 'bad.json'))
  await expect.poll(() => screen.getByRole('alert').query()?.textContent).toContain('เวอร์ชัน 9')
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument()
})

it('the dark toggle applies at once and survives a reload', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  const bg = () => getComputedStyle(document.body).backgroundColor
  const light = bg()
  await screen.getByRole('button', { name: 'ตั้งค่า' }).click()
  await screen.getByLabelText('โหมดมืด').click()
  await expect.poll(() => document.documentElement.dataset.theme).toBe('dark')
  expect(bg()).not.toBe(light)

  await screen.unmount()
  delete document.documentElement.dataset.theme
  await render(<App ports={ports} />)
  await expect.poll(() => document.documentElement.dataset.theme).toBe('dark')
})

it('shows the nine rules', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await screen.getByRole('button', { name: 'ตั้งค่า' }).click()
  await screen.getByRole('button', { name: 'กฎ 9 ข้อของ The Fixer' }).click()
  await expect.poll(() => screen.getByRole('listitem').elements().length).toBe(9)
})
