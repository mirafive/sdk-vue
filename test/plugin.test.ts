import type { Mira } from "@mirafive/sdk-browser"
import { renderToString } from "@vue/server-renderer"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createApp, createSSRApp, defineComponent, h } from "vue"

import { createMiraPlugin, useMira } from "../src/index.ts"

const fake = () => {
  const client = { track: vi.fn(), destroy: vi.fn() }

  return { client: client as unknown as Mira, track: client.track, destroy: client.destroy }
}

const mountIn = () => {
  const container = document.createElement("div")

  document.body.append(container)

  return container
}

afterEach(() => {
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

describe("server render", () => {
  it("lets a server render await the stand-in client", async () => {
    const Awaiting = defineComponent({
      async setup() {
        // oxlint-disable-next-line typescript/await-thenable -- callers do this; it must not hang
        const mira = await useMira()

        return () => h("i", mira.config("x", "fb"))
      }
    })

    expect(await renderToString(createSSRApp(Awaiting).use(createMiraPlugin(undefined)))).toBe("<i>fb</i>")
  })

  it("gives a stand-in client whose calls do nothing", async () => {
    const Tracking = defineComponent({
      setup() {
        const mira = useMira()

        mira.track("rendered")

        return () => h("i", String(mira.anonymousId()))
      }
    })

    expect(await renderToString(createSSRApp(Tracking).use(createMiraPlugin(undefined)))).toBe(
      "<i>undefined</i>"
    )
  })
})

describe("client", () => {
  it("returns the client from useMira", () => {
    const { client } = fake()
    let seen: unknown
    const Reader = defineComponent({
      setup() {
        seen = useMira()

        return () => h("i")
      }
    })

    createApp(Reader).use(createMiraPlugin(client)).mount(mountIn())

    expect(seen).toBe(client)
  })

  it("destroys the client on unmount", () => {
    const { client, destroy } = fake()
    const app = createApp(defineComponent({ render: () => h("i") })).use(createMiraPlugin(client))

    app.mount(mountIn())
    app.unmount()

    expect(destroy).toHaveBeenCalledOnce()
  })

  it("throws a setup hint without the plugin", () => {
    const app = createApp(defineComponent({ setup: () => useMira() }))

    app.config.warnHandler = () => {}

    expect(() => app.mount(mountIn())).toThrow(/createMiraPlugin/)
  })
})
