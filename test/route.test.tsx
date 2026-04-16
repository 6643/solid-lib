import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createSignal, lazy } from "solid-js";

import { Route, getRouteBackPath, parseParam, parseParams, pushRoute, replaceRoute } from "../src/route/_";
import { resetRouteForTests } from "../src/route/testing";

type Listener = (event: any) => void;

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const callback = typeof listener === "function" ? listener : listener.handleEvent.bind(listener);
    const bucket = this.listeners.get(type) ?? new Set<Listener>();
    bucket.add(callback);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const callback = typeof listener === "function" ? listener : listener.handleEvent.bind(listener);
    const bucket = this.listeners.get(type);
    bucket?.delete(callback);
  }

  dispatchEvent(event: any) {
    event.currentTarget = this;
    const bucket = this.listeners.get(event.type);

    if (!bucket) {
      return !event.defaultPrevented;
    }

    for (const listener of bucket) {
      listener(event);
    }

    return !event.defaultPrevented;
  }
}

class FakeLocation {
  origin: string;
  href: string;
  pathname: string;
  search: string;
  hash: string;

  constructor(origin: string, path: string) {
    this.origin = origin;
    this.href = `${origin}/`;
    this.pathname = "/";
    this.search = "";
    this.hash = "";
    this.assign(path);
  }

  assign(next: string) {
    const url = new URL(next, this.href);
    this.origin = url.origin;
    this.href = url.href;
    this.pathname = url.pathname;
    this.search = url.search;
    this.hash = url.hash;
  }
}

class FakeWindow extends FakeEventTarget {
  readonly document = new FakeDocument();
  readonly location: FakeLocation;
  readonly history: FakeHistory;

  constructor(origin: string, path: string) {
    super();
    this.location = new FakeLocation(origin, path);
    this.history = new FakeHistory(this);
  }

  createAnchor(path: string, options?: { origin?: string; target?: string; download?: boolean }) {
    const href = new URL(path, options?.origin ?? this.location.href).href;
    const url = new URL(href);
    const anchor = {
      href,
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      target: options?.target ?? "",
      download: options?.download ? "" : undefined,
      closest: (selector: string) => (selector === "a[href]" ? anchor : null),
      getAttribute(name: string) {
        switch (name) {
          case "href":
            return path;
          case "target":
            return options?.target ?? null;
          case "download":
            return options?.download ? "" : null;
          default:
            return null;
        }
      },
    };
    return anchor;
  }

  createClickEvent(target: any, overrides?: Partial<Record<string, unknown>>) {
    return {
      type: "click",
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      defaultPrevented: false,
      target,
      preventDefault() {
        this.defaultPrevented = true;
      },
      composedPath() {
        return [target];
      },
      ...overrides,
    };
  }
}

class FakeDocument extends FakeEventTarget {}

class FakeHistory {
  private readonly entries: Array<{ state: unknown; url: string }> = [];
  private index = 0;
  replaceCount = 0;

  constructor(private readonly window: FakeWindow) {
    this.entries.push({
      state: undefined,
      url: window.location.href,
    });
  }

  get state() {
    return this.entries[this.index]?.state;
  }

  pushState(state: unknown, _: string, url?: string | URL | null) {
    const nextUrl = new URL(String(url ?? this.window.location.href), this.window.location.href).href;
    this.entries.splice(this.index + 1);
    this.entries.push({ state, url: nextUrl });
    this.index = this.entries.length - 1;
    this.window.location.assign(nextUrl);
  }

  replaceState(state: unknown, _: string, url?: string | URL | null) {
    const nextUrl = new URL(String(url ?? this.window.location.href), this.window.location.href).href;
    this.replaceCount += 1;
    this.entries[this.index] = { state, url: nextUrl };
    this.window.location.assign(nextUrl);
  }

  back() {
    if (this.index === 0) {
      return;
    }

    this.index -= 1;
    this.window.location.assign(this.entries[this.index]!.url);
    this.window.dispatchEvent({ type: "popstate", state: this.state, defaultPrevented: false });
  }

  forward() {
    if (this.index >= this.entries.length - 1) {
      return;
    }

    this.index += 1;
    this.window.location.assign(this.entries[this.index]!.url);
    this.window.dispatchEvent({ type: "popstate", state: this.state, defaultPrevented: false });
  }
}

