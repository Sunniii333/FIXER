// The Fixer core: every domain rule lives here. Pure — no UI, no browser APIs.
// Time comes from the Clock port, persistence goes through the Storage port.

export type Clock = { now(): number }
export type Storage = { load(): Promise<Data | undefined>; save(data: Data): Promise<void> }

export type Status = 'draft' | 'queued' | 'active' | 'done' | 'dropped'

export type Step = {
  id: string
  text: string
  startedAt: number
  doneAt?: number
  outcome?: 'done' | 'abandoned'
}

export const replanReasons = ['waiting', 'access', 'scope', 'underestimated', 'other'] as const
export type ReplanReason = (typeof replanReasons)[number]
export const replanReasonLabels: Record<ReplanReason, string> = {
  waiting: 'รอคนอื่นอยู่',
  access: 'ขาดสิทธิ์หรือข้อมูล',
  scope: 'ขอบเขตงานเปลี่ยน',
  underestimated: 'ประเมินงานต่ำไป',
  other: 'เหตุอื่น',
}
export type Replan = { at: number; reason: ReplanReason; note?: string; abandonedStepId: string; newStepId: string }

export const reminderKinds = ['fiveMinute', 'stuck', 'review', 'deadline', 'backup'] as const
export type ReminderKind = (typeof reminderKinds)[number]
export type Reminder = { kind: ReminderKind; at: number; count?: number }

export type HistoryEntry = { at: number; field: string; oldValue: unknown }

export type Mission = {
  id: string
  instruction: string
  doneDefinition?: string
  deadlineText?: string
  deadlineAt?: number
  constraints?: string
  assignerId?: string
  helperIds: string[]
  risk?: string
  planB?: string
  status: Status
  dropReason?: string
  createdAt: number
  queuedAt?: number
  pickedUpAt?: number // Clock start for a Mission that went through the Queue
  doneAt?: number
  droppedAt?: number
  steps: Step[]
  replans: Replan[]
  history: HistoryEntry[]
}

export type Settings = {
  reminderEnabled: boolean
  reviewTime: string
  deadlineTime: string
  stuckAfter: number // minutes
  lastExportAt?: number
  theme: 'light' | 'dark'
}

export type HelpKind = 'info' | 'permission' | 'skill'
export type Person = { id: string; name: string; canHelpWith: HelpKind[]; note?: string }

export type Data = { missions: Mission[]; people: Person[]; settings: Settings }

export const defaultSettings: Settings = {
  reminderEnabled: true,
  reviewTime: '20:00',
  deadlineTime: '09:00',
  stuckAfter: 30,
  theme: 'light',
}

export class Fixer {
  private constructor(
    private clock: Clock,
    private storage: Storage,
    private data: Data,
  ) {}

  static async open(clock: Clock, storage: Storage) {
    const data = (await storage.load()) ?? { missions: [], people: [], settings: { ...defaultSettings } }
    return new Fixer(clock, storage, data)
  }

  private save() {
    return this.storage.save(this.data)
  }

  private get(id: string) {
    const m = this.data.missions.find((m) => m.id === id)
    if (!m) throw new Error(`No Mission ${id}`)
    return m
  }

  mission(id: string): Mission | undefined {
    return this.data.missions.find((m) => m.id === id)
  }

  /** Idempotent per capture: receiving the same capture id twice makes one Mission. */
  async receive(id: string) {
    if (this.mission(id)) return
    this.data.missions.push({
      id,
      instruction: '',
      helperIds: [],
      status: 'draft',
      createdAt: this.clock.now(),
      steps: [],
      replans: [],
      history: [],
    })
    await this.save()
  }

  missions(): Mission[] {
    return this.data.missions
  }

  /** `firstStep` can only be set on a Draft; after that the Step chain owns Steps. */
  async edit(id: string, patch: MissionPatch) {
    const m = this.get(id)
    const { firstStep, ...fields } = patch
    if (firstStep !== undefined) {
      if (m.status !== 'draft' && m.status !== 'queued') throw new Error('First step is fixed once active')
      m.steps = [{ id: `${id}-s0`, text: firstStep, startedAt: m.createdAt }]
    }
    if ('doneDefinition' in fields && fields.doneDefinition !== m.doneDefinition)
      m.history.push({ at: this.clock.now(), field: 'doneDefinition', oldValue: m.doneDefinition })
    Object.assign(m, fields)
    await this.save()
  }

