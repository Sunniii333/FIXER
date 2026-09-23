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

describe('Replan', () => {
  it('abandons the current Step, adds a new current Step and leaves the Done definition alone', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer, 'm1', 'ขอไฟล์จากบัญชี')
    await fixer.edit('m1', { doneDefinition: 'ส่งรายงาน', planB: 'ใช้ตัวเลขเดือนก่อน' })
    clock.advance(10 * MIN)
    await fixer.replan('m1', { reason: 'waiting', note: 'บัญชีลา', step: 'ใช้ตัวเลขเดือนก่อน' })

    const m = fixer.mission('m1')!
    expect(m.doneDefinition).toBe('ส่งรายงาน')
    expect(m.steps).toEqual([
      expect.objectContaining({ id: 'm1-s0', text: 'ขอไฟล์จากบัญชี', outcome: 'abandoned' }),
      { id: 'm1-s1', text: 'ใช้ตัวเลขเดือนก่อน', startedAt: T0 + 10 * MIN },
    ])
    expect(m.replans).toEqual([
      { at: T0 + 10 * MIN, reason: 'waiting', note: 'บัญชีลา', abandonedStepId: 'm1-s0', newStepId: 'm1-s1' },
    ])
    // the new Step is never a First step: the abandoned one stays first, and counts as a miss
    expect(fixer.onTimeStart('m1')).toBe(false)
  })

  it('needs a reason from the fixed list and a new Step', async () => {
    const { fixer } = await setup()
    await activeMission(fixer)
    await expect(fixer.replan('m1', { reason: 'bad' as never, step: 'x' })).rejects.toThrow()
    await expect(fixer.replan('m1', { reason: 'other', step: ' ' })).rejects.toThrow()
    expect(fixer.mission('m1')!.replans).toEqual([])
  })
})

describe('close, drop, reopen, delete', () => {
  it('closes as done, marking the current Step done', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    await fixer.completeStep('m1')
    await fixer.editStep('m1', 'm1-s1', 'ส่งไฟล์')
    clock.advance(20 * MIN)
    await fixer.close('m1')
    const m = fixer.mission('m1')!
    expect(m).toMatchObject({ status: 'done', doneAt: T0 + 20 * MIN })
    expect(m.steps.map((s) => [s.outcome, s.doneAt])).toEqual([
      ['done', T0],
      ['done', T0 + 20 * MIN],
    ])
  })

  it('closes without a First step as a miss, and reopening never changes that', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    clock.advance(MIN)
    await fixer.close('m1')
    expect(fixer.onTimeStart('m1')).toBe(false)
    expect(fixer.mission('m1')!.steps[0].doneAt).toBeUndefined()

    clock.advance(MIN)
    await fixer.reopen('m1', 'ยังขาดกราฟ')
    const m = fixer.mission('m1')!
    expect(m).toMatchObject({ status: 'active', createdAt: T0 })
    expect(m.doneAt).toBeUndefined()
    expect(m.history).toContainEqual({ at: T0 + 2 * MIN, field: 'doneAt', oldValue: T0 + MIN })
    expect(m.steps.at(-1)).toEqual({ id: 'm1-s1', text: 'ยังขาดกราฟ', startedAt: T0 + 2 * MIN })
    expect(fixer.onTimeStart('m1')).toBe(false)
  })

  it('keeps an On-time start through reopen, and reopen needs a new Step', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    await fixer.completeStep('m1')
    await fixer.close('m1')
    await expect(fixer.reopen('m1', ' ')).rejects.toThrow()
    clock.advance(DAY)
    await fixer.reopen('m1', 'แก้ตามคอมเมนต์')
    expect(fixer.onTimeStart('m1')).toBe(true)
  })

  it('drops a Draft or active Mission only with a reason', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer)
    await expect(fixer.drop('m1', '  ')).rejects.toThrow()
    clock.advance(MIN)
    await fixer.drop('m1', 'ลูกค้ายกเลิก')
    expect(fixer.mission('m1')).toMatchObject({ status: 'dropped', dropReason: 'ลูกค้ายกเลิก', droppedAt: T0 + MIN })
    expect(fixer.onTimeStart('m1')).toBe(false)
    await fixer.receive('d')
    await fixer.drop('d', 'ซ้ำ')
    expect(fixer.mission('d')!.status).toBe('dropped')
  })

  it('undoes a delete within a few seconds, and not after', async () => {
    const { fixer, clock, reload } = await setup()
    await activeMission(fixer, 'a')
    await activeMission(fixer, 'b')
    await fixer.delete('a')
    expect(fixer.mission('a')).toBeUndefined()
    clock.advance(4000)
    await fixer.undoDelete()
    expect(fixer.mission('a')).toBeDefined()

    await fixer.delete('b')
    clock.advance(6000)
    await fixer.undoDelete()
    expect(fixer.mission('b')).toBeUndefined()
    expect((await reload()).missions().map((m) => m.id)).toEqual(['a'])
  })
})