const originalWindow = (globalThis as Record<string, unknown>).window;
const originalDocument = (globalThis as Record<string, unknown>).document;

const installBrowser = (path = "/search?page=1") => {
  const browser = new FakeWindow("https://example.com", path);

  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: browser.document });

  resetRouteForTests();
  return browser;
};

const restoreBrowser = () => {
  if (typeof originalWindow === "undefined") {
    delete (globalThis as Record<string, unknown>).window;
  } else {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }

  if (typeof originalDocument === "undefined") {
    delete (globalThis as Record<string, unknown>).document;
  } else {
    Object.defineProperty(globalThis, "document", { configurable: true, value: originalDocument });
  }

  resetRouteForTests();
};

beforeEach(() => {
  installBrowser();
});

afterEach(() => {
  restoreBrowser();
});

describe("route public api", () => {
  test("exports route helpers", () => {
    expect(typeof Route).toBe("function");
    expect(typeof pushRoute).toBe("function");
    expect(typeof replaceRoute).toBe("function");
    expect(typeof getRouteBackPath).toBe("function");
    expect(typeof parseParam).toBe("function");
    expect(typeof parseParams).toBe("function");
  });
});

describe("navigation", () => {
  test("pushRoute updates the browser location and stores the previous internal path as back path", () => {
    const browser = installBrowser("/search?page=1");

    pushRoute("/search?page=2");

    expect(browser.location.pathname).toBe("/search");
    expect(browser.location.search).toBe("?page=2");
    expect(getRouteBackPath()).toBe("/search?page=1");
  });

  test("replaceRoute keeps the current back path", () => {
    installBrowser("/search?page=1");

    pushRoute("/search?page=2");
    replaceRoute("/search?page=3");

    expect(getRouteBackPath()).toBe("/search?page=1");
  });

  test("browser back and forward keep route state in sync", () => {
    const browser = installBrowser("/search?page=1");

    pushRoute("/search?page=2");
    pushRoute("/search?page=3");
    browser.history.back();

    expect(browser.location.search).toBe("?page=2");
    expect(getRouteBackPath()).toBe("/search?page=1");

    browser.history.forward();

    expect(browser.location.search).toBe("?page=3");
    expect(getRouteBackPath()).toBe("/search?page=2");
  });

  test("reading route state repeatedly does not keep rewriting the current browser entry", () => {
    const browser = installBrowser("/search?page=1");

    expect(browser.history.replaceCount).toBe(0);

    expect(getRouteBackPath()).toBeUndefined();
    expect(browser.history.replaceCount).toBe(1);

    expect(getRouteBackPath()).toBeUndefined();
    expect(browser.history.replaceCount).toBe(1);
  });
});

describe("parseParams", () => {
  test("reads the latest query values after navigation", () => {
    installBrowser("/search?page=1");

    const params = parseParams({
      page: (raw) => Number(raw ?? "1"),
      enabled: (raw) => raw === "true",
      tags: (raw) => raw?.split(",").filter(Boolean) ?? [],
    });

    expect(params.page).toBe(1);
    expect(params.enabled).toBe(false);
    expect(params.tags).toEqual([]);

    pushRoute("/search?page=2&enabled=true&tags=a,b");

    expect(params.page).toBe(2);
    expect(params.enabled).toBe(true);
    expect(params.tags).toEqual(["a", "b"]);
  });
});

describe("parseParam", () => {
  test("returns accessors that read the latest query values after navigation", () => {
    installBrowser("/history?step=start&enabled=false");

    const step = parseParam("step", (raw) => raw ?? "start");
    const enabled = parseParam("enabled", (raw) => raw === "true");

    expect(step()).toBe("start");
    expect(enabled()).toBe(false);

    pushRoute("/history?step=push-alpha&enabled=true");

    expect(step()).toBe("push-alpha");
    expect(enabled()).toBe(true);
  });

  test("accepts primitive fallback values and infers parsing from the fallback type", () => {
    installBrowser("/search?page=3&enabled=true&q=solid");

    const page = parseParam("page", 0);
    const enabled = parseParam("enabled", false);
    const query = parseParam("q", "");

    expect(page()).toBe(3);
    expect(enabled()).toBe(true);
    expect(query()).toBe("solid");

    pushRoute("/search?page=nope&enabled=maybe");

    expect(page()).toBe(0);
    expect(enabled()).toBe(false);
    expect(query()).toBe("");
  });

  test("uses the provided boolean fallback when the raw value is missing or invalid", () => {
    installBrowser("/flags?enabled=0");

    const enabled = parseParam("enabled", true);
    expect(enabled()).toBe(false);

    pushRoute("/flags?enabled=wat");
    expect(enabled()).toBe(true);

    pushRoute("/flags");
    expect(enabled()).toBe(true);
  });
});