  /** Save from Receive: a Draft goes active with its First step as the current Step. Idempotent. */
  async activate(id: string) {
    const m = this.get(id)
    if (m.status !== 'draft') return
    if (!m.instruction.trim() || !m.steps[0]?.text.trim()) throw new Error('Need an Instruction and a First step')
    m.status = 'active'
    m.steps[0].startedAt = this.clock.now()
    await this.save()
  }

  /** R1, R2: a Draft never picked up, at most five minutes past receipt. */
  canQueue(id: string) {
    const m = this.get(id)
    return m.status === 'draft' && m.pickedUpAt === undefined && this.clock.now() - m.createdAt <= FIVE_MIN
  }

  /** Notes a Draft for later: no clock while Queued. Idempotent. */
  async queue(id: string) {
    const m = this.get(id)
    if (m.status === 'queued') return
    if (!this.canQueue(id)) throw new Error('Can no longer be Queued')
    if (!m.instruction.trim()) throw new Error('Need an Instruction')
    m.status = 'queued'
    m.queuedAt = this.clock.now()
    await this.save()
  }

  /** Back to Draft; the Five-minute clock starts now. Idempotent. */
  async pickUp(id: string) {
    const m = this.get(id)
    if (m.status !== 'queued') return
    m.status = 'draft'
    m.pickedUpAt = this.clock.now()
    await this.save()
  }

  /** ms left on the Five-minute clock, from Clock start; undefined while Queued or once the First step is done. */
  countdown(id: string): number | undefined {
    const m = this.get(id)
    if (m.steps[0]?.outcome || m.status === 'queued') return undefined
    return Math.max(0, clockStart(m) + FIVE_MIN - this.clock.now())
  }

  /** true / false once resolved; undefined while still inside the first five minutes. */
  onTimeStart(id: string): boolean | undefined {
    return onTime(this.get(id), this.clock.now())
  }

  /**
   * Marks the current Step done at the tap time and opens the next Step, unnamed,
   * which the owner names straight away (`editStep`). A Step can't be completed until named.
   */
  async completeStep(id: string) {
    const m = this.get(id)
    const current = currentStep(m)
    if (m.status !== 'active' || !current) throw new Error('Not active')
    if (!current.text.trim()) throw new Error('Name this Step first')
    const now = this.clock.now()
    current.doneAt = now
    current.outcome = 'done'
    m.steps.push({ id: `${id}-s${m.steps.length}`, text: '', startedAt: now })
    await this.save()
  }

  /** "แผนพัง": change the path, never the goal. */
  async replan(id: string, { reason, note, step }: { reason: ReplanReason; note?: string; step: string }) {
    const m = this.get(id)
    const current = currentStep(m)
    if (!current) throw new Error('Not active')
    if (!replanReasons.includes(reason)) throw new Error(`Unknown reason ${reason}`)
    if (!step.trim()) throw new Error('Name the new Step')
    const at = this.clock.now()
    current.outcome = 'abandoned'
    const next = { id: `${id}-s${m.steps.length}`, text: step.trim(), startedAt: at }
    m.steps.push(next)
    m.replans.push({ at, reason, ...(note?.trim() && { note: note.trim() }), abandonedStepId: current.id, newStepId: next.id })
    await this.save()
  }

  /**
   * Closes as done. The current Step is done too, except a First step never marked:
   * that stays without a doneAt and is counted as a miss.
   */
  async close(id: string) {
    const m = this.get(id)
    const current = currentStep(m)
    if (!current) throw new Error('Not active')
    const now = this.clock.now()
    this.endCurrentStep(m, current, current === m.steps[0] ? 'abandoned' : 'done')
    m.status = 'done'
    m.doneAt = now
    await this.save()
  }

