const PREFIX = "babttae."

const memory = new Map<string, string>()
let persistent = true

function fail() {
  persistent = false
}

function read(key: string): string | null {
  if (persistent) {
    try {
      return localStorage.getItem(PREFIX + key)
    } catch {
      fail()
    }
  }
  return memory.get(key) ?? null
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    const raw = read(key)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  set<T>(key: string, value: T): void {
    const raw = JSON.stringify(value)
    if (persistent) {
      try {
        localStorage.setItem(PREFIX + key, raw)
        return
      } catch {
        fail()
      }
    }
    memory.set(key, raw)
  },

  isPersistent(): boolean {
    return persistent
  },
}
