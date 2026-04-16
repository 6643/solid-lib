import { parseParam, replaceRoute } from "solid-lib/route";

import styles from "../RouteShowcase.module.css";

export const SearchRoute = () => {
  const page = parseParam("page", 1);
  const enabled = parseParam("enabled", false);
  const tags = parseParam("tags", (raw) => raw?.split(",").filter(Boolean) ?? []);

  return (
    <article class={styles.page}>
      <div class={styles.pageEyebrow}>/search</div>
      <h2 class={styles.pageTitle}>Query params stay inside the page component</h2>
      <p class={styles.pageBody}>
        This route parses its own query state. The route layer only matches
        {" "}
        <code class={styles.inlineCode}>/search</code>
        , while the page decides how to convert raw search params into business values.
      </p>

      <div class={styles.pillRow}>
        <a class={styles.pillLink} href="/search?page=1">
          /search?page=1
        </a>
        <a class={styles.pillLink} href="/search?page=2&enabled=true">
          /search?page=2&enabled=true
        </a>
        <a class={styles.pillLink} href="/search?page=4&tags=solid,route,docs">
          /search?page=4&tags=solid,route,docs
        </a>
      </div>

      <div class={styles.buttonRow}>
        <button class={styles.button} type="button" onClick={() => replaceRoute("/search?page=9&enabled=true&tags=replaced,query")}>
          replaceRoute("/search?page=9...")
        </button>
      </div>

      <div class={styles.statGrid}>
        <section class={styles.stat}>
          <span class={styles.statLabel}>page</span>
          <div class={styles.statValue}>{page()}</div>
        </section>
        <section class={styles.stat}>
          <span class={styles.statLabel}>enabled</span>
          <div class={styles.statValue}>{enabled() ? "true" : "false"}</div>
        </section>
        <section class={styles.stat}>
          <span class={styles.statLabel}>tags</span>
          <div class={styles.statValue}>{tags().length ? tags().join(", ") : "(none)"}</div>
        </section>
      </div>

      <pre class={styles.codeBlock}>{`const page = parseParam("page", 1);
const enabled = parseParam("enabled", false);
const tags = parseParam("tags", (raw) => raw?.split(",").filter(Boolean) ?? []);`}</pre>
    </article>
  );
};
