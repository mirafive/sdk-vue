# @mirafive/sdk-vue

MIRA FIVE for Vue 3: a plugin and composables around `@mirafive/sdk-browser`, with flag
refs that render the same on the server and in the browser. Privacy-first analytics and
feature flags from MIRA FIVE, hosted in the EU.

## Size

| Import | min + gzip |
|---|---|
| `@mirafive/sdk-vue` (`createMiraPlugin`, `useMira`, `useFlag`, `useFlagConfig`) | 0.68 kB |

Vue and `@mirafive/sdk-browser` are peers and not counted; the browser SDK's own sizes
are in its README (core with pageviews 2.31 kB). What you do not import is not shipped
(`sideEffects: false`). This package has no transport and no flag evaluator: it hands
you the client you created and reads flags from it.

## Install

```sh
npm install @mirafive/sdk-vue @mirafive/sdk-browser
# or: bun add / pnpm add / yarn add
```

Peers: `vue` ≥ 3.5, `@mirafive/sdk-browser` ^0.5.0. ESM only. On Nuxt use
`@mirafive/sdk-nuxt`, which wires all of this for you.

## Quickstart

```ts
// main.ts
import { createMira } from "@mirafive/sdk-browser"
import { pageviews } from "@mirafive/sdk-browser/pageviews"
import { flags } from "@mirafive/sdk-browser/flags"
import { createMiraPlugin } from "@mirafive/sdk-vue"
import { createApp } from "vue"

import App from "./App.vue"

const mira = createMira({ key: import.meta.env.VITE_MIRAFIVE_KEY, plugins: [pageviews(), flags()] })

createApp(App).use(createMiraPlugin(mira)).mount("#app")
```

```vue
<script setup lang="ts">
import { useFlag, useMira } from "@mirafive/sdk-vue"

const mira = useMira()
const newCheckout = useFlag("new-checkout", false)
</script>

<template>
  <button @click="mira.track('checkout started')">{{ newCheckout ? "Pay now" : "Checkout" }}</button>
</template>
```

`pageviews()` follows Vue Router (and any other router) through the History and
Navigation APIs; do not add pageview calls to router hooks.

Verify it: open the site (not `localhost`, or pass `trackLocalhost: true` to
`createMira`) and look for `POST https://events.mirafive.io/v1/batch/mf_…` answering
`202` in the network tab, then for the pageview in the source's live view in MIRA FIVE.

## Consent & privacy

