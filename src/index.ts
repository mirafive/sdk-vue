import {
  createMira,
  createNoopMira,
  type EventMap,
  type Mira,
  type MiraOptions,
} from "@mirafive/web";
/**
 * `@mirafive/vue`: MIRA FIVE for Vue 3.
 *
 * ```ts
 * import { createMiraPlugin } from "@mirafive/vue";
 *
 * app.use(createMiraPlugin({ key: import.meta.env.VITE_MIRAFIVE_KEY }));
 *
 * // in a component
 * const mira = useMira();
 * mira.track("signup_started", { plan: "pro" });
 * ```
 */
import { inject, toValue, watch, type InjectionKey, type MaybeRefOrGetter, type Plugin } from "vue";

export type {
  AutocaptureOptions,
  ConsentChoice,
  EventMap,
  IdentifyOptions,
  Mira,
  MiraOptions,
  SurveyInput,
} from "@mirafive/web";

// oxlint-disable-next-line typescript/no-explicit-any -- a client of any event map
type AnyMira = Mira<any>;

const key: InjectionKey<AnyMira> = Symbol("mirafive");
const noop = createNoopMira();
let shared: AnyMira | undefined;

declare module "vue" {
  interface ComponentCustomProperties {
    /** The MIRA FIVE client, for templates: `$mira.track('cta_clicked')`. */
    $mira: AnyMira;
  }
}

/**
 * The plugin. Pass the options (the client starts in the browser, once per page) or a client you
 * made with `createMira()`. During server rendering, components get a client that does nothing.
 */
export function createMiraPlugin(input: MiraOptions | { client: AnyMira }): Plugin {
  return {
    install(app) {
      let client: AnyMira = noop;
      if ("client" in input) client = input.client;
      else if (typeof window !== "undefined") {
        if (input.key) client = shared ??= createMira(input);
        else
          console.warn(
            "MIRA FIVE: no public key: pass { key } to createMiraPlugin. Nothing is sent.",
          );
      }
      app.provide(key, client);
      app.config.globalProperties.$mira = client;
    },
  };
}

/** The client; without the plugin or on a server, a stand-in whose calls do nothing. */
export function useMira<Events extends EventMap = EventMap>(): Mira<Events> {
  return inject(key, noop) as Mira<Events>;
}

/**
 * Keeps MIRA FIVE in step with your auth state: identifies when the user id appears or changes,
 * resets when it goes away (sign-out), so a shared device starts fresh.
 *
 * ```ts
 * useIdentify(() => session.value?.user.id, () => ({ plan: session.value?.user.plan }));
 * ```
 */
export function useIdentify(
  userId: MaybeRefOrGetter<string | null | undefined>,
  traits?: MaybeRefOrGetter<Record<string, unknown> | undefined>,
): void {
  const mira = useMira();
  watch(
    () => toValue(userId) ?? undefined,
    (id, previous) => {
      if (id) mira.identify(id, toValue(traits));
      else if (previous) mira.reset();
    },
    { immediate: true },
  );
}
