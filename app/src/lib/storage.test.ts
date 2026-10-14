import { afterEach, describe, expect, it, vi } from "vitest"

async function loadStorage() {
  vi.resetModules()
  return (await import("./storage")).storage
}

describe("storage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("falls back to memory when localStorage throws", async () => {
    const storage = await loadStorage()
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied")
    })
    storage.set("x", 1)
    expect(storage.get("x", 0)).toBe(1)
    expect(storage.isPersistent()).toBe(false)
  })

  it("prefixes keys", async () => {
    const storage = await loadStorage()
    storage.set("theme", "dark")
    expect(localStorage.getItem("babttae.theme")).toBe('"dark"')
    expect(storage.isPersistent()).toBe(true)
  })

  it("returns the fallback when the key is missing or corrupt", async () => {
    const storage = await loadStorage()
    expect(storage.get("missing", "dflt")).toBe("dflt")
    localStorage.setItem("babttae.bad", "{not json")
    expect(storage.get("bad", 7)).toBe(7)
  })

  it("keeps using memory after a failure", async () => {
    const storage = await loadStorage()
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("denied")
      })
    storage.set("a", 1)
    spy.mockRestore()
    storage.set("b", 2)
    expect(localStorage.getItem("babttae.b")).toBeNull()
    expect(storage.get("b", 0)).toBe(2)
    expect(storage.get("a", 0)).toBe(1)
  })
})
