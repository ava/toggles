import { Noun, createNounFromState } from './nouns'

interface GlobalToggleEntry {
  noun: Noun
  state: boolean
  subscribers: Set<() => void>
  refCount: number
  lastAccessed: number
  initialValue?: boolean
  initializationStack?: string
}

export class GlobalNounStore {
  private toggles: Map<string, GlobalToggleEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private readonly TTL = 5 * 60 * 1000 // 5 minutes Time To Live

  constructor() {
    this.startCleanupTimer()
  }

  private startCleanupTimer() {
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 60 * 1000) // Run cleanup every minute
    }
  }

  private cleanup() {
    const now = Date.now()
    const toDelete: string[] = []

    this.toggles.forEach((entry, name) => {
      // Only cleanup if no active references and TTL exceeded
      if (entry.refCount === 0 && now - entry.lastAccessed > this.TTL) {
        toDelete.push(name)
      }
    })

    toDelete.forEach(name => this.toggles.delete(name))
  }

  get(name: string, initialValue = false): Noun {
    let entry = this.toggles.get(name)
    
    if (!entry) {
      entry = {
        noun: null as any,
        state: initialValue,
        subscribers: new Set(),
        refCount: 0,
        lastAccessed: Date.now(),
        initialValue: initialValue,
        initializationStack: new Error().stack
      }

      entry!.noun = createNounFromState(
        name,
        () => entry!.state,
        (newState: boolean) => {
          entry!.state = newState
          entry!.subscribers.forEach(callback => callback())
        }
      )

      this.toggles.set(name, entry)
    } else {
      // Check for initial value conflict
      if (entry.initialValue !== undefined && entry.initialValue !== initialValue) {
        console.error(
          `Global toggle "${name}" initialized with conflicting values!\n` +
          `First initialization: ${entry.initialValue}\n` +
          `${entry.initializationStack}\n\n` +
          `Second initialization: ${initialValue}\n` +
          `${new Error().stack}`
        )
      }
    }

    entry.lastAccessed = Date.now()
    return entry.noun
  }

  acquire(name: string): void {
    const entry = this.toggles.get(name)
    if (entry) {
      entry.refCount++
    }
  }

  release(name: string): void {
    const entry = this.toggles.get(name)
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1)
    }
  }

  subscribe(name: string, callback: () => void): () => void {
    const entry = this.toggles.get(name)
    if (!entry) {
      throw new Error(`Toggle "${name}" not found in global nouns`)
    }

    entry.subscribers.add(callback)
    return () => entry.subscribers.delete(callback)
  }

  clear(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.toggles.clear()
    this.startCleanupTimer()
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.toggles.clear()
  }

  has(name: string): boolean {
    return this.toggles.has(name)
  }
}

export const globalNouns = new GlobalNounStore()