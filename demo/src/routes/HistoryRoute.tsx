import { createMemo } from "solid-js";
import { getRouteBackPath, parseParam, pushRoute, replaceRoute } from "solid-lib/route";

import styles from "../RouteShowcase.module.css";

export const HistoryRoute = () => {
  const step = parseParam("step", "start");

  const backPath = createMemo(() => {
    void step();
    return getRouteBackPath() ?? "(none)";
  });

  return (
    <article class={styles.page}>
      <div class={styles.pageEyebrow}>/history</div>
      <h2 class={styles.pageTitle}>Imperative navigation keeps back-path metadata with the entry</h2>
      <p class={styles.pageBody}>
        The buttons below stay on the same path so you can compare
        {" "}
        <code class={styles.inlineCode}>pushRoute()</code>
        {" "}
        and
        {" "}
        <code class={styles.inlineCode}>replaceRoute()</code>
        . Browser back and forward reuse the entry metadata instead of a separate in-memory stack.
      </p>

      <div class={styles.buttonRow}>
        <button class={styles.button} type="button" onClick={() => pushRoute("/history?step=push-alpha")}>
          pushRoute("/history?step=push-alpha")
        </button>
        <button class={`${styles.button} ${styles.buttonAlt}`} type="button" onClick={() => replaceRoute("/history?step=replace-omega")}>
          replaceRoute("/history?step=replace-omega")
        </button>
        <button class={styles.button} type="button" onClick={() => pushRoute("/search?page=7&enabled=true&tags=history,jump")}>
          pushRoute("/search?page=7...")
        </button>
      </div>

      <div class={styles.statGrid}>
        <section class={styles.stat}>
          <span class={styles.statLabel}>current step</span>
          <div class={styles.statValue}>{step()}</div>
        </section>
        <section class={styles.stat}>
          <span class={styles.statLabel}>getRouteBackPath()</span>
          <div class={styles.statValue}>{backPath()}</div>
        </section>
      </div>

      <div class={styles.pillRow}>
        <a class={styles.pillLink} href="/history?step=linked-from-anchor">
          Native &lt;a href="/history?step=linked-from-anchor"&gt;
        </a>
        <a class={styles.pillLink} href="/search?page=3&enabled=true&tags=link,travel">
          Native anchor to /search
        </a>
      </div>

      <p class={styles.note}>
        Tip: after pushing a few states here, use the browser back and forward buttons. The route should stay in sync and the back path display should follow the active history entry.
      </p>
    </article>
  );
};
