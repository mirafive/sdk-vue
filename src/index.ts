import type { EventMap, Mira } from "@mirafive/sdk-browser"
import { inject } from "vue"
import type { InjectionKey, Plugin } from "vue"

export type { Json, Mira } from "@mirafive/sdk-browser"

interface Holder {
  client: Mira | undefined
}

const holderKey: InjectionKey<Holder> = Symbol("mirafive")

// Stands in for the client during a server render, where there is none.
const inert = new Proxy<Mira>(Object.create(null), {
  get: (_, name) =>
    // Not a thenable, so `await useMira()` resolves.
    name === "then"
      ? undefined
      : name === "flush"
        ? () => Promise.resolve()
        : (_key: unknown, fallback?: unknown) => fallback
})

/** `app.use(createMiraPlugin(mira))`; on a server, `createMiraPlugin(undefined)`. Unmounting the app destroys the client. */
export const createMiraPlugin = <Events extends EventMap = EventMap>(
  client: Mira<Events> | undefined
): Plugin => ({
  install(app) {
    const unmount = app.unmount.bind(app)

    app.provide(holderKey, { client })

    app.unmount = () => {
      client?.destroy()
      unmount()
    }
  }
})

/** The client; during a server render a stand-in that does nothing and answers fallbacks. */
export const useMira = <Events extends EventMap = EventMap>(): Mira<Events> => {
  const holder = inject(holderKey, undefined)

  if (!holder) {
    throw new Error("[mirafive] install the plugin first: app.use(createMiraPlugin(mira))")
  }

  return holder.client ?? inert
}
