import { createSignal } from "solid-js";
import {
  Card,
  FlexBox,
  FilledButton,
  OutlinedButton,
  Expand,
  newFilledModal,
  newBottomModal,
  newLeftModal,
  newRightModal,
} from "../../../src/ui/_";

import styles from "./Pages.module.css";

const InteractivePage = () => {
  const filledModal = newFilledModal();
  const bottomModal = newBottomModal();
  const leftModal = newLeftModal();
  const rightModal = newRightModal();

  return (
    <div class={styles.page}>
      <h1 class={styles.title}>交互组件</h1>
      <p class={styles.desc}>展示 Modal、Expand 组件</p>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>Expand 折叠面板</h2>
          <FlexBox gap={8} dir="column">
            <Expand title="基础信息">
              <div class={styles.expandContent}>
                <p>这是折叠面板的内容区域。</p>
                <p>可以放置任意内容。</p>
              </div>
            </Expand>
            <Expand title="高级设置">
              <div class={styles.expandContent}>
                <p>这里是高级设置选项。</p>
                <ul>
                  <li>选项 1</li>
                  <li>选项 2</li>
                  <li>选项 3</li>
                </ul>
              </div>
            </Expand>
            <Expand title="关于">
              <div class={styles.expandContent}>
                <p>SolidJS UI 组件库演示</p>
              </div>
            </Expand>
          </FlexBox>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>Filled Modal 填充弹窗</h2>
          <FilledButton text="打开填充弹窗" tap={() => { filledModal.setActive(true); }} />
          <filledModal.FilledModal onClose={() => console.log("弹窗关闭")}>
            <Card class={styles.modalContent}>
              <h2>填充弹窗</h2>
              <p>这是一个从中心弹出的模态框。</p>
              <FilledButton text="关闭" tap={() => { filledModal.setActive(false); }} />
            </Card>
          </filledModal.FilledModal>
        </Card>
      </FlexBox>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>Bottom Modal 底部弹窗</h2>
          <OutlinedButton text="打开底部弹窗" tap={() => { bottomModal.setActive(true); }} />
          <bottomModal.BottomModal>
            <Card class={styles.modalContent}>
              <h2>底部弹窗</h2>
              <p>从底部滑出的模态框，适合移动端操作。</p>
              <FilledButton text="关闭" tap={() => { bottomModal.setActive(false); }} />
            </Card>
          </bottomModal.BottomModal>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>Left Modal 左侧弹窗</h2>
          <OutlinedButton text="打开左侧弹窗" tap={() => { leftModal.setActive(true); }} />
          <leftModal.LeftModal>
            <Card class={styles.modalContent}>
              <h2>左侧弹窗</h2>
              <p>从左侧滑出的模态框，适合导航菜单。</p>
              <FilledButton text="关闭" tap={() => { leftModal.setActive(false); }} />
            </Card>
          </leftModal.LeftModal>
        </Card>
      </FlexBox>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>Right Modal 右侧弹窗</h2>
          <OutlinedButton text="打开右侧弹窗" tap={() => { rightModal.setActive(true); }} />
          <rightModal.RightModal>
            <Card class={styles.modalContent}>
              <h2>右侧弹窗</h2>
              <p>从右侧滑出的模态框，适合详情面板。</p>
              <FilledButton text="关闭" tap={() => { rightModal.setActive(false); }} />
            </Card>
          </rightModal.RightModal>
        </Card>

        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>嵌套 Expand</h2>
          <Expand title="父级面板">
            <div class={styles.expandContent}>
              <Expand title="子级面板 1">
                <div class={styles.expandContent}>子级内容 1</div>
              </Expand>
              <Expand title="子级面板 2">
                <div class={styles.expandContent}>子级内容 2</div>
              </Expand>
            </div>
          </Expand>
        </Card>
      </FlexBox>
    </div>
  );
};

export default InteractivePage;
