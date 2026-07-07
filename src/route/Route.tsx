import { type Component, createComponent, createTrackedEffect, onCleanup, untrack } from "solid-js";
import type { JSX } from "@solidjs/web";

import { isFallbackRoutePath, matchesExactRoute } from "./match";
import { handleAnchorClick } from "./navigation";
import { ensureRouteState, getCurrentPathname, hasActiveExactRoute, registerRoute, unregisterRoute } from "./state";

export type RouteProps = {
  component: Component;
  path: string;
  when?: boolean | (() => boolean);
};

type RouteRenderer = () => ReturnType<typeof createComponent> | undefined;

export const Route = (props: RouteProps): JSX.Element => {
  const routePath = untrack(() => props.path);
  const RouteComponent = untrack(() => props.component);
  const readWhen = () => {
    const when = props.when;

    if (typeof when === "function") {
      return !!when();
    }

    return when ?? true;
  };
  const routeId = registerRoute({
    fallback: isFallbackRoutePath(routePath),
    isEnabled: readWhen,
    path: routePath,
  });
  let rendered: ReturnType<typeof createComponent> | undefined;

  createTrackedEffect(() => {
    ensureRouteState(handleAnchorClick);
    onCleanup(() => unregisterRoute(routeId));
  });

  const renderRoute: RouteRenderer = () => {
    if (!readWhen()) {
      rendered = undefined;
      return undefined;
    }

    const pathname = getCurrentPathname();
    const matchesRoute = isFallbackRoutePath(routePath) ? !hasActiveExactRoute(pathname) : matchesExactRoute(routePath, pathname);

    if (!matchesRoute) {
      rendered = undefined;
      return undefined;
    }

    rendered ??= createComponent(RouteComponent, {});
    return rendered;
  };

  return renderRoute as RouteRenderer & JSX.Element;
};
