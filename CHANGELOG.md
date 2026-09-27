# Changelog

## 0.5.0 — unreleased

First release on the v1 protocol, rebuilt from scratch as a thin layer over
`@mirafive/sdk-browser`.

- `createMiraPlugin(client, { bootstrap? })`: provides the client to the app and destroys
  it on `app.unmount()`; takes `undefined` and a flag bootstrap (object or
  `user.bootstrap()` HTML) on a server.
- `useMira()`: the client, or a do-nothing stand-in during a server render.
- `useFlag(key, fallback)` and `useFlagConfig(key, fallback)`: readonly refs that follow
  flag loads, answer the bootstrap during SSR and hydration so both renders match, and
  stop listening with their scope.
- 0.67 kB min+gzip with Vue and sdk-browser as peers. No router integration: sdk-browser's
  `pageviews()` covers every router.