describe('Status sentence', () => {
  it('picks the template for each state and fills it from the Instruction, current Step and latest Replan reason', async () => {
    const { fixer } = await setup()
    await fixer.savePerson({ id: 'p1', name: 'พี่เอ', canHelpWith: [] })
    await activeMission(fixer, 'm1', 'เปิดไฟล์ยอดขาย')
    await fixer.edit('m1', { instruction: 'ทำรายงานยอดขาย' })
    expect(fixer.statusSentence('m1')).toBe('ได้รับเรื่อง “ทำรายงานยอดขาย” แล้วครับ กำลังเริ่มจาก “เปิดไฟล์ยอดขาย” ครับ')

    await fixer.completeStep('m1')
    await fixer.editStep('m1', 'm1-s1', 'ทำกราฟ')
    expect(fixer.statusSentence('m1')).toBe('เรื่อง “ทำรายงานยอดขาย” กำลังดำเนินการอยู่ครับ ตอนนี้กำลังทำ “ทำกราฟ” ครับ')

    await fixer.replan('m1', { reason: 'access', step: 'ขอสิทธิ์ระบบ' })
    await fixer.replan('m1', { reason: 'waiting', step: 'รอไฟล์จากบัญชี' })
    expect(fixer.statusSentence('m1')).toBe(
      'เรื่อง “ทำรายงานยอดขาย” ต้องปรับแผนเพราะรอคนอื่นอยู่ครับ ตอนนี้เปลี่ยนมาทำ “รอไฟล์จากบัญชี” ครับ',
    )

    await fixer.close('m1')
    expect(fixer.statusSentence('m1')).toBe('เรื่อง “ทำรายงานยอดขาย” เสร็จเรียบร้อยแล้วครับ')
    await fixer.edit('m1', { assignerId: 'p1' })
    expect(fixer.statusSentence('m1')).toBe('พี่เอครับ เรื่อง “ทำรายงานยอดขาย” เสร็จเรียบร้อยแล้วครับ')
  })

  it('uses the note of an "other" Replan as its reason, and has nothing to say for a Dropped Mission', async () => {
    const { fixer } = await setup()
    await activeMission(fixer)
    await fixer.replan('m1', { reason: 'other', note: 'เครื่องพัง', step: 'ยืมเครื่องเพื่อน' })
    expect(fixer.statusSentence('m1')).toContain('ต้องปรับแผนเพราะเครื่องพังครับ')
    await fixer.drop('m1', 'ยกเลิก')
    expect(fixer.statusSentence('m1')).toBeUndefined()
  })
})

