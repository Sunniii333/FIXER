import type { Clock, Data, Storage } from './fixer'

export function fakeClock(start: number) {
  let t = start
  return {
    now: () => t,
    advance: (ms: number) => void (t += ms),
    set: (ms: number) => void (t = ms),
  } satisfies Clock & Record<string, unknown>
}

export function memoryStorage(initial?: Data) {
  let saved = initial && structuredClone(initial)
  return {
    load: async () => saved && structuredClone(saved),
    save: async (data: Data) => void (saved = structuredClone(data)),
  } satisfies Storage
}
