import { Loading, lazy } from "solid-js";
import { Route, pushRoute, replaceRoute } from "solid-lib/route";

import styles from "./RouteShowcase.module.css";
import { HistoryRoute } from "./routes/HistoryRoute";
import { HomeRoute } from "./routes/HomeRoute";
import { SearchRoute } from "./routes/SearchRoute";

const LazyRoutePage = lazy(() => import("./routes/LazyRoute"));

const RouteShowcase = () => {
  return (
    <main class={styles.shell}>
            <section class={styles.hero}>
                <div class={styles.kicker}>solid-lib route demo</div>
                <h1 class={styles.title}>Static SPA routes with native links and query params</h1>
                <p class={styles.lead}>
                    This demo shows the current route API surface: static path matching, native{" "}
                    <code class={styles.inlineCode}>a</code> tags, imperative navigation, query parsing inside components, and a
                    lazy page.
                </p>

                <div class={styles.actionRow}>
                    <button
                        class={styles.button}
                        type="button"
                        onClick={() => pushRoute("/search?page=2&enabled=true&tags=solid,router")}
                    >
                        pushRoute("/search?...") preset
                    </button>
                    <button
                        class={`${styles.button} ${styles.buttonAlt}`}
                        type="button"
                        onClick={() => replaceRoute("/history?step=replaced-from-header")}
                    >
                        replaceRoute("/history?...") preset
                    </button>
                </div>
            </section>

            <nav class={styles.nav}>
                <a class={styles.navLink} href="/">
                    Overview
                </a>
                <a class={styles.navLink} href="/search?page=1">
                    Search Params
                </a>
                <a class={styles.navLink} href="/history?step=start">
                    History API
                </a>
                <a class={styles.navLink} href="/lazy">
                    Lazy Route
                </a>
            </nav>

            <section class={styles.pages}>
                <Route path="/" component={HomeRoute} />
                <Route path="/search" component={SearchRoute} />
                <Route path="/history" component={HistoryRoute} />
                <Loading
                    fallback={
                        <article class={styles.page}>
                            <div class={styles.pageEyebrow}>/lazy</div>
                            <h2 class={styles.pageTitle}>Loading lazy route</h2>
                            <p class={styles.pageBody}>
                                The page component is being loaded through Solid 2 lazy() before Route renders it.
                            </p>
                        </article>
                    }
                >
                    <Route path="/lazy" component={LazyRoutePage} />
                </Loading>
      </section>
    </main>
  );
};

export default RouteShowcase;
