# Changelog

## Unreleased

- Revenue events may carry `payment_id`, the payment provider's id of the payment (1–255 characters), next to `revenue` and `currency`. Nothing changes in the API: pass it in the properties. The README shows a Stripe example.
- The default ingest host is `https://collect.mirafive.io`.

### Breaking

- Removed feature flags and A/B experiments: `useFlag()`, `useFlagConfig()`, the `FlagBootstrap`
  type, the `MiraPluginOptions` type and the `bootstrap` option of `createMiraPlugin()`
  (it now takes only the client). `createMiraPlugin()` and `useMira()` stay. The stand-in
  client of a server render no longer has `onFlags`.
- Statistics is the only consent purpose. A consent call that still passes `experiments` or
  `targeting` is accepted and the keys are ignored.

## 1.0.0 — 2026-09-27

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
