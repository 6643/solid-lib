import {
  Card,
  FlexBox,
  TopTab,
  MenuTab,
  LeftTab,
  NavTab,
  Counter,
} from "../../../src/ui/_";

import styles from "./Pages.module.css";

const TabsPage = () => {
  return (
    <div class={styles.page}>
      <h1 class={styles.title}>Tab 组件</h1>
      <p class={styles.desc}>展示 TopTab、MenuTab、LeftTab、NavTab 组件</p>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>TopTab 固定标签页</h2>
        <TopTab>
          {[
            { name: "标签一", panel: () => <div class={styles.tabPanel}><h3>标签一内容</h3><p>固定标签页。</p><Counter value={1} /></div> },
            { name: "标签二", panel: () => <div class={styles.tabPanel}><h3>标签二内容</h3><p>第二个标签页。</p></div> },
            { name: "标签三", panel: () => <div class={styles.tabPanel}><h3>标签三内容</h3><p>第三个标签页。</p></div> },
          ]}
        </TopTab>
      </Card>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>MenuTab 菜单标签页</h2>
        <div style={{ height: "300px" }}>
          <MenuTab>
            {[
              { name: "分类 A", panel: () => <div class={styles.tabPanel}><h3>分类 A</h3><p>菜单标签页，内容区自动追踪可见性。</p><div style={{ height: "400px", background: "var(--bg-inset)", borderRadius: "8px", padding: "16px" }}><p>长内容区域...</p></div></div> },
              { name: "分类 B", panel: () => <div class={styles.tabPanel}><h3>分类 B</h3><p>分类 B 的内容。</p></div> },
              { name: "分类 C", panel: () => <div class={styles.tabPanel}><h3>分类 C</h3><p>分类 C 的内容。</p></div> },
            ]}
          </MenuTab>
        </div>
      </Card>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>LeftTab 侧边导航</h2>
        <div style={{ height: "300px" }}>
          <LeftTab>
            {[
              { name: "菜单 A", panel: () => <div class={styles.tabPanel}><h3>菜单 A</h3><p>侧边导航第一个面板。</p></div> },
              { name: "菜单 B", panel: () => <div class={styles.tabPanel}><h3>菜单 B</h3><p>侧边导航第二个面板。</p></div> },
              { name: "菜单 C", panel: () => <div class={styles.tabPanel}><h3>菜单 C</h3><p>侧边导航第三个面板。</p></div> },
            ]}
          </LeftTab>
        </div>
      </Card>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>NavTab 可见性导航</h2>
        <div style={{ height: "400px" }}>
          <NavTab>
            {[
              { name: "分类 1", panel: () => <div class={styles.tabPanel}><h3>分类 1</h3><p>滚动内容会自动高亮对应的左侧标签。</p><div style={{ height: "600px", background: "var(--bg-inset)", borderRadius: "8px", padding: "16px" }}><p>长内容区域...</p></div></div> },
              { name: "分类 2", panel: () => <div class={styles.tabPanel}><h3>分类 2</h3><p>分类 2 的内容。</p></div> },
              { name: "分类 3", panel: () => <div class={styles.tabPanel}><h3>分类 3</h3><p>分类 3 的内容。</p></div> },
            ]}
          </NavTab>
        </div>
      </Card>
    </div>
  );
};

export default TabsPage;
