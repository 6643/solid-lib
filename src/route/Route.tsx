import { type Component, type Element as SolidElement, createComponent, getOwner, onCleanup, onSettled, untrack } from "solid-js";

import { isFallbackRoutePath, matchesExactRoute } from "./match";
import { handleAnchorClick } from "./navigation";
import { ensureRouteState, getCurrentPathname, hasActiveExactRoute, registerRoute, unregisterRoute } from "./state";

export type RouteProps = {
  component: Component;
  path: string;
  when?: boolean | (() => boolean);
};

type RouteRenderer = () => ReturnType<typeof createComponent> | undefined;

export const Route = (props: RouteProps): SolidElement => {
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

  if (getOwner()) {
    onSettled(() => {
      ensureRouteState(handleAnchorClick);
    });
    onCleanup(() => {
      unregisterRoute(routeId);
    });
  } else {
    ensureRouteState(handleAnchorClick);
  }

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

  return renderRoute as unknown as SolidElement;
};
