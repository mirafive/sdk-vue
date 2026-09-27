# Changelog

## 0.5.0 — unreleased

First release on the v1 protocol, rebuilt from scratch as a thin layer over
`@mirafive/sdk-browser`.

- `createMiraPlugin(client, { bootstrap? })`: provides the client to the app and destroys
  it on `app.unmount()`; takes `undefined` and a flag bootstrap (object or
  `user.bootstrap()` HTML) on a server.
- `useMira()`: the client, or a do-nothing stand-in during a server render.
- `useMira()` stand-in is not a thenable, so `await useMira()` resolves.
- `useFlag(key, fallback)` and `useFlagConfig(key, fallback)`: readonly refs holding exactly
  what `mira.flag()`/`mira.config()` answer, following flag loads; they answer the
  bootstrap (ignored after 7 days, like sdk-browser) during SSR and hydration so both
  renders match, and stop listening with their scope (components, stores, effect scopes).
- Vue ≥ 3.5.
- 0.68 kB min+gzip with Vue and sdk-browser as peers. No router integration: sdk-browser's
  `pageviews()` covers every router.
