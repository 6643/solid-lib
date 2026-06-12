import { createSignal, Show } from "solid-js";
import {
  Card,
  FlexBox,
  FilledButton,
  OutlinedButton,
  TextInput,
  useDebounce,
  useThrottle,
  useCopy,
  useClickOutside,
  useKeyPress,
  useResize,
  useFullScreen,
  useVis,
  createDebouncedSignal,
} from "../../../src/ui/_";

import styles from "./Pages.module.css";

const HooksPage = () => {
  // useDebounce 示例
  const [searchText, setSearchText] = createSignal("");
  const debouncedSearch = useDebounce((value: string) => {
    console.log("搜索:", value);
  }, 500);

  // useThrottle 示例
  const [scrollCount, setScrollCount] = createSignal(0);
  const throttledScroll = useThrottle(() => {
    setScrollCount(c => c + 1);
  }, 1000);

  // useCopy 示例
  const [copied, copy] = useCopy();

  // useClickOutside 示例
  const [showDropdown, setShowDropdown] = createSignal(false);
  let dropdownRef!: HTMLDivElement;
  useClickOutside(() => dropdownRef, () => setShowDropdown(false));

  // useKeyPress 示例
  const [lastKey, setLastKey] = createSignal("");
  useKeyPress(["Enter", "Escape", " ", "a", "b", "c"], (e: KeyboardEvent) => {
    setLastKey(e.key);
  });

  // useResize 示例
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  let resizeRef!: HTMLDivElement;
  useResize(() => resizeRef, (entry) => {
    setSize({
      width: Math.round(entry.contentRect.width),
      height: Math.round(entry.contentRect.height),
    });
  });

  // useFullScreen 示例
  const { isFullscreen, toggleFullScreen } = useFullScreen();

  // useVis 示例
  const [isVisible, setIsVisible] = createSignal(false);
  let visRef!: HTMLDivElement;
  useVis(() => visRef, (entry) => {
    setIsVisible(entry.isIntersecting);
  });

  // createDebouncedSignal 示例
  const [inputVal, setInputVal] = createSignal("");
  const debouncedVal = createDebouncedSignal(inputVal, 300);

  return (
    <div class={styles.page}>
      <h1 class={styles.title}>Hooks 示例</h1>
      <p class={styles.desc}>展示常用 Hooks 的使用方式</p>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useDebounce 防抖</h2>
          <TextInput
            label="搜索（500ms 防抖）"
            value={searchText()}
            changed={(v) => {
              setSearchText(v);
              debouncedSearch(v);
            }}
          />
          <p class={styles.note}>输入停止 500ms 后才会触发搜索</p>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useThrottle 节流</h2>
          <FilledButton
            text="点击（1秒节流）"
            tap={throttledScroll}
          />
          <p class={styles.note}>触发次数: {scrollCount()}（每秒最多1次）</p>
        </Card>
      </FlexBox>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useCopy 复制</h2>
          <FilledButton
            text={copied() ? "已复制!" : "复制文本"}
            tap={() => copy("Hello, SolidJS!")}
          />
          <p class={styles.note}>点击复制 "Hello, SolidJS!"</p>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useClickOutside 点击外部</h2>
          <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
            <OutlinedButton
              text="切换下拉"
              tap={() => { setShowDropdown(!showDropdown()); }}
            />
            <Show when={showDropdown()}>
              <div class={styles.dropdown}>
                <p>点击外部关闭</p>
                <p>菜单项 1</p>
                <p>菜单项 2</p>
              </div>
            </Show>
          </div>
        </Card>
      </FlexBox>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useKeyPress 按键监听</h2>
          <p>最后按下的键: <strong>{lastKey() || "无"}</strong></p>
          <p class={styles.note}>按下 Enter、Escape、空格、a/b/c 键测试</p>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useResize 尺寸监听</h2>
          <div ref={resizeRef} class={styles.resizeBox}>
            <p>宽度: {size().width}px</p>
            <p>高度: {size().height}px</p>
            <p class={styles.note}>调整窗口大小查看变化</p>
          </div>
        </Card>
      </FlexBox>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useFullScreen 全屏</h2>
          <FilledButton
            text={isFullscreen() ? "退出全屏" : "进入全屏"}
            tap={toggleFullScreen}
          />
          <p class={styles.note}>当前状态: {isFullscreen() ? "全屏" : "正常"}</p>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>useVis 可见性检测</h2>
          <div ref={visRef} class={styles.visBox}>
            <p>元素可见: <strong>{isVisible() ? "是" : "否"}</strong></p>
            <p class={styles.note}>滚动到此元素查看效果</p>
          </div>
        </Card>
      </FlexBox>

      <Card class={styles.card}>
        <h2 class={styles.cardTitle}>createDebouncedSignal 防抖信号</h2>
        <TextInput
          label="输入内容"
          value={inputVal()}
          changed={setInputVal}
        />
        <p class={styles.note}>原始值: {inputVal()}</p>
        <p class={styles.note}>防抖值 (300ms): {debouncedVal() ?? "(等待输入...)"}</p>
      </Card>
    </div>
  );
};

export default HooksPage;