- Default mode: `consentless` (the browser SDK's default). No cookies, no storage, no ids,
  no language, time zone or screen size; it needs no consent banner.
- `mode: "full"` adds ids and needs `identity()` in `plugins` and a consent answer from
  your consent manager: `useMira().consent({ statistics, experiments, targeting })`.
  Before the answer nothing is sent or stored.
- Do Not Track, Global Privacy Control, `window.__mirafive_ignore` and prerendering send
  nothing (handled by `@mirafive/sdk-browser`).
- This package stores nothing and reads only the page's
  `<script type="application/json" id="mirafive-flags">` block.

## API reference

```ts
import { createMiraPlugin, useFlag, useFlagConfig, useMira } from "@mirafive/sdk-vue"
import type { FlagBootstrap, Json, Mira, MiraPluginOptions } from "@mirafive/sdk-vue"
```

| Export | |
|---|---|
| `createMiraPlugin(client, options?)` | the Vue plugin: `app.use(createMiraPlugin(mira))`. `client` is a `createMira()` client, or `undefined` on a server. `options.bootstrap`: the server's flag answers, as the `FlagBootstrap` object or the HTML of `user.bootstrap()`; in a browser it defaults to the page's `#mirafive-flags` block. `app.unmount()` destroys the client. |
| `useMira<Events>(): Mira<Events>` | the client. During a server render a stand-in whose members do nothing and whose `flag`/`config` answer the fallback (not a thenable, so `await` is safe). Throws when the plugin is not installed. |
| `useFlag(key, fallback: string \| boolean): Readonly<Ref<string \| boolean>>` | exactly what `mira.flag(key, fallback)` answers: `true`/`false` for an on/off flag, the variant for any other flag (whatever the fallback's type), `fallback` while unknown |
| `useFlagConfig<T = Json>(key, fallback: T): Readonly<Ref<T>>` | what `mira.config(key, fallback)` answers: the variant's remote-config value |

The flag refs update when flags load or change (`mira.onFlags`), stop listening when
their component or effect scope is disposed, and count experiment exposures the way
`mira.flag()` does (only reads of the live client count, never the bootstrap).

## Framework / runtime notes

- **SSR and hydration.** On the server there is no client: install
  `createMiraPlugin(undefined, { bootstrap })` with the bootstrap from
  `@mirafive/sdk-server/flags` and write the same block into the page's head:

  ```ts
  // server entry, per request
  import { bootstrapHeaders, MiraFlags } from "@mirafive/sdk-server/flags"

  const optedOut = request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1"
  const user = await flags.for({ userId, optedOut })
  const bootstrap = user.bootstrap()
  const app = createSSRApp(App).use(createMiraPlugin(undefined, { bootstrap }))
  // put `bootstrap` into <head>, send `bootstrapHeaders` (Cache-Control: private, no-store)
  ```

  During the server render and the hydration after it the refs answer the bootstrap, so
  both renders match; after the component mounts they switch to the live client. A
  component first mounted later reads the live client at once. A bootstrap older than 7
  days is ignored, as sdk-browser ignores it.
- Create the client in the browser only (`createMira` needs `window`), once per page.
- Outside components (Pinia stores, composables run in `app.runWithContext`), the refs
  follow the live client from the start (on a server: the bootstrap) and stop with the
  effect scope.
- Typed events: `useMira<{ signup: { plan: string } }>().track("signup", { plan: "pro" })`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Nothing arrives | On `localhost` pass `trackLocalhost: true` to `createMira`; check Do Not Track / GPC; in mode `"full"` a `consent(…)` call must have run; check `host`. |
| `403 secret_key_in_path` / `website_key_as_bearer` | You passed a secret key to the browser. Use the website key (`mf_…`). |
| `403 origin_not_allowed` | Add the site's origin to the source's allowed origins in MIRA FIVE. |
| A flag always returns its fallback | Not in this source's flags, flags not loaded yet (the ref updates when they are), or a segment rule without `targeting` consent. |
| Hydration mismatch on a flag | The server rendered without the same bootstrap the page carries: pass `user.bootstrap()` to `createMiraPlugin` on the server and put the identical block into the head. |
| `[mirafive] install the plugin first` | `app.use(createMiraPlugin(mira))` is missing, or `useMira()` ran outside a component or `app.runWithContext`. |

## For AI agents

Copy-paste setup prompt:

```text
Add MIRA FIVE analytics and feature flags to this Vue 3 app with @mirafive/sdk-vue.
1. Install @mirafive/sdk-vue and @mirafive/sdk-browser with the project's package manager.
2. Put the source's website key in VITE_MIRAFIVE_KEY (public). Never use MIRAFIVE_SECRET_KEY
   in browser code.
3. In the client entry (main.ts), before mount:
     import { createMira } from "@mirafive/sdk-browser"
     import { pageviews } from "@mirafive/sdk-browser/pageviews"
     import { flags } from "@mirafive/sdk-browser/flags"
     import { createMiraPlugin } from "@mirafive/sdk-vue"
     const mira = createMira({ key: import.meta.env.VITE_MIRAFIVE_KEY, plugins: [pageviews(), flags()] })
     app.use(createMiraPlugin(mira))
   Leave out flags() if the app reads no flags. Do not add pageview calls to router hooks.
4. In components: const mira = useMira(); mira.track("name", { … }) in handlers;
   const on = useFlag("key", false) for flags (a Ref).
5. Keep the default consentless mode: it needs no banner. Only with an existing consent
   manager: add identity() from "@mirafive/sdk-browser/identity", pass mode: "full", and
   call mira.consent({ statistics, experiments, targeting }) from its callback.
6. Verify: load a page (not localhost, or trackLocalhost: true) and check the network tab
   for POST https://events.mirafive.io/v1/batch/<key> answering 202; report what you changed.
Do not add other analytics libraries, cookies or consent banners.
```

Facts for agents:

- Imports: `import { createMiraPlugin, useMira, useFlag, useFlagConfig } from "@mirafive/sdk-vue"`;
  the client from `import { createMira } from "@mirafive/sdk-browser"` and plugins from
  `@mirafive/sdk-browser/pageviews`, `/identity`, `/autocapture`, `/search`, `/flags`,
  `/experiments`. No default exports.
- `useFlag` and `useFlagConfig` return readonly refs: use `.value` in script, bare in
  templates. `useFlag` answers exactly what `mira.flag()` does: `true`/`false` for on/off
  flags, the variant string for multivariate ones, even with a boolean fallback.
- Env vars: `VITE_MIRAFIVE_KEY` (the public website key, passed as `key`); a custom host
  is passed as `createMira({ host })`. `MIRAFIVE_SECRET_KEY` only in server code with
  `@mirafive/sdk-server`.
- A secret key must never reach the browser bundle; `createMira` throws for a `secretKey`
  option and the server refuses a secret key in a URL.
- Consentless (default) needs no banner and stores nothing. `mode: "full"` needs
  `identity()` and a `consent(…)` call behind the site's consent manager (CMP).
- SSR: `createMiraPlugin(undefined, { bootstrap: user.bootstrap() })` on the server, the
  same block in `<head>`, `Cache-Control: private, no-store` on that response.
- Nothing throws for transport reasons; the browser SDK warns once on local hosts.
- Verify an install: `POST …/v1/batch/{key}` answers `202 { "accepted": n }` in the
  network tab, and the event shows in the source's live view.
- Wire contract: [mirafive/protocol](https://github.com/mirafive/protocol).

## License

[MIT](LICENSE) © 2026 Cloo GmbH