describe('home list and stats', () => {
  it('orders overdue, then not started (Drafts included), then in progress, then done; Dropped left out', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer, 'done')
    await fixer.close('done')
    await activeMission(fixer, 'progress')
    await fixer.completeStep('progress')
    await fixer.receive('draft')
    await activeMission(fixer, 'notStarted')
    await activeMission(fixer, 'late')
    await fixer.edit('late', { deadlineAt: T0 + DAY })
    await activeMission(fixer, 'textOnly')
    await fixer.edit('textOnly', { deadlineText: 'เร็วๆ นี้' })
    await activeMission(fixer, 'gone')
    await fixer.drop('gone', 'ไม่ต้องทำแล้ว')
    clock.advance(2 * DAY)

    const order = fixer.homeList().map((m) => m.id)
    expect(order[0]).toBe('late')
    expect(order.slice(1, 4).sort()).toEqual(['draft', 'notStarted', 'textOnly'])
    expect(order.slice(4)).toEqual(['progress', 'done'])
    expect(fixer.isOverdue('late')).toBe(true)
    expect(fixer.isOverdue('textOnly')).toBe(false)
  })

  it('counts every resolved Mission in the On-time start rate, by month received', async () => {
    const { fixer, clock } = await setup()
    // August: one on-time start, one late
    clock.set(new Date(2026, 7, 10, 9, 0).getTime())
    await activeMission(fixer, 'aug-ontime')
    await fixer.completeStep('aug-ontime')
    await activeMission(fixer, 'aug-late')
    clock.advance(6 * MIN)
    await fixer.completeStep('aug-late')

    // September: on-time, missed (no tap), closed without First step, Dropped, pending, deleted
    clock.set(T0)
    await activeMission(fixer, 'ontime')
    clock.advance(MIN)
    await fixer.completeStep('ontime')
    await fixer.close('ontime')
    await activeMission(fixer, 'missed')
    await activeMission(fixer, 'closedNoStep')
    await fixer.close('closedNoStep')
    await fixer.receive('dropped')
    await fixer.drop('dropped', 'ยกเลิก')
    await activeMission(fixer, 'deleted')
    await fixer.completeStep('deleted')
    await fixer.delete('deleted')
    clock.advance(6 * MIN)
    await activeMission(fixer, 'pending')
    await fixer.reopen('ontime', 'ต่ออีกนิด')

    expect(fixer.rateByMonth()).toEqual({
      '2026-08': { onTime: 1, total: 2 },
      '2026-09': { onTime: 1, total: 4 },
    })
    expect(fixer.stats()).toEqual({ rate: { onTime: 1, total: 4 }, closedThisMonth: 1, open: 5, overdue: 0 })
  })
})

describe('Review', () => {
  it('lists open, overdue, stale Drafts and unclear goals, and groups Replans by reason, within the date range', async () => {
    const { fixer, clock } = await setup()
    clock.set(T0 - 10 * DAY)
    await activeMission(fixer, 'old') // outside a 7-day range
    clock.set(T0)
    await fixer.receive('stale')
    clock.advance(MIN)
    await activeMission(fixer, 'late')
    await fixer.edit('late', { doneDefinition: 'x', deadlineAt: T0 + DAY })
    await activeMission(fixer, 'bumpy')
    await fixer.edit('bumpy', { doneDefinition: 'เดิม' })
    await fixer.edit('bumpy', { doneDefinition: 'ใหม่' })
    await fixer.replan('bumpy', { reason: 'waiting', step: 'a' })
    await fixer.replan('bumpy', { reason: 'waiting', step: 'b' })
    await fixer.replan('bumpy', { reason: 'scope', step: 'c' })
    await activeMission(fixer, 'textOnly')
    await fixer.edit('textOnly', { doneDefinition: 'x', deadlineText: 'สิ้นเดือน' })
    clock.advance(2 * DAY)
    await fixer.receive('fresh')

    const ids = (ms: { id: string }[]) => ms.map((m) => m.id).sort()
    const r = fixer.review({ from: T0 - 7 * DAY, to: clock.now() })
    expect(ids(r.open)).toEqual(['bumpy', 'fresh', 'late', 'stale', 'textOnly'])
    expect(ids(r.overdue)).toEqual(['late'])
    expect(ids(r.staleDrafts)).toEqual(['stale'])
    expect(ids(r.goalUnclear)).toEqual([])
    expect(ids(r.oftenReplanned)).toEqual(['bumpy'])
    expect(r.replansByReason).toEqual({ waiting: 2, scope: 1 })
    expect(r.doneDefinitionChanged).toBe(1)
    expect(r.textOnlyExcluded).toBe(1)

    const all = fixer.review({ from: 0, to: clock.now() })
    expect(ids(all.goalUnclear)).toEqual(['old'])
  })

  it('counts Missed deadlines per month received: closed after deadlineAt, or open past it', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer, 'closedLate')
    await fixer.edit('closedLate', { deadlineAt: T0 + DAY })
    await activeMission(fixer, 'closedOnTime')
    await fixer.edit('closedOnTime', { deadlineAt: T0 + DAY })
    await fixer.close('closedOnTime')
    await activeMission(fixer, 'openLate')
    await fixer.edit('openLate', { deadlineAt: T0 + DAY })
    await activeMission(fixer, 'droppedLate')
    await fixer.edit('droppedLate', { deadlineAt: T0 + DAY })
    await activeMission(fixer, 'textOnly')
    await fixer.edit('textOnly', { deadlineText: 'เร็วๆ นี้' })
    clock.advance(2 * DAY)
    await fixer.close('closedLate')
    await fixer.drop('droppedLate', 'ยกเลิก')

    expect(fixer.review({ from: 0, to: clock.now() }).missedByMonth).toEqual({ '2026-09': 2 })
  })
})

