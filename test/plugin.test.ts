import type { Json, Mira } from "@mirafive/sdk-browser"
import { createMira } from "@mirafive/sdk-browser"
import { flags } from "@mirafive/sdk-browser/flags"
import { renderToString } from "@vue/server-renderer"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createApp, createSSRApp, defineComponent, h, nextTick } from "vue"

import { createMiraPlugin, useFlag, useFlagConfig, useMira } from "../src/index.ts"

type Answers = Record<string, readonly [string | boolean, Json?]>

const bootstrap = {
  v: 1 as const,
  at: Date.now(),
  values: { "new-checkout": ["on"], hero: ["b"], limits: ["pro", { max: 3 }] } as const
}
const block = `<script type="application/json" id="mirafive-flags">${JSON.stringify(bootstrap)}</script>`

const Probe = defineComponent({
  setup() {
    const checkout = useFlag("new-checkout", false)
    const hero = useFlag("hero", "a")
    const limits = useFlagConfig("limits", { max: 1 })

    return () => h("p", `${checkout.value}|${hero.value}|${limits.value.max}`)
  }
})

const fake = (answers: Answers) => {
  const listeners = new Set<() => void>()
  let current = answers
  const client = {
    flag: (key: string, fallback: unknown) => current[key]?.[0] ?? fallback,
    config: (key: string, fallback: unknown) => current[key]?.[1] ?? fallback,
    onFlags: (listener: () => void) => {
      listeners.add(listener)

      return () => listeners.delete(listener)
    },
    destroy: vi.fn()
  }

  return {
    client: client as unknown as Mira,
    listeners,
    load: (next: Answers) => {
      current = next
      listeners.forEach((listener) => listener())
    }
  }
}

const mountIn = (html = "") => {
  const container = document.createElement("div")

  container.innerHTML = html
  document.body.append(container)

  return container
}

afterEach(() => {
  document.head.innerHTML = ""
  document.body.innerHTML = ""
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("server render and hydration", () => {
  it("renders the bootstrap on the server and hydrates to the same markup", async () => {
    const html = await renderToString(
      createSSRApp(Probe).use(createMiraPlugin(undefined, { bootstrap: block }))
    )

    expect(html).toBe("<p>true|b|3</p>")

    document.head.innerHTML = block

    const warn = vi.spyOn(console, "warn")
    const { client } = fake({ "new-checkout": [false], hero: ["a"], limits: ["free", { max: 1 }] })
    const container = mountIn(html)

    createSSRApp(Probe).use(createMiraPlugin(client)).mount(container)

    expect(container.innerHTML).toBe("<p>true|b|3</p>")
    expect(warn.mock.calls.flat().join()).not.toMatch(/mismatch/i)

    await nextTick()

    expect(container.innerHTML).toBe("<p>false|a|1</p>")
  })

  it("hydrates a real client from the page's block without a change", async () => {
    const html = await renderToString(createSSRApp(Probe).use(createMiraPlugin(undefined, { bootstrap })))

    document.head.innerHTML = block

    const mira = createMira({ key: "mf_test", plugins: [flags()] })
    const container = mountIn(html)
    const app = createSSRApp(Probe).use(createMiraPlugin(mira))

    app.mount(container)
    await nextTick()

    expect(container.innerHTML).toBe("<p>true|b|3</p>")
    app.unmount()
  })

  it("answers fallbacks and a stand-in client without a bootstrap", async () => {
    const Tracking = defineComponent({
      setup() {
        const mira = useMira()

        mira.track("rendered")

        return () => h("i", `${String(mira.flag("x", "fb"))}|${String(mira.anonymousId())}`)
      }
    })

    expect(await renderToString(createSSRApp(Probe).use(createMiraPlugin(undefined)))).toBe(
      "<p>false|a|1</p>"
    )
    expect(await renderToString(createSSRApp(Tracking).use(createMiraPlugin(undefined)))).toBe(
      "<i>fb|undefined</i>"
    )
  })
})

describe("client", () => {
  it("starts from the client's answers and follows flag loads", async () => {
    const { client, load } = fake({ "new-checkout": [true], hero: ["c"], limits: ["pro", { max: 5 }] })
    const container = mountIn()

    createApp(Probe).use(createMiraPlugin(client)).mount(container)

    expect(container.innerHTML).toBe("<p>true|c|5</p>")

    load({ "new-checkout": [false], hero: [true] })
    await nextTick()

    expect(container.innerHTML).toBe("<p>false|a|1</p>")
  })

  it("updates when a real client loads newer flags", async () => {
    document.head.innerHTML = block.replace(/"at":\d+/, `"at":${Date.now() - 120_000}`)

    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ v: 1, at: Date.now(), values: { "new-checkout": ["off"] } }))
    )

    vi.stubGlobal("fetch", fetch)

    const mira = createMira({ key: "mf_test", plugins: [flags()] })
    const container = mountIn()
    const app = createApp(Probe).use(createMiraPlugin(mira))

    app.mount(container)

    expect(container.innerHTML).toBe("<p>true|b|3</p>")

    await vi.waitFor(() => expect(container.innerHTML).toBe("<p>false|a|1</p>"))
    expect(fetch).toHaveBeenCalledOnce()
    app.unmount()
  })

  it("removes its listeners and destroys the client on unmount", () => {
    const { client, listeners } = fake({})
    const app = createApp(Probe).use(createMiraPlugin(client))

    app.mount(mountIn())

    expect(listeners.size).toBe(3)

    app.unmount()

    expect(listeners.size).toBe(0)
    expect(client.destroy).toHaveBeenCalledOnce()
  })

  it("throws a setup hint without the plugin", () => {
    const app = createApp(defineComponent({ setup: () => useMira() }))

    app.config.warnHandler = () => {}

    expect(() => app.mount(mountIn())).toThrow(/createMiraPlugin/)
  })
})
