import { describe, expect, test } from "bun:test";

import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

import { createMiraPlugin, useIdentify, useMira } from "./index";

function recorder(calls: string[]) {
  const nothing = () => {};
  return {
    init: nothing,
    page: nothing,
    track: (name: string) => void calls.push(`track:${name}`),
    survey: nothing,
    identify: (id: string) => void calls.push(`identify:${id}`),
    group: nothing,
    consent: nothing,
    setLocation: nothing,
    reset: () => void calls.push("reset"),
    flush: () => Promise.resolve(),
    status: { analytics: "unknown", marketing: "unknown" } as const,
    anonymousId: undefined,
  };
}

describe("@mirafive/vue", () => {
  test("renders on a server with options and gives a client that does nothing", async () => {
    const Page = defineComponent(() => {
      useMira().track("rendered");
      return () => h("p", useMira().anonymousId ?? "no id");
    });
    const app = createSSRApp(Page).use(createMiraPlugin({ key: "mira_pk_test" }));
    expect(await renderToString(app)).toBe("<p>no id</p>");
  });

  test("passes a client through to components and templates", async () => {
    const calls: string[] = [];
    const Page = defineComponent(() => {
      useMira().track("from_setup");
      useIdentify("user_1");
      return () => h("p", "ok");
    });
    const app = createSSRApp(Page).use(createMiraPlugin({ client: recorder(calls) }));
    await renderToString(app);
    expect(calls).toEqual(["track:from_setup", "identify:user_1"]);
    expect(typeof app.config.globalProperties.$mira.track).toBe("function");
  });

  test("works without the plugin", async () => {
    const Page = defineComponent(() => {
      useMira().track("x");
      return () => h("i", "ok");
    });
    expect(await renderToString(createSSRApp(Page))).toBe("<i>ok</i>");
  });
});
