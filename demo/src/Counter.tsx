import { createSignal, type Component } from "solid-js";

import styles from "./Counter.module.css";

export const Counter = () => {
  const [count, setCount] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [LazyPanel, setLazyPanel] = createSignal<null | Component>(null);

  const loadLazyPanel = async () => {
    if (loading() || LazyPanel()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const module = await import("./LazyPanel");
      setLazyPanel(() => module.LazyPanel);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section class={styles.shell}>
      <div class={styles.kicker}>solid-lib demo</div>
      <h1 class={styles.title}>Zero-config App Build</h1>
      <p class={styles.body}>
        This page is rendered from the generated app bundle. Click count:
        {" "}
        {count()}
      </p>

      <div class={styles.actions}>
        <button class={styles.button} type="button" onClick={() => setCount(count() + 1)}>
          Increment
        </button>
        <button
          class={`${styles.button} ${styles.buttonAlt}`}
          type="button"
          onClick={() => void loadLazyPanel()}
        >
          {loading() ? "Loading lazy panel..." : "Load lazy panel"}
        </button>
      </div>
      {error() ? <p class={styles.error}>{error()}</p> : null}
      {(() => {
        const Panel = LazyPanel();
        return Panel ? (
          <div class={styles.panel}>
            <Panel />
          </div>
        ) : null;
      })()}
    </section>
  );
};
