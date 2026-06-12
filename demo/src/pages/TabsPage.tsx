import { createSignal } from "solid-js";
import {
  Card,
  FlexBox,
  TopTab,
  LeftTab,
  Counter,
} from "../../../src/ui/_";

import styles from "./Pages.module.css";

const TabsPage = () => {
  return (
    <div class={styles.page}>
      <h1 class={styles.title}>Tab 组件</h1>
      <p class={styles.desc}>展示 TopTab、LeftTab 组件</p>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>TopTab 顶部标签页</h2>
        <TopTab>
          {[
            {
              name: "标签一",
              panel: () => (
                <div class={styles.tabPanel}>
                  <h3>标签一内容</h3>
                  <p>这是第一个标签页的内容区域。</p>
                  <Counter value={1} />
                </div>
              ),
            },
            {
              name: "标签二",
              panel: () => (
                <div class={styles.tabPanel}>
                  <h3>标签二内容</h3>
                  <p>这是第二个标签页的内容区域。</p>
                  <Counter value={10} />
                </div>
              ),
            },
            {
              name: "标签三",
              panel: () => (
                <div class={styles.tabPanel}>
                  <h3>标签三内容</h3>
                  <p>这是第三个标签页的内容区域。</p>
                  <Counter value={100} />
                </div>
              ),
            },
            {
              name: "标签四",
              panel: () => (
                <div class={styles.tabPanel}>
                  <h3>标签四内容</h3>
                  <p>这是第四个标签页的内容区域。</p>
                </div>
              ),
            },
          ]}
        </TopTab>
      </Card>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>LeftTab 左侧标签页 (mode="all")</h2>
        <div style={{ height: "400px" }}>
          <LeftTab mode="all">
            {[
              {
                name: "菜单 A",
                panel: () => (
                  <div class={styles.tabPanel}>
                    <h3>菜单 A 内容</h3>
                    <p>左侧标签页的第一个面板。</p>
                    <p>支持自动保持滚动位置。</p>
                  </div>
                ),
              },
              {
                name: "菜单 B",
                panel: () => (
                  <div class={styles.tabPanel}>
                    <h3>菜单 B 内容</h3>
                    <p>左侧标签页的第二个面板。</p>
                    <Counter value={50} min={0} max={100} />
                  </div>
                ),
              },
              {
                name: "菜单 C",
                panel: () => (
                  <div class={styles.tabPanel}>
                    <h3>菜单 C 内容</h3>
                    <p>左侧标签页的第三个面板。</p>
                  </div>
                ),
              },
            ]}
          </LeftTab>
        </div>
      </Card>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>LeftTab 左侧标签页 (mode="part")</h2>
        <div style={{ height: "400px" }}>
          <LeftTab mode="part">
            {[
              {
                name: "分类 1",
                panel: () => (
                  <div class={styles.tabPanel}>
                    <h3>分类 1</h3>
                    <p>滚动内容会自动高亮对应的左侧标签。</p>
                    <div style={{ height: "600px", background: "var(--inset-color)", "border-radius": "8px", padding: "16px" }}>
                      <p>长内容区域...</p>
                    </div>
                  </div>
                ),
              },
              {
                name: "分类 2",
                panel: () => (
                  <div class={styles.tabPanel}>
                    <h3>分类 2</h3>
                    <p>这是分类 2 的内容。</p>
                  </div>
                ),
              },
              {
                name: "分类 3",
                panel: () => (
                  <div class={styles.tabPanel}>
                    <h3>分类 3</h3>
                    <p>这是分类 3 的内容。</p>
                  </div>
                ),
              },
            ]}
          </LeftTab>
        </div>
      </Card>
    </div>
  );
};

export default TabsPage;
