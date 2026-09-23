import { fakeClock, memoryStorage } from '../core/fakes'
import type { Ports } from './App'

export const T0 = new Date(2026, 8, 1, 10, 0).getTime()

export function fakePorts(start = T0) {
  return { clock: fakeClock(start), storage: memoryStorage() } satisfies Ports
}