describe('export and import', () => {
  async function withData() {
    const s = await setup()
    await s.fixer.savePerson({ id: 'p1', name: 'พี่เอ', canHelpWith: ['skill'] })
    await activeMission(s.fixer, 'm1')
    await s.fixer.replan('m1', { reason: 'scope', step: 'x' })
    await s.fixer.receive('d1')
    return s
  }

  it('round-trips Missions, People and Settings through a versioned file, and records lastExportAt', async () => {
    const { fixer, clock } = await withData()
    clock.advance(MIN)
    const file = await fixer.exportData()
    expect(JSON.parse(file)).toMatchObject({ version: 1, missions: expect.any(Array), people: expect.any(Array) })
    expect(fixer.settings().lastExportAt).toBe(T0 + MIN)

    const other = (await setup()).fixer
    await activeMission(other, 'mine')
    const parsed = other.parseImport(file)
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.compare).toEqual({ file: { missions: 2, people: 1 }, device: { missions: 1, people: 0 } })
    await other.replaceAll(parsed.data)
    expect(other.missions().map((m) => m.id)).toEqual(['m1', 'd1'])
    expect(other.mission('m1')).toEqual(fixer.mission('m1'))
    expect(other.people()).toEqual(fixer.people())
    expect(other.settings()).toEqual(fixer.settings())
  })

  it.each([
    ['not JSON', '{oops'],
    ['wrong shape', JSON.stringify({ version: 1, missions: 'nope', people: [], settings: {} })],
    ['a bad Mission', JSON.stringify({ version: 1, missions: [{ id: 1 }], people: [], settings: {} })],
    ['a newer version', JSON.stringify({ version: 2, missions: [], people: [], settings: {} })],
  ])('rejects %s with a message and leaves the data alone', async (_, text) => {
    const { fixer, reload } = await withData()
    const before = structuredClone(fixer.missions())
    const parsed = fixer.parseImport(text)
    expect(parsed).toEqual({ ok: false, error: expect.any(String) })
    expect(fixer.missions()).toEqual(before)
    expect((await reload()).missions()).toEqual(before)
  })
})

describe('pendingReminders', () => {
  const kinds = (fixer: Fixer, kind: string) => fixer.pendingReminders().filter((r) => r.kind === kind)

  it('has a five-minute alert at createdAt + 5 min for each Mission without a First step, Drafts included', async () => {
    const { fixer, clock } = await setup()
    await fixer.receive('draft')
    clock.advance(MIN)
    await activeMission(fixer, 'a')
    expect(kinds(fixer, 'fiveMinute')).toEqual([
      { kind: 'fiveMinute', at: T0 + 5 * MIN },
      { kind: 'fiveMinute', at: T0 + 6 * MIN },
    ])
    await fixer.completeStep('a')
    await fixer.drop('draft', 'ซ้ำ')
    expect(kinds(fixer, 'fiveMinute')).toEqual([])
  })

  it('skips a five-minute alert whose time has passed, and drops it on close or delete', async () => {
    const { fixer, clock } = await setup()
    await activeMission(fixer, 'a')
    await activeMission(fixer, 'b')
    await fixer.close('a')
    await fixer.delete('b')
    expect(kinds(fixer, 'fiveMinute')).toEqual([])
    await activeMission(fixer, 'c')
    clock.advance(5 * MIN)
    expect(kinds(fixer, 'fiveMinute')).toEqual([])
  })
})

describe('Settings', () => {
  it('starts from the defaults and keeps changes across a reload', async () => {
    const { fixer, reload } = await setup()
    expect(fixer.settings()).toEqual({
      reminderEnabled: true,
      reviewTime: '20:00',
      deadlineTime: '09:00',
      stuckAfter: 30,
      theme: 'light',
    })
    await fixer.updateSettings({ stuckAfter: 45, theme: 'dark' })
    expect((await reload()).settings()).toMatchObject({ stuckAfter: 45, theme: 'dark', reviewTime: '20:00' })
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
