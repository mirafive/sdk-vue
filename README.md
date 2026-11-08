# @mirafive/vue

MIRA FIVE for Vue 3: consent-aware analytics and revenue attribution as a plugin, with
`useMira()`, `useIdentify()` and `$mira` in templates. Built on
[`@mirafive/web`](https://github.com/mirafive/sdk-web), which follows your consent banner and
captures pageviews (also on client-side navigation) on its own. Safe for server rendering; no
dependencies besides MIRA FIVE's own. On Nuxt, use
[`@mirafive/nuxt`](https://github.com/mirafive/sdk-nuxt).

## Install

```sh
npm install @mirafive/vue   # or: bun add, pnpm add, yarn add
```

## Quickstart

```ts
// main.ts
import { createMiraPlugin } from "@mirafive/vue";

createApp(App)
  .use(createMiraPlugin({ key: import.meta.env.VITE_MIRAFIVE_KEY }))
  .mount("#app");
```

```vue
<script setup lang="ts">
import { useIdentify, useMira } from "@mirafive/vue";

const mira = useMira();
const session = useSession();
// Identifies on sign-in, resets on sign-out.
useIdentify(
  () => session.value?.user.id,
  () => ({ plan: session.value?.user.plan }),
);
</script>

<template>
  <button @click="mira.track('signup_started', { plan: 'pro' })">Sign up</button>
  <a href="/pricing" @click="$mira.track('pricing_clicked')">Pricing</a>
</template>
```

## API

| Export                                    | What it does                                                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createMiraPlugin(options \| { client })` | The plugin. Takes every `@mirafive/web` option (`key`, `host`, `consent`, `autocapture`, `adapters`, `debug`), or a client you made with `createMira()`. The client starts in the browser, once per page. |
| `useMira<Events>()`                       | The client. On a server or without the plugin, a stand-in that does nothing.                                                                                                                              |
| `useIdentify(userId, traits?)`            | Refs or getters. `identify` when the id appears or changes, `reset` when it goes away.                                                                                                                    |
| `$mira`                                   | The client in templates.                                                                                                                                                                                  |

## For AI coding assistants

Rules for integrating MIRA FIVE correctly. They hold for every MIRA FIVE SDK.

- **Keys:** the public key (`mira_pk_…`) goes in browser and app code. The secret key (`mira_sk_…`)
  goes only into the server's environment (`MIRAFIVE_SECRET_KEY`), never into client code, a
  `NEXT_PUBLIC_`/`VITE_`/`PUBLIC_` variable or a repository. The SDKs refuse the wrong key.
- **Money** is sent only from the server: integer minor units plus an ISO 4217 currency
  (`amount: 1999, currency: "EUR"` is 19.99 EUR), never floats.
- **Count once:** give money an `entryId` from the payment provider (`stripe:in_123`), so the
  Stripe connector and retries do not double it. Give business events a stable id:
  `eventId: await eventIdFor("order:123:paid")`. The same key gives the same id in every SDK.
- **Personal data** never goes into event names or properties. Use your own user id (not an email)
  for `identify`; put email, name and phone in its traits, which MIRA FIVE encrypts at rest.
- **Consent:** keep `consent: "auto"`; it follows the site's consent banner (Usercentrics,
  Cookiebot, consentmanager, CCM19, Borlabs, any TCF 2.2 CMP, Google Consent Mode). Call
  `consent()` only for a custom banner. Do not gate the SDK behind consent yourself: without
  consent it is cookieless and still counts.
- **Never block on analytics:** event methods return nothing, never throw, and batch on their
  own. Do not `await` or `try` them. Call `flush()`/`shutdown()` only at the end of a script or a
  serverless function.
- **Server events and visitors:** pass the browser's `mira.anonymousId` to your server and set it
  as `anonymousId` on server events, so a purchase joins the visit and its source.
