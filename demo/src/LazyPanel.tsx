import type { Component } from "solid-js";

export const LazyPanel: Component = () => {
  return (
    <aside>
      <h2>Lazy loaded panel</h2>
            <p>This panel is loaded through a dynamic import after the page has already rendered.</p>
            <img src="/assets/a.avif" alt="" />
        </aside>
    );
};
