import { createSignal } from "solid-js";
import {
    Card,
    FlexBox,
    FilledButton,
    OutlinedButton,
    Expand,
    BottomModal,
    TopModal,
    LeftModal,
    RightModal,
} from "../../../src/ui/_";

import styles from "./Pages.module.css";

const InteractivePage = () => {
    const [isBottomOpen, setBottomOpen] = createSignal(false);
    const [isTopOpen, setTopOpen] = createSignal(false);
    const [isLeftOpen, setLeftOpen] = createSignal(false);
    const [isRightOpen, setRightOpen] = createSignal(false);

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
                    <h2 class={styles.cardTitle}>Bottom Modal 底部弹窗</h2>
                    <FilledButton
                        text="打开底部弹窗"
                        tap={() => {
                            setBottomOpen(true);
                        }}
                    />
                    <BottomModal
                        height="60vh"
                        open={isBottomOpen()}
                        onClose={() => {
                            setBottomOpen(false);
                        }}
                    >
                        <Card class={styles.modalContent}>
                            <h2>底部弹窗</h2>
                            <p>从底部滑出的模态框，覆盖全屏。</p>
                            <FilledButton
                                text="关闭"
                                tap={() => {
                                    setBottomOpen(false);
                                }}
                            />
                        </Card>
                    </BottomModal>
                </Card>
            </FlexBox>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Bottom Modal 底部弹窗</h2>
                    <OutlinedButton
                        text="打开顶部弹窗"
                        tap={() => {
                            setTopOpen(true);
                        }}
                    />
                    <TopModal
                        open={isTopOpen()}
                        onClose={() => {
                            setTopOpen(false);
                        }}
                    >
                        <Card class={styles.modalContent}>
                            <h2>顶部弹窗</h2>
                            <p>从上方落入的模态框，居中显示。</p>
                            <FilledButton
                                text="关闭"
                                tap={() => {
                                    setTopOpen(false);
                                }}
                            />
                        </Card>
                    </TopModal>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Left Modal 左侧弹窗</h2>
                    <OutlinedButton
                        text="打开左侧弹窗"
                        tap={() => {
                            setLeftOpen(true);
                        }}
                    />
                    <LeftModal
                        open={isLeftOpen()}
                        onClose={() => {
                            setLeftOpen(false);
                        }}
                    >
                        <Card class={styles.modalContent}>
                            <h2>左侧弹窗</h2>
                            <p>从左侧滑出的模态框，适合导航菜单。</p>
                            <FilledButton
                                text="关闭"
                                tap={() => {
                                    setLeftOpen(false);
                                }}
                            />
                        </Card>
                    </LeftModal>
                </Card>
            </FlexBox>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Right Modal 右侧弹窗</h2>
                    <OutlinedButton
                        text="打开右侧弹窗"
                        tap={() => {
                            setRightOpen(true);
                        }}
                    />
                    <RightModal
                        open={isRightOpen()}
                        onClose={() => {
                            setRightOpen(false);
                        }}
                    >
                        <Card class={styles.modalContent}>
                            <h2>右侧弹窗</h2>
                            <p>从右侧滑出的模态框，适合详情面板。</p>
                            <FilledButton
                                text="关闭"
                                tap={() => {
                                    setRightOpen(false);
                                }}
                            />
                        </Card>
                    </RightModal>
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
