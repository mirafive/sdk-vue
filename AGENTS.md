# Agents working in mirafive/sdk-vue

`@mirafive/sdk-vue`: the Vue 3 plugin and composables around `@mirafive/sdk-browser`.
Part of the MIRA FIVE SDK family; the wire contract, flag semantics and public API live
in [mirafive/protocol](https://github.com/mirafive/protocol) (PROTOCOL.md, FLAGS.md,
API.md).

## Commands

```sh
bun install --frozen-lockfile
bun run check            # format, lint, typecheck, test, build, publint, attw, size-limit
bun run test             # vitest (happy-dom, @vue/server-renderer)
bun run size             # size-limit against the limit in package.json (0.8 kB, peers excluded)
```

## Rules

- API.md is the contract for this package's public surface. Do not add, rename or
  remove exports without changing API.md first.
- Thin by design: no transport, no flag evaluator, no pageview logic. Pageviews come from
  sdk-browser's `pageviews()` plugin (it covers Vue Router); never add router hooks.
- sdk-browser is imported for types only; the built `dist/index.js` imports nothing but
  `vue`. Keep it that way.
- Flag refs answer the bootstrap during a server render and during hydration (detected by
  the instance's `vnode.el` being set in setup), then the live client. The SSR → hydrate
  test in `test/plugin.test.ts` fails if that detection breaks.
- Bundle size is the headline goal (≤ 0.8 kB min+gzip). A change that grows it explains
  why. No runtime dependencies without approval.
- `context.sdk` stays what sdk-browser reports; framework packages add no token.
- A secret key never reaches browser code.
- Comments only for a non-obvious constraint, one or two lines.
- Do not run git write commands unless asked; the maintainer commits.

## Local development

`@mirafive/sdk-browser` is unpublished: `devDependencies` and `overrides` point at
`file:../sdk-browser` (build its `dist` first). Once 0.5.0 is on npm, switch both to
`^0.5.0` and drop `overrides`; CI cannot install until then.
