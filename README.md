# @mirafive/sdk-vue

MIRA FIVE for Vue 3: a plugin and a composable around `@mirafive/sdk-browser`.
Privacy-first analytics from MIRA FIVE, hosted in the EU.

## Size

| Import | min + gzip |
|---|---|
| `@mirafive/sdk-vue` (`createMiraPlugin`, `useMira`) | 0.26 kB |

Vue and `@mirafive/sdk-browser` are peers and not counted; the browser SDK's own sizes
are in its README (core with pageviews 2.31 kB). What you do not import is not shipped
(`sideEffects: false`). This package has no transport: it hands
you the client you created.

## Install

```sh
npm install @mirafive/sdk-vue @mirafive/sdk-browser
# or: bun add / pnpm add / yarn add
```

Peers: `vue` ≥ 3.5, `@mirafive/sdk-browser` ^1.0.0. ESM only. On Nuxt use
`@mirafive/sdk-nuxt`, which wires all of this for you.

## Quickstart

```ts
// main.ts
import { createMira } from "@mirafive/sdk-browser"
import { pageviews } from "@mirafive/sdk-browser/pageviews"
import { createMiraPlugin } from "@mirafive/sdk-vue"
import { createApp } from "vue"

import App from "./App.vue"

const mira = createMira({ key: import.meta.env.VITE_MIRAFIVE_KEY, plugins: [pageviews()] })

createApp(App).use(createMiraPlugin(mira)).mount("#app")
```

```vue
<script setup lang="ts">
import { useMira } from "@mirafive/sdk-vue"

const mira = useMira()
</script>

<template>
  <button @click="mira.track('checkout started')">Checkout</button>
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
  your consent manager: `useMira().consent({ statistics })`.
  Before the answer nothing is sent or stored.
- Statistics is the only consent purpose. The old `experiments` and `targeting` keys are accepted and ignored.
- Do Not Track, Global Privacy Control, `window.__mirafive_ignore` and prerendering send
  nothing (handled by `@mirafive/sdk-browser`).
- This package stores and reads nothing.

## API reference

```ts
import { createMiraPlugin, useMira } from "@mirafive/sdk-vue"
import type { Json, Mira } from "@mirafive/sdk-vue"
```

| Export | |
|---|---|
| `createMiraPlugin(client)` | the Vue plugin: `app.use(createMiraPlugin(mira))`. `client` is a `createMira()` client, or `undefined` on a server. `app.unmount()` destroys the client. |
| `useMira<Events>(): Mira<Events>` | the client. During a server render a stand-in whose members do nothing and whose reads answer the fallback (not a thenable, so `await` is safe). Throws when the plugin is not installed. |

## Framework / runtime notes

- **SSR.** On the server there is no client: install `createMiraPlugin(undefined)`. The
  composable then returns the stand-in, so a server render sends nothing.
- Create the client in the browser only (`createMira` needs `window`), once per page.
- Outside components (Pinia stores, composables run in `app.runWithContext`), `useMira()` works the same.
- Typed events: `useMira<{ signup: { plan: string } }>().track("signup", { plan: "pro" })`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Nothing arrives | On `localhost` pass `trackLocalhost: true` to `createMira`; check Do Not Track / GPC; in mode `"full"` a `consent(…)` call must have run; check `host`. |
| `403 secret_key_in_path` / `website_key_as_bearer` | You passed a secret key to the browser. Use the website key (`mf_…`). |
| `403 origin_not_allowed` | Add the site's origin to the source's allowed origins in MIRA FIVE. |
| `[mirafive] install the plugin first` | `app.use(createMiraPlugin(mira))` is missing, or `useMira()` ran outside a component or `app.runWithContext`. |

## For AI agents

Copy-paste setup prompt:

```text
Add MIRA FIVE analytics to this Vue 3 app with @mirafive/sdk-vue.
1. Install @mirafive/sdk-vue and @mirafive/sdk-browser with the project's package manager.
2. Put the source's website key in VITE_MIRAFIVE_KEY (public). Never use MIRAFIVE_SECRET_KEY
   in browser code.
3. In the client entry (main.ts), before mount:
     import { createMira } from "@mirafive/sdk-browser"
     import { pageviews } from "@mirafive/sdk-browser/pageviews"
     import { createMiraPlugin } from "@mirafive/sdk-vue"
     const mira = createMira({ key: import.meta.env.VITE_MIRAFIVE_KEY, plugins: [pageviews()] })
     app.use(createMiraPlugin(mira))
   Do not add pageview calls to router hooks.
4. In components: const mira = useMira(); mira.track("name", { … }) in handlers.
5. Keep the default consentless mode: it needs no banner. Only with an existing consent
   manager: add identity() from "@mirafive/sdk-browser/identity", pass mode: "full", and
   call mira.consent({ statistics }) from its callback.
6. Verify: load a page (not localhost, or trackLocalhost: true) and check the network tab
   for POST https://events.mirafive.io/v1/batch/<key> answering 202; report what you changed.
Do not add other analytics libraries, cookies or consent banners.
```

Facts for agents:

- Imports: `import { createMiraPlugin, useMira } from "@mirafive/sdk-vue"`;
  the client from `import { createMira } from "@mirafive/sdk-browser"` and plugins from
  `@mirafive/sdk-browser/pageviews`, `/identity`, `/autocapture`, and `/search`. No default exports.
- Env vars: `VITE_MIRAFIVE_KEY` (the public website key, passed as `key`); a custom host
  is passed as `createMira({ host })`. `MIRAFIVE_SECRET_KEY` only in server code with
  `@mirafive/sdk-server`.
- A secret key must never reach the browser bundle; `createMira` throws for a `secretKey`
  option and the server refuses a secret key in a URL.
- Consentless (default) needs no banner and stores nothing. `mode: "full"` needs
  `identity()` and a `consent(…)` call behind the site's consent manager (CMP).
- SSR: `createMiraPlugin(undefined)` on the server.
- Nothing throws for transport reasons; the browser SDK warns once on local hosts.
- Verify an install: `POST …/v1/batch/{key}` answers `202 { "accepted": n }` in the
  network tab, and the event shows in the source's live view.
- Wire contract: [mirafive/protocol](https://github.com/mirafive/protocol).

## License

[MIT](LICENSE) © 2026 Cloo GmbH
