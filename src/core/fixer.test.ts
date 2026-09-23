import { describe, expect, it } from 'vitest'
import { Fixer } from './fixer'
import { fakeClock, memoryStorage } from './fakes'

const MIN = 60_000
const T0 = new Date(2026, 8, 1, 10, 0).getTime() // 1 Sep 2026 10:00 local

async function setup(start = T0) {
  const clock = fakeClock(start)
  const storage = memoryStorage()
  const fixer = await Fixer.open(clock, storage)
  return { clock, storage, fixer, reload: () => Fixer.open(clock, storage) }
}

describe('receiving a Mission', () => {
  it('creates a Draft at once with createdAt from the Clock', async () => {
    const { fixer } = await setup()
    await fixer.receive('m1')
    expect(fixer.mission('m1')).toMatchObject({ status: 'draft', createdAt: T0, instruction: '' })
  })

  it('goes active only with both an Instruction and a First step', async () => {
    const { fixer, clock } = await setup()
    await fixer.receive('m1')
    await expect(fixer.activate('m1')).rejects.toThrow()
    await fixer.edit('m1', { instruction: 'ทำรายงานยอดขาย' })
    await expect(fixer.activate('m1')).rejects.toThrow()
    await fixer.edit('m1', { firstStep: '   ' })
    await expect(fixer.activate('m1')).rejects.toThrow()
    await fixer.edit('m1', { firstStep: 'เปิดไฟล์ยอดขายเดือนก่อน' })
    clock.advance(MIN)
    await fixer.activate('m1')
    const m = fixer.mission('m1')!
    expect(m.status).toBe('active')
    expect(m.steps).toEqual([expect.objectContaining({ text: 'เปิดไฟล์ยอดขายเดือนก่อน', startedAt: T0 + MIN })])
    expect(m.createdAt).toBe(T0)
  })

  it('makes exactly one Mission when receive and save are tapped twice', async () => {
    const { fixer, clock } = await setup()
    await Promise.all([fixer.receive('m1'), fixer.receive('m1')])
    await fixer.edit('m1', { instruction: 'a', firstStep: 'b' })
    await fixer.activate('m1')
    clock.advance(1000)
    await fixer.activate('m1')
    expect(fixer.missions()).toHaveLength(1)
    expect(fixer.mission('m1')!.steps).toHaveLength(1)
    expect(fixer.mission('m1')!.steps[0].startedAt).toBe(T0)
  })

  it('keeps Drafts and active Missions across a reload', async () => {
    const { fixer, reload } = await setup()
    await fixer.receive('d')
    await fixer.edit('d', { instruction: 'ครึ่งทาง' })
    await fixer.receive('a')
    await fixer.edit('a', { instruction: 'x', firstStep: 'y' })
    await fixer.activate('a')
    const again = await reload()
    expect(again.missions().map((m) => [m.id, m.status, m.instruction])).toEqual(
      expect.arrayContaining([
        ['d', 'draft', 'ครึ่งทาง'],
        ['a', 'active', 'x'],
      ]),
    )
  })
})
