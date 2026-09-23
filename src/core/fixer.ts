// The Fixer core: every domain rule lives here. Pure — no UI, no browser APIs.
// Time comes from the Clock port, persistence goes through the Storage port.

export type Clock = { now(): number }
export type Storage = { load(): Promise<Data | undefined>; save(data: Data): Promise<void> }

export type Status = 'draft' | 'active' | 'done' | 'dropped'

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
      if (m.status !== 'draft') throw new Error('First step is fixed once active')
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

  /** ms left on the Five-minute clock, derived from createdAt; undefined once the First step is done. */
  countdown(id: string): number | undefined {
    const m = this.get(id)
    if (m.steps[0]?.outcome) return undefined
    return Math.max(0, m.createdAt + FIVE_MIN - this.clock.now())
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
    if (m.status !== 'draft' && m.status !== 'active') throw new Error('Already closed')
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

  /** Ready-to-send Thai sentence for the Assigner; four fixed templates by state. */
  statusSentence(id: string): string | undefined {
    const m = this.get(id)
    const what = `เรื่อง “${m.instruction}”`
    const step = m.steps.findLast((s) => s.text.trim())?.text
    const replan = m.replans.at(-1)
    if (m.status === 'dropped') return undefined
    if (m.status === 'done') {
      const assigner = this.person(m.assignerId)
      return `${assigner ? `${assigner.name}ครับ ` : ''}${what} เสร็จเรียบร้อยแล้วครับ`
    }
    if (replan) {
      const why = replan.reason === 'other' && replan.note ? replan.note : replanReasonLabels[replan.reason]
      return `${what} ต้องปรับแผนเพราะ${why}ครับ ตอนนี้เปลี่ยนมาทำ “${step}” ครับ`
    }
    if (m.steps[0]?.outcome === 'done') return `${what} กำลังดำเนินการอยู่ครับ ตอนนี้กำลังทำ “${step}” ครับ`
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

function onTime(m: Mission, now: number): boolean | undefined {
  const first = m.steps[0]
  if (first?.outcome === 'done') return first.doneAt! - m.createdAt <= FIVE_MIN
  if (first?.outcome || m.status === 'done' || m.status === 'dropped' || now >= m.createdAt + FIVE_MIN) return false
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