describe("Route", () => {
  test("renders only when the path matches", () => {
    installBrowser("/search?page=1");

    const Search = () => "search";
    const SearchRoute = Route({ path: "/search", component: Search }) as () => unknown;
    const HomeRoute = Route({ path: "/", component: () => "home" }) as () => unknown;

    expect(SearchRoute()).toBe("search");
    expect(HomeRoute()).toBeUndefined();
  });

  test("respects dynamic when accessors", () => {
    installBrowser("/search?page=1");

    const [enabled, setEnabled] = createSignal(false);
    const SearchRoute = Route({ path: "/search", when: enabled, component: () => "search" }) as () => unknown;

    expect(SearchRoute()).toBeUndefined();

    setEnabled(true);
    expect(SearchRoute()).toBe("search");

    setEnabled(false);
    expect(SearchRoute()).toBeUndefined();
  });

  test("captures the initial path value", () => {
    installBrowser("/search");

    const [path, setPath] = createSignal("/search");
    const DynamicRoute = Route({
      get path() {
        return path();
      },
      component: () => "dynamic",
    }) as () => unknown;

    expect(DynamicRoute()).toBe("dynamic");

    setPath("/other");
    expect(DynamicRoute()).toBe("dynamic");

    pushRoute("/other");
    expect(DynamicRoute()).toBeUndefined();
  });

  test("captures the initial component value", () => {
    installBrowser("/search");

    const First = () => "first";
    const Second = () => "second";
    const [variant, setVariant] = createSignal<"first" | "second">("first");
    const DynamicRoute = Route({
      path: "/search",
      get component() {
        return variant() === "first" ? First : Second;
      },
    }) as () => unknown;

    expect(DynamicRoute()).toBe("first");

    setVariant("second");
    expect(DynamicRoute()).toBe("first");
  });

  test("renders all matching exact routes", () => {
    installBrowser("/search");

    const FirstRoute = Route({ path: "/search", component: () => "first" }) as () => unknown;
    const SecondRoute = Route({ path: "/search", when: true, component: () => "second" }) as () => unknown;

    expect(FirstRoute()).toBe("first");
    expect(SecondRoute()).toBe("second");
  });

  test("uses /* only when no exact route matches", () => {
    installBrowser("/search");

    const SearchRoute = Route({ path: "/search", component: () => "search" }) as () => unknown;
    const FallbackRoute = Route({ path: "/*", component: () => "fallback" }) as () => unknown;

    expect(SearchRoute()).toBe("search");
    expect(FallbackRoute()).toBeUndefined();

    pushRoute("/missing");

    expect(SearchRoute()).toBeUndefined();
    expect(FallbackRoute()).toBe("fallback");
  });

  test("keeps the same route component instance when only query changes", () => {
    installBrowser("/search?page=1");

    let renderCount = 0;

    const Search = () => {
      renderCount += 1;
      const page = parseParam("page", (raw) => Number(raw ?? "1"));

      return {
        id: renderCount,
        get page() {
          return page();
        },
      };
    };

    const SearchRoute = Route({ path: "/search", component: Search }) as () => { id: number; page: number } | undefined;

    const firstRender = SearchRoute();
    expect(firstRender?.id).toBe(1);
    expect(firstRender?.page).toBe(1);

    pushRoute("/search?page=2");

    const secondRender = SearchRoute();
    expect(secondRender).toBe(firstRender);
    expect(secondRender?.id).toBe(1);
    expect(secondRender?.page).toBe(2);
    expect(renderCount).toBe(1);
  });

  test("accepts lazy page components", () => {
    installBrowser("/search");

    const Search = lazy(async () => ({ default: () => "search" }), "/assets/Search.js");
    const SearchRoute = Route({ path: "/search", component: Search }) as () => unknown;

    expect(typeof SearchRoute).toBe("function");
  });
});