  async drop(id: string, reason: string) {
    const m = this.get(id)
    if (!isOpen(m)) throw new Error('Already closed')
    if (!reason.trim()) throw new Error('Say why')
    const current = currentStep(m)
    if (current) this.endCurrentStep(m, current, 'abandoned')
    m.status = 'dropped'
    m.dropReason = reason.trim()
    m.droppedAt = this.clock.now()
    await this.save()
  }

  private endCurrentStep(m: Mission, step: Step, outcome: 'done' | 'abandoned') {
    if (!step.text.trim()) m.steps.pop() // an unnamed next Step was never a real Step
    else if (outcome === 'done') Object.assign(step, { outcome, doneAt: this.clock.now() })
    else step.outcome = outcome
  }

  /** Back to active with the original clock and result; the earlier doneAt goes to History. */
  async reopen(id: string, step: string) {
    const m = this.get(id)
    if (m.status !== 'done') throw new Error('Only a done Mission can be reopened')
    if (!step.trim()) throw new Error('Name the new current Step')
    const now = this.clock.now()
    m.history.push({ at: now, field: 'doneAt', oldValue: m.doneAt })
    m.status = 'active'
    delete m.doneAt
    m.steps.push({ id: `${id}-s${m.steps.length}`, text: step.trim(), startedAt: now })
    await this.save()
  }

  private deleted?: { mission: Mission; index: number; at: number }

  /** For Missions created by mistake: gone, never counted, unless undone within UNDO_MS. */
  async delete(id: string) {
    const index = this.data.missions.findIndex((m) => m.id === id)
    if (index < 0) return
    this.deleted = { mission: this.data.missions[index], index, at: this.clock.now() }
    this.data.missions.splice(index, 1)
    await this.save()
  }

  async undoDelete() {
    const d = this.deleted
    this.deleted = undefined
    if (!d || this.clock.now() - d.at > UNDO_MS) return false
    this.data.missions.splice(d.index, 0, d.mission)
    await this.save()
    return true
  }

  isOverdue(id: string) {
    return overdue(this.get(id), this.clock.now())
  }

  /**
   * Home order: overdue → not started (Drafts included) → in progress → Queued → done. Dropped live in the history.
   * Queued: nearest deadline first, then no deadline; oldest received first within each (R7).
   */
  homeList(): Mission[] {
    const now = this.clock.now()
    const rank = (m: Mission) =>
      overdue(m, now) ? 0 : m.status === 'done' ? 4 : m.status === 'queued' ? 3 : m.steps.some((s) => s.outcome) ? 2 : 1
    const queueOrder = (a: Mission, b: Mission) =>
      (a.deadlineAt ?? Infinity) - (b.deadlineAt ?? Infinity) || a.createdAt - b.createdAt
    return this.data.missions
      .filter((m) => m.status !== 'dropped')
      .map((m) => ({ m, r: rank(m) }))
      .sort((a, b) => a.r - b.r || (a.r === 3 ? queueOrder(a.m, b.m) : b.m.createdAt - a.m.createdAt))
      .map(({ m }) => m)
  }

  /** On-time start rate per month of Clock start. Missions still inside their five minutes, or never picked up, are left out. */
  rateByMonth(): Record<string, { onTime: number; total: number }> {
    const now = this.clock.now()
    const out: Record<string, { onTime: number; total: number }> = {}
    for (const m of this.data.missions) {
      const result = onTime(m, now)
      if (result === undefined) continue
      const bucket = (out[monthKey(clockStart(m))] ??= { onTime: 0, total: 0 })
      bucket.total++
      if (result) bucket.onTime++
    }
    return out
  }

  /** Home tiles. */
  stats() {
    const now = this.clock.now()
    const month = monthKey(now)
    const open = this.data.missions.filter(isOpen)
    return {
      rate: this.rateByMonth()[month] ?? { onTime: 0, total: 0 },
      closedThisMonth: this.data.missions.filter((m) => m.status === 'done' && monthKey(m.doneAt!) === month).length,
      open: open.length,
      overdue: open.filter((m) => overdue(m, now)).length,
    }
  }

