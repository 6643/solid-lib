import styles from "../RouteShowcase.module.css";

export const HomeRoute = () => {
  return (
    <article class={styles.page}>
      <div class={styles.pageEyebrow}>/</div>
      <h2 class={styles.pageTitle}>One demo, four routes, several route behaviors</h2>
      <p class={styles.pageBody}>
        The showcase keeps routing intentionally small. Every page uses a static path, navigation works through native
        {" "}
        <code class={styles.inlineCode}>a</code>
        {" "}
        tags or imperative helpers, and query parsing stays inside the page component that owns the state.
      </p>

      <div class={styles.grid}>
        <section class={styles.card}>
          <h3 class={styles.cardTitle}>Native anchor navigation</h3>
          <p class={styles.cardBody}>Use the links above or the preset links inside each page. Same-origin anchors stay inside the SPA.</p>
        </section>
        <section class={styles.card}>
          <h3 class={styles.cardTitle}>Component-owned query parsing</h3>
          <p class={styles.cardBody}>The search route uses <code class={styles.inlineCode}>parseParam()</code> accessors so page-specific filters stay local to the page.</p>
        </section>
        <section class={styles.card}>
          <h3 class={styles.cardTitle}>Imperative history helpers</h3>
          <p class={styles.cardBody}>The history route demonstrates <code class={styles.inlineCode}>pushRoute()</code>, <code class={styles.inlineCode}>replaceRoute()</code>, and <code class={styles.inlineCode}>getRouteBackPath()</code>.</p>
        </section>
        <section class={styles.card}>
          <h3 class={styles.cardTitle}>Lazy page loading</h3>
          <p class={styles.cardBody}>The lazy route renders a page loaded with Solid 2 <code class={styles.inlineCode}>lazy()</code> and wrapped with <code class={styles.inlineCode}>Loading</code>.</p>
        </section>
      </div>

      <pre class={styles.codeBlock}>{`<Route path="/search" component={SearchRoute} />
<Route path="/history" component={HistoryRoute} />
<Route path="/lazy" component={LazyRoutePage} />`}</pre>
    </article>
  );
};
