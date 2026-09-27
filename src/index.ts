import type { EventMap, FlagBootstrap, Json, Mira } from "@mirafive/sdk-browser"
import { getCurrentInstance, inject, onMounted, onScopeDispose, shallowRef } from "vue"
import type { InjectionKey, Plugin, Ref } from "vue"

export type { FlagBootstrap, Json, Mira } from "@mirafive/sdk-browser"

export interface MiraPluginOptions {
  /** The flag answers of a server render: the object or `user.bootstrap()`'s HTML. A browser reads the page's block when left out. */
  bootstrap?: FlagBootstrap | string | undefined
}

type Answer = FlagBootstrap["values"][string]

interface Holder {
  client: Mira | undefined
  boot: () => FlagBootstrap | undefined
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
        : name === "onFlags"
          ? () => () => {}
          : (_key: unknown, fallback?: unknown) => fallback
})

// sdk-browser ignores a block older than 7 days; so do the renders that must match it.
const fresh = (bootstrap: FlagBootstrap | undefined): FlagBootstrap | undefined =>
  bootstrap?.v === 1 && Date.now() - bootstrap.at < 6048e5 ? bootstrap : undefined

const parse = (text: string | null | undefined): FlagBootstrap | undefined => {
  try {
    const bootstrap: FlagBootstrap = JSON.parse(
      text?.[0] === "<" ? text.slice(text.indexOf(">") + 1, text.lastIndexOf("<")) : (text ?? "")
    )

    return fresh(bootstrap)
  } catch {
    return undefined
  }
}

/** `app.use(createMiraPlugin(mira))`; on a server, `createMiraPlugin(undefined, { bootstrap })`. Unmounting the app destroys the client. */
export const createMiraPlugin = <Events extends EventMap = EventMap>(
  client: Mira<Events> | undefined,
  options: MiraPluginOptions = {}
): Plugin => ({
  install(app) {
    let boot: [FlagBootstrap | undefined] | undefined
    const unmount = app.unmount.bind(app)

    app.provide(holderKey, {
      client,
      boot: () =>
        (boot ??= [
          typeof options.bootstrap === "object"
            ? fresh(options.bootstrap)
            : parse(
                options.bootstrap ??
                  (typeof document === "undefined"
                    ? undefined
                    : document.getElementById("mirafive-flags")?.textContent)
              )
        ])[0]
    })

    app.unmount = () => {
      client?.destroy()
      unmount()
    }
  }
})

const useHolder = (): Holder => {
  const holder = inject(holderKey, undefined)

  if (!holder) {
    throw new Error("[mirafive] install the plugin first: app.use(createMiraPlugin(mira))")
  }

  return holder
}

/** The client; during a server render a stand-in that does nothing and answers fallbacks. */
export const useMira = <Events extends EventMap = EventMap>(): Mira<Events> => useHolder().client ?? inert

const flagRef = <T>(
  key: string,
  fallback: T,
  live: (client: Mira) => T,
  booted: (answer: Answer) => T
): Readonly<Ref<T>> => {
  const { client, boot } = useHolder()
  // A server render and the hydration after it answer the bootstrap, so both render the same.
  const hydrating = !!getCurrentInstance()?.vnode.el
  const answer = boot()?.values[key]
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- shallowRef's conditional type stays open for a generic T
  const value = shallowRef(client && !hydrating ? live(client) : answer ? booted(answer) : fallback) as Ref<T>
  let off: (() => unknown) | undefined
  const start = (): void => {
    if (client) {
      off = client.onFlags(() => (value.value = live(client)))
      value.value = live(client)
    }
  }

  if (hydrating) {
    onMounted(start)
  } else {
    start()
  }

  onScopeDispose(() => off?.(), true)

  return value
}

/** What `mira.flag(key, fallback)` answers, as a ref that follows flag loads: the variant, or `true`/`false` for an on/off flag. */
export const useFlag = (key: string, fallback: string | boolean): Readonly<Ref<string | boolean>> =>
  flagRef<string | boolean>(
    key,
    fallback,
    (client) => client.flag(key, fallback),
    ([variant]) => variant === "on" || (variant !== "off" && variant)
  )

/** What `mira.config(key, fallback)` answers, as a ref that follows flag loads. */
export const useFlagConfig = <T = Json>(key: string, fallback: T): Readonly<Ref<T>> =>
  flagRef(
    key,
    fallback,
    (client) => client.config(key, fallback),
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the caller names the config's type
    (answer) => (answer[1] ?? fallback) as T
  )
