import styles from "../RouteShowcase.module.css";

const LazyRoute = () => {
  return (
    <article class={styles.page}>
      <div class={styles.pageEyebrow}>/lazy</div>
      <h2 class={styles.pageTitle}>This page is loaded through Solid 2 lazy()</h2>
      <p class={styles.pageBody}>
        The route shell keeps the path static and lets Solid handle the loading boundary. This page arrives through a dynamic import and still renders inside the same SPA route structure.
      </p>

      <div class={styles.media}>
        <section class={styles.art}>
          <strong class={styles.cardBodyStrong}>What this shows</strong>
          <p class={styles.cardBody}>
            Route declarations can point at a lazy page component. The app shell can wrap that route with
            {" "}
            <code class={styles.inlineCode}>Loading</code>
            {" "}
            for fallback UI without changing the route API.
          </p>
        </section>

        <section class={styles.art}>
          <strong class={styles.cardBodyStrong}>Bundled asset</strong>
          <p class={styles.cardBody}>The lazy page can still reference regular app assets.</p>
          <img src="/assets/a.avif" alt="Abstract demo artwork" />
        </section>
      </div>

      <pre class={styles.codeBlock}>{`const LazyRoutePage = lazy(() => import("./routes/LazyRoute"));

<Loading fallback={<p>Loading...</p>}>
  <Route path="/lazy" component={LazyRoutePage} />
</Loading>`}</pre>
    </article>
  );
};

export default LazyRoute;