describe("anchor navigation", () => {
  test("intercepts same-origin anchor clicks", () => {
    const browser = installBrowser("/search?page=1");
    Route({ path: "/search", component: () => "search" });

    getRouteBackPath();

    const anchor = browser.createAnchor("/search?page=2");
    const event = browser.createClickEvent(anchor);
    browser.document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(browser.location.search).toBe("?page=2");
    expect(getRouteBackPath()).toBe("/search?page=1");
  });

  test("intercepts native anchors when the download property exists but the attribute is absent", () => {
    const browser = installBrowser("/search?page=1");
    Route({ path: "/search", component: () => "search" });

    getRouteBackPath();

    const baseAnchor = browser.createAnchor("/search?page=2");
    const anchor = {
      ...baseAnchor,
      download: "",
      getAttribute(name: string) {
        if (name === "download") {
          return null;
        }

        return baseAnchor.getAttribute(name);
      },
    };
    const event = browser.createClickEvent(anchor);
    browser.document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(browser.location.search).toBe("?page=2");
    expect(getRouteBackPath()).toBe("/search?page=1");
  });

  test("intercepts same-origin anchors when a fallback route is active", () => {
    const browser = installBrowser("/");
    Route({ path: "/*", component: () => "fallback" });

    getRouteBackPath();

    const anchor = browser.createAnchor("/missing");
    const event = browser.createClickEvent(anchor);
    browser.document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(browser.location.pathname).toBe("/missing");
    expect(getRouteBackPath()).toBe("/");
  });

  test("allows same-origin anchors through when no route can handle them", () => {
    const browser = installBrowser("/");

    getRouteBackPath();

    const anchor = browser.createAnchor("/missing");
    const event = browser.createClickEvent(anchor);
    browser.document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(browser.location.pathname).toBe("/");
  });

  test("re-evaluates dynamic when before intercepting anchors", () => {
    const browser = installBrowser("/");
    const [enabled, setEnabled] = createSignal(true);
    Route({ path: "/search", when: enabled, component: () => "search" });

    getRouteBackPath();

    const firstAnchor = browser.createAnchor("/search");
    const firstEvent = browser.createClickEvent(firstAnchor);
    browser.document.dispatchEvent(firstEvent);

    expect(firstEvent.defaultPrevented).toBe(true);
    expect(browser.location.pathname).toBe("/search");

    replaceRoute("/");
    setEnabled(false);

    const secondAnchor = browser.createAnchor("/search");
    const secondEvent = browser.createClickEvent(secondAnchor);
    browser.document.dispatchEvent(secondEvent);

    expect(secondEvent.defaultPrevented).toBe(false);
    expect(browser.location.pathname).toBe("/");
  });

  test("ignores external anchors", () => {
    const browser = installBrowser("/search?page=1");

    getRouteBackPath();

    const anchor = browser.createAnchor("/docs", { origin: "https://other.example.com" });
    const event = browser.createClickEvent(anchor);
    browser.document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(browser.location.search).toBe("?page=1");
  });

  test("ignores modified clicks and target blank links", () => {
    const browser = installBrowser("/search?page=1");

    getRouteBackPath();

    const modifiedAnchor = browser.createAnchor("/search?page=2");
    const modifiedEvent = browser.createClickEvent(modifiedAnchor, { metaKey: true });
    browser.document.dispatchEvent(modifiedEvent);

    expect(modifiedEvent.defaultPrevented).toBe(false);
    expect(browser.location.search).toBe("?page=1");

    const targetBlankAnchor = browser.createAnchor("/search?page=3", { target: "_blank" });
    const targetBlankEvent = browser.createClickEvent(targetBlankAnchor);
    browser.document.dispatchEvent(targetBlankEvent);

    expect(targetBlankEvent.defaultPrevented).toBe(false);
    expect(browser.location.search).toBe("?page=1");
  });
});