  /**
   * What should fire and when, derived from state. Content-blind by construction:
   * only a kind, a time and an optional count — never Mission text.
   * Anything whose time has already passed is skipped.
   */
  pendingReminders(): Reminder[] {
    const now = this.clock.now()
    const open = this.data.missions.filter(isOpen)
    const { stuckAfter, reviewTime, deadlineTime, lastExportAt } = this.data.settings
    const all: Reminder[] = []
    for (const m of open) {
      if (!m.steps[0]?.outcome && m.status !== 'queued') all.push({ kind: 'fiveMinute', at: clockStart(m) + FIVE_MIN })
      const current = currentStep(m)
      if (current) all.push({ kind: 'stuck', at: current.startedAt + stuckAfter * 60_000 })
    }
    // ponytail: a week of Review nudges ahead, so they keep coming while the app stays closed;
    // the next open re-syncs the next week
    if (open.length) for (let d = 0; d < 8; d++) all.push({ kind: 'review', at: atTime(now, d, reviewTime) })
    const perDate = new Map<number, number>()
    for (const m of open) {
      if (m.deadlineAt === undefined) continue
      const at = atTime(m.deadlineAt, 0, deadlineTime)
      perDate.set(at, (perDate.get(at) ?? 0) + 1)
    }
    for (const [at, count] of perDate) all.push({ kind: 'deadline', at, count })
    if (this.data.missions.length) {
      const since = lastExportAt ?? Math.min(...this.data.missions.map((m) => m.createdAt))
      if (since + 7 * DAY > now) all.push({ kind: 'backup', at: since + 7 * DAY })
      // already overdue: nudge daily with the evening Review until the next export
      else for (let d = 0; d < 8; d++) all.push({ kind: 'backup', at: atTime(now, d, reviewTime) })
    }
    return all.filter((r) => r.at > now).sort((a, b) => a.at - b.at)
  }

  /** Stuck: the current Step has been current longer than stuckAfter. */
  isStuck(id: string) {
    const current = currentStep(this.get(id))
    return !!current && this.clock.now() - current.startedAt > this.data.settings.stuckAfter * 60_000
  }

  settings(): Settings {
    return this.data.settings
  }

  async updateSettings(patch: Partial<Omit<Settings, 'lastExportAt'>>) {
    Object.assign(this.data.settings, patch)
    await this.save()
  }

  /** The whole store as a versioned JSON file. Records lastExportAt. */
  async exportData() {
    this.data.settings.lastExportAt = this.clock.now()
    await this.save()
    return JSON.stringify({ version: EXPORT_VERSION, exportedAt: this.clock.now(), ...this.data }, null, 2)
  }

