import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePorts } from './test-ports'
import { quickCapture, type Screen } from './helpers'

async function addPerson(screen: Screen, name: string, help: string) {
  await screen.getByRole('button', { name: 'เพิ่มคน' }).click()
  await screen.getByLabelText('ชื่อ').fill(name)
  await screen.getByLabelText(help).click()
  await screen.getByRole('button', { name: 'บันทึก' }).click()
}

it('People: add, edit, remove; pick an Assigner and Helpers; the Mission lists its Helpers', async () => {
  const screen = await render(<App ports={fakePorts()} />)
  await screen.getByRole('button', { name: 'คน' }).click()
  await addPerson(screen, 'พี่เอ', 'อนุมัติ/สิทธิ์')
  await addPerson(screen, 'บี', 'ข้อมูล')
  await addPerson(screen, 'ซี', 'ทักษะ')

  await screen.getByRole('button', { name: 'แก้ บี' }).click()
  await screen.getByLabelText('ชื่อ').fill('น้องบี')
  await screen.getByRole('button', { name: 'บันทึก' }).click()
  await screen.getByRole('button', { name: 'ลบ ซี' }).click()
  await expect.element(screen.getByText('น้องบี')).toBeVisible()
  await expect.element(screen.getByText('ซี', { exact: true })).not.toBeInTheDocument()

  await screen.getByRole('button', { name: 'หน้าหลัก' }).click()
  await quickCapture(screen)
  await screen.getByRole('button', { name: 'แก้ไข' }).click()
  await screen.getByRole('combobox', { name: 'ผู้สั่งงาน (Assigner)' }).selectOptions('พี่เอ')
  await screen.getByRole('checkbox', { name: 'น้องบี' }).click()
  await screen.getByRole('button', { name: 'บันทึก' }).click()

  const helpers = screen.getByRole('list', { name: 'คนที่ช่วยได้' })
  await expect.element(helpers.getByText('น้องบี')).toBeVisible()
  await expect.element(helpers.getByText('ข้อมูล')).toBeVisible()
  await expect.element(screen.getByText('สั่งโดย พี่เอ')).toBeVisible()
})
