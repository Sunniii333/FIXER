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
  replans: never[]
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

export type Person = { id: string; name: string; canHelpWith: string[]; note?: string }

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