  /** Validates an import file without touching anything; `replaceAll` does the replacing. */
  parseImport(text: string):
    | { ok: true; data: Data; compare: Record<'file' | 'device', { missions: number; people: number }> }
    | { ok: false; error: string } {
    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของ The Fixer (อ่าน JSON ไม่ได้)' }
    }
    const f = raw as Record<string, unknown>
    if (typeof f !== 'object' || f === null) return { ok: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง' }
    // version 1 has no Queue; its Missions simply were never Queued (R11)
    if (f.version !== 1 && f.version !== EXPORT_VERSION)
      return { ok: false, error: `ไฟล์เป็นเวอร์ชัน ${String(f.version)} แต่แอปนี้อ่านได้เฉพาะเวอร์ชัน 1–${EXPORT_VERSION}` }
    if (!Array.isArray(f.missions) || !Array.isArray(f.people) || typeof f.settings !== 'object' || !f.settings)
      return { ok: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง: ต้องมีภารกิจ รายชื่อคน และการตั้งค่า' }
    if (!f.missions.every(isMission)) return { ok: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง: ข้อมูลภารกิจบางรายการเสีย' }
    if (!f.people.every(isPerson)) return { ok: false, error: 'รูปแบบไฟล์ไม่ถูกต้อง: ข้อมูลรายชื่อคนบางรายการเสีย' }
    const data: Data = {
      missions: f.missions,
      people: f.people,
      settings: { ...defaultSettings, ...(f.settings as Partial<Settings>) },
    }
    const count = (d: Data) => ({ missions: d.missions.length, people: d.people.length })
    return { ok: true, data, compare: { file: count(data), device: count(this.data) } }
  }

  /** Replaces everything (no merging). Only after the owner confirmed the comparison. */
  async replaceAll(data: Data) {
    this.data = structuredClone(data)
    await this.save()
  }

  /** The Review screen, for Missions received within [from, to]. */
  review({ from, to }: { from: number; to: number }) {
    const now = this.clock.now()
    const ms = this.data.missions.filter((m) => m.createdAt >= from && m.createdAt <= to)
    const open = ms.filter(isOpen)
    const replansByReason: Partial<Record<ReplanReason, number>> = {}
    for (const r of ms.flatMap((m) => m.replans)) replansByReason[r.reason] = (replansByReason[r.reason] ?? 0) + 1
    const missedByMonth: Record<string, number> = {}
    for (const m of ms) {
      const missed =
        m.deadlineAt !== undefined && (m.status === 'done' ? m.doneAt! > m.deadlineAt : overdue(m, now))
      if (missed) missedByMonth[monthKey(m.createdAt)] = (missedByMonth[monthKey(m.createdAt)] ?? 0) + 1
    }
    return {
      open,
      overdue: open.filter((m) => overdue(m, now)),
      staleDrafts: open.filter((m) => m.status === 'draft' && now - clockStart(m) > DAY), // "ร่างค้าง"
      staleQueue: open.filter((m) => m.status === 'queued' && now - m.queuedAt! > DAY), // "คิวค้าง"
      goalUnclear: ms.filter((m) => flags(m).goalUnclear),
      oftenReplanned: ms.filter((m) => m.replans.length >= OFTEN_REPLANNED).sort((a, b) => b.replans.length - a.replans.length),
      replansByReason,
      // a real change of goal: replacing a Done definition that was already there
      doneDefinitionChanged: ms.filter((m) => m.history.some((h) => h.field === 'doneDefinition' && h.oldValue)).length,
      textOnlyExcluded: ms.filter((m) => flags(m).noDate).length,
      missedByMonth,
    }
  }

  /** Ready-to-send Thai sentence for the Assigner; four fixed templates by state. */
  statusSentence(id: string): string | undefined {
    const m = this.get(id)
    const what = `เรื่อง “${m.instruction}”`
    const step = m.steps.findLast((s) => s.text.trim())?.text
    // right after finishing a Step the next one may still be unnamed: say what was just done
    const named = currentStep(m)?.text.trim()
    const now = (doing: string) => (named ? `${doing} “${step}” ครับ` : `เพิ่งทำ “${step}” เสร็จครับ`)
    const replan = m.replans.at(-1)
    if (m.status === 'dropped' || m.status === 'queued') return undefined
    if (m.status === 'done') {
      const assigner = this.person(m.assignerId)
      return `${assigner ? `${assigner.name}ครับ ` : ''}${what} เสร็จเรียบร้อยแล้วครับ`
    }
    if (replan) {
      const why = replan.reason === 'other' && replan.note ? replan.note : replanReasonLabels[replan.reason]
      return `${what} ต้องปรับแผนเพราะ${why}ครับ ${now('ตอนนี้เปลี่ยนมาทำ')}`
    }
    if (m.steps[0]?.outcome === 'done') return `${what} กำลังดำเนินการอยู่ครับ ${now('ตอนนี้กำลังทำ')}`
    return `ได้รับ${what} แล้วครับ ${step ? `กำลังเริ่มจาก “${step}” ครับ` : 'กำลังวางก้าวแรกอยู่ครับ'}`
  }

  people(): Person[] {
    return this.data.people
  }

  person(id?: string): Person | undefined {
    return this.data.people.find((p) => p.id === id)
  }

  /** A Mission's Helpers that still exist in the People list. */
  helpers(id: string): Person[] {
    return this.get(id).helperIds.flatMap((h) => this.person(h) ?? [])
  }

  /** Adds or replaces a Person by id. */
  async savePerson(person: Person) {
    const i = this.data.people.findIndex((p) => p.id === person.id)
    if (i < 0) this.data.people.push(person)
    else this.data.people[i] = person
    await this.save()
  }

  /** Missions keep the id; they just stop showing a Person who no longer exists. */
  async removePerson(id: string) {
    this.data.people = this.data.people.filter((p) => p.id !== id)
    await this.save()
  }

  /** Names or corrects a Step. Replacing text that was already there keeps the old text in History. */
  async editStep(id: string, stepId: string, text: string) {
    const m = this.get(id)
    const step = m.steps.find((s) => s.id === stepId)
    if (!step) throw new Error(`No Step ${stepId}`)
    if (step.text === text) return
    if (step.text && step.outcome) m.history.push({ at: this.clock.now(), field: `step:${stepId}`, oldValue: step.text })
    step.text = text
    await this.save()
  }
}

const FIVE_MIN = 5 * 60_000
export const UNDO_MS = 5000
const DAY = 24 * 60 * 60_000
const OFTEN_REPLANNED = 2

export function currentStep(m: Mission): Step | undefined {
  const last = m.steps.at(-1)
  return m.status === 'active' && last && !last.outcome ? last : undefined
}

/** "เป้ายังไม่ชัด" and "ไม่มีวันกำหนด" */
export function flags(m: Mission) {
  return {
    goalUnclear: m.status === 'active' && !m.doneDefinition?.trim(),
    noDate: !!m.deadlineText?.trim() && m.deadlineAt === undefined,
  }
}

/** Pick up time if it went through the Queue, else receipt (old data has no pickedUpAt). */
export function clockStart(m: Mission) {
  return m.pickedUpAt ?? m.createdAt
}

export function isOpen(m: Mission) {
  return m.status === 'draft' || m.status === 'queued' || m.status === 'active'
}

function onTime(m: Mission, now: number): boolean | undefined {
  if (m.queuedAt !== undefined && m.pickedUpAt === undefined) return undefined // never committed: no clock (R4)
  const first = m.steps[0]
  const start = clockStart(m)
  if (first?.outcome === 'done') return first.doneAt! - start <= FIVE_MIN
  if (first?.outcome || m.status === 'done' || m.status === 'dropped' || now >= start + FIVE_MIN) return false
  return undefined
}

export type MissionPatch = Partial<
  Pick<
    Mission,
    | 'instruction'
    | 'doneDefinition'
    | 'deadlineText'
    | 'deadlineAt'
    | 'constraints'
    | 'assignerId'
    | 'helperIds'
    | 'risk'
    | 'planB'
  >
> & { firstStep?: string }

/** Past its real date and not closed. Text-only deadlines can't be overdue. */
function overdue(m: Mission, now: number) {
  return isOpen(m) && m.deadlineAt !== undefined && now > m.deadlineAt
}

export function monthKey(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const EXPORT_VERSION = 2
const statuses: Status[] = ['draft', 'queued', 'active', 'done', 'dropped']
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

function isMission(x: unknown): x is Mission {
  return (
    isObj(x) &&
    typeof x.id === 'string' &&
    typeof x.instruction === 'string' &&
    statuses.includes(x.status as Status) &&
    typeof x.createdAt === 'number' &&
    Array.isArray(x.helperIds) &&
    Array.isArray(x.steps) &&
    x.steps.every((s) => isObj(s) && typeof s.id === 'string' && typeof s.text === 'string' && typeof s.startedAt === 'number') &&
    Array.isArray(x.replans) &&
    x.replans.every((r) => isObj(r) && replanReasons.includes(r.reason as ReplanReason)) &&
    Array.isArray(x.history)
  )
}

function isPerson(x: unknown): x is Person {
  return isObj(x) && typeof x.id === 'string' && typeof x.name === 'string' && Array.isArray(x.canHelpWith)
}

/** Local time "HH:MM" on the day of `ms`, `days` later. */
function atTime(ms: number, days: number, hhmm: string) {
  const [h, min] = hhmm.split(':').map(Number)
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, h, min).getTime()
}
