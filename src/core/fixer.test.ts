import { describe, expect, it } from 'vitest'
import { Fixer, flags } from './fixer'
import { fakeClock, memoryStorage } from './fakes'

const MIN = 60_000
const DAY = 24 * 60 * MIN
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

async function activeMission(fixer: Fixer, id = 'm1', first = 'ก้าวแรก') {
  await fixer.receive(id)
  await fixer.edit(id, { instruction: `งาน ${id}`, firstStep: first })
  await fixer.activate(id)
}

describe('Five-minute clock and First-step tap', () => {
  it('counts down from createdAt, also on a Draft, and survives a reload', async () => {
    const { fixer, clock, reload } = await setup()
    await fixer.receive('m1')
    clock.advance(2 * MIN)
    expect(fixer.countdown('m1')).toBe(3 * MIN)
    clock.advance(4 * MIN)
    expect((await reload()).countdown('m1')).toBe(0)
  })

  it('records the tap time as the First step doneAt; within five minutes is an On-time start', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    clock.advance(5 * MIN)
    await fixer.completeStep('m1')
    expect(fixer.mission('m1')!.steps[0]).toMatchObject({ doneAt: T0 + 5 * MIN, outcome: 'done' })
    expect(fixer.onTimeStart('m1')).toBe(true)
    expect(fixer.countdown('m1')).toBeUndefined()
  })

  it('records a late tap truthfully but not as an On-time start', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    clock.advance(5 * MIN + 1000)
    await fixer.completeStep('m1')
    expect(fixer.mission('m1')!.steps[0].doneAt).toBe(T0 + 5 * MIN + 1000)
    expect(fixer.onTimeStart('m1')).toBe(false)
  })

  it('leaves the result pending inside five minutes, and a miss once they pass with no tap', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    clock.advance(4 * MIN)
    expect(fixer.onTimeStart('m1')).toBeUndefined()
    clock.advance(1 * MIN + 1)
    expect(fixer.onTimeStart('m1')).toBe(false)
  })
})

describe('filling in a Mission later', () => {
  it('records every Done-definition edit in History', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    clock.advance(MIN)
    await fixer.edit('m1', { doneDefinition: 'ส่งไฟล์ให้หัวหน้า', risk: 'ข้อมูลไม่ครบ' })
    clock.advance(MIN)
    await fixer.edit('m1', { doneDefinition: 'ส่งไฟล์และนำเสนอ' })
    await fixer.edit('m1', { doneDefinition: 'ส่งไฟล์และนำเสนอ' }) // unchanged: nothing recorded
    expect(fixer.mission('m1')!.history).toEqual([
      { at: T0 + MIN, field: 'doneDefinition', oldValue: undefined },
      { at: T0 + 2 * MIN, field: 'doneDefinition', oldValue: 'ส่งไฟล์ให้หัวหน้า' },
    ])
  })

  it('flags an active Mission with no Done definition, and a deadline with no date', async () => {
    const { fixer } = await setup()
    await activeMission(fixer)
    await fixer.edit('m1', { deadlineText: 'ก่อนประชุมวันพฤหัส' })
    const m = () => fixer.mission('m1')!
    expect(flags(m())).toEqual({ goalUnclear: true, noDate: true })
    await fixer.edit('m1', { doneDefinition: 'x', deadlineAt: T0 + 3 * DAY })
    expect(flags(m())).toEqual({ goalUnclear: false, noDate: false })
  })
})

describe('People', () => {
  it('adds, edits and removes People, persisted; roles belong to each Mission', async () => {
    const { fixer, reload } = await setup()
    await fixer.savePerson({ id: 'p1', name: 'พี่เอ', canHelpWith: ['permission'] })
    await fixer.savePerson({ id: 'p2', name: 'บี', canHelpWith: ['info'] })
    await fixer.savePerson({ id: 'p2', name: 'น้องบี', canHelpWith: ['info', 'skill'], note: 'ฝ่ายไอที' })
    await activeMission(fixer, 'm1')
    await activeMission(fixer, 'm2')
    await fixer.edit('m1', { assignerId: 'p1', helperIds: ['p2'] })
    await fixer.edit('m2', { assignerId: 'p2', helperIds: ['p1'] })
    await fixer.removePerson('p1')

    const again = await reload()
    expect(again.people()).toEqual([{ id: 'p2', name: 'น้องบี', canHelpWith: ['info', 'skill'], note: 'ฝ่ายไอที' }])
    expect(again.mission('m2')).toMatchObject({ assignerId: 'p2', helperIds: ['p1'] })
    expect(again.helpers('m2')).toEqual([])
    expect(again.helpers('m1').map((p) => p.name)).toEqual(['น้องบี'])
  })
})

describe('the Step chain', () => {
  const current = (fixer: Fixer) => fixer.mission('m1')!.steps.filter((s) => !s.outcome)

  it('opens exactly one next Step, current from the tap, which must be named before it can be completed', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    clock.advance(MIN)
    await fixer.completeStep('m1')
    expect(current(fixer)).toEqual([expect.objectContaining({ text: '', startedAt: T0 + MIN })])
    await expect(fixer.completeStep('m1')).rejects.toThrow()
    await fixer.editStep('m1', current(fixer)[0].id, 'โทรหาฝ่ายบัญชี')
    clock.advance(MIN)
    await fixer.completeStep('m1')
    expect(current(fixer)).toHaveLength(1)
    expect(fixer.mission('m1')!.steps.map((s) => s.outcome)).toEqual(['done', 'done', undefined])
  })

  it('keeps the original text of an edited done Step in History and never moves its times', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer, 'm1', 'เปิดไฟล')
    clock.advance(MIN)
    await fixer.completeStep('m1')
    const before = structuredClone(fixer.mission('m1')!.steps[0])
    clock.advance(MIN)
    await fixer.editStep('m1', before.id, 'เปิดไฟล์')
    const m = fixer.mission('m1')!
    expect(m.steps[0]).toEqual({ ...before, text: 'เปิดไฟล์' })
    expect(m.history).toEqual([{ at: T0 + 2 * MIN, field: `step:${before.id}`, oldValue: 'เปิดไฟล' }])
  })
})
