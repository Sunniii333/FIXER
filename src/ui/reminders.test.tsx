import { expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { App } from './App'
import { fakePorts, T0 } from './test-ports'
import { quickCapture } from './helpers'

const MIN = 60_000
const fiveMinute = (ports: ReturnType<typeof fakePorts>) => ports.synced.at(-1)?.filter((e) => e.kind === 'fiveMinute')

it('re-syncs the five-minute alert on create and First step, with only generic fields', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await quickCapture(screen, 'ความลับบริษัท')
  await expect.poll(() => fiveMinute(ports)).toEqual([{ dueAt: T0 + 5 * MIN, kind: 'fiveMinute' }])
  expect(JSON.stringify(ports.synced)).not.toContain('ความลับ')

  await screen.getByRole('button', { name: 'ทำก้าวแรกแล้ว' }).click()
  await expect.poll(() => fiveMinute(ports)).toEqual([])
})

it('re-syncs when a Mission without a First step is deleted', async () => {
  const ports = fakePorts()
  const screen = await render(<App ports={ports} />)
  await quickCapture(screen)
  await expect.poll(() => fiveMinute(ports)).toHaveLength(1)
  await screen.getByRole('button', { name: 'ลบ (สร้างผิด)' }).click()
  await expect.poll(() => fiveMinute(ports)).toEqual([])
})
