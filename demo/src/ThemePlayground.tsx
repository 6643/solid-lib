import { createSignal } from "solid-js";
import {
  Card,
  FilledButton,
  IconButton,
  Input,
  OutlinedButton,
  TextButton,
  initializeThemeMode,
  setThemeMode,
  type ThemeMode,
} from "../../src/ui/_";

import styles from "./ThemePlayground.module.css";

const iconMinus = '<path d="M240-510h480v60H240z"/>';

const ThemePlayground = () => {
  const [mode, setMode] = createSignal<ThemeMode>(
    typeof document === "undefined" ? "system" : initializeThemeMode(),
  );

  const applyMode = (nextMode: ThemeMode) => {
    setThemeMode(nextMode);
    setMode(nextMode);
  };

  return (
    <main class={styles.shell}>
      <section class={styles.hero}>
        <div>
          <p class={styles.kicker}>UI Theme</p>
          <h1 class={styles.title}>Base, raised, inset.</h1>
          <p class={styles.lead}>
            Theme mode only lives on the root. Components consume the exported CSS
            variables and stay unaware of light or dark.
          </p>
        </div>

        <Card class={styles.controls}>
          <span class={styles.caption}>Current: {mode()}</span>
          <div class={styles.buttonRow}>
            <OutlinedButton text="System" tap={() => applyMode("system")} />
            <OutlinedButton text="Light" tap={() => applyMode("light")} />
            <OutlinedButton text="Dark" tap={() => applyMode("dark")} />
          </div>
        </Card>
      </section>

      <section class={styles.grid}>
        <Card class={styles.card}>
          <span class={styles.eyebrow}>Raised</span>
          <h2 class={styles.cardTitle}>Card Surface</h2>
          <p class={styles.cardBody}>
            Cards float above the base without requiring a default border.
          </p>

          <label class={styles.field}>
            <span class={styles.fieldLabel}>Email</span>
            <Input class={styles.input} value="not-an-email" />
          </label>

          <p class={styles.error}>Enter a valid email address.</p>

          <div class={styles.actions}>
            <TextButton text="Text" />
            <OutlinedButton text="Outline" />
            <FilledButton text="Theme" />
            <IconButton icon={iconMinus} />
            <FilledButton disabled text="Disabled" />
          </div>
        </Card>

        <Card class={styles.panel}>
          <span class={styles.eyebrow}>Tokens</span>
          <dl class={styles.tokenList}>
            <div class={styles.token}>
              <dt>base</dt>
              <dd>root background and neutral controls</dd>
            </div>
            <div class={styles.token}>
              <dt>raised</dt>
              <dd>lifted cards and grouped content</dd>
            </div>
            <div class={styles.token}>
              <dt>inset</dt>
              <dd>pressed fields and embedded controls</dd>
            </div>
            <div class={styles.token}>
              <dt>theme-color</dt>
              <dd>single injected highlight color</dd>
            </div>
            <div class={styles.token}>
              <dt>error-color</dt>
              <dd>single injected validation signal</dd>
            </div>
          </dl>
        </Card>
      </section>
    </main>
  );
};

export default ThemePlayground;
