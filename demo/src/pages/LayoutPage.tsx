import { Card, FlexBox, GridBox, StackBox, CenterBox, Block } from "../../../src/ui/_";

import styles from "./Pages.module.css";

const LayoutPage = () => {
    return (
        <div class={styles.page}>
            <h1 class={styles.title}>布局组件</h1>
            <p class={styles.desc}>展示 FlexBox、GridBox、StackBox、CenterBox、Block 组件</p>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>FlexBox 弹性布局</h2>

                    <h3 class={styles.subTitle}>水平排列 (row)</h3>
                    <FlexBox gap={8} dir="row">
                        <div class={styles.box}>1</div>
                        <div class={styles.box}>2</div>
                        <div class={styles.box}>3</div>
                    </FlexBox>

                    <h3 class={styles.subTitle}>垂直排列 (column)</h3>
                    <FlexBox gap={8} dir="column">
                        <div class={styles.box}>A</div>
                        <div class={styles.box}>B</div>
                        <div class={styles.box}>C</div>
                    </FlexBox>

                    <h3 class={styles.subTitle}>对齐方式</h3>
                    <FlexBox gap={8} jc="space-between" ai="center" class={styles.flexDemo}>
                        <div class={styles.box}>Start</div>
                        <div class={styles.box}>Center</div>
                        <div class={styles.box}>End</div>
                    </FlexBox>

                    <h3 class={styles.subTitle}>自动换行</h3>
                    <FlexBox gap={8} wrap="wrap">
                        <div class={[styles.box, styles.fixedW120]}>Item 1</div>
                        <div class={[styles.box, styles.fixedW120]}>Item 2</div>
                        <div class={[styles.box, styles.fixedW120]}>Item 3</div>
                        <div class={[styles.box, styles.fixedW120]}>Item 4</div>
                        <div class={[styles.box, styles.fixedW120]}>Item 5</div>
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>GridBox 网格布局</h2>

                    <h3 class={styles.subTitle}>基础网格</h3>
                    <GridBox columns="1fr 1fr 1fr" gap={8}>
                        <div class={styles.box}>1</div>
                        <div class={styles.box}>2</div>
                        <div class={styles.box}>3</div>
                        <div class={styles.box}>4</div>
                        <div class={styles.box}>5</div>
                        <div class={styles.box}>6</div>
                    </GridBox>

                    <h3 class={styles.subTitle}>自定义区域</h3>
                    <GridBox columns="1fr 2fr" rows="auto auto" areas="1,1;1,2;2,2" gap={8}>
                        <div class={styles.box}>侧边栏</div>
                        <div class={styles.box} style={{ "min-height": "100px" }}>
                            主内容区
                        </div>
                        <div class={styles.box}>底部</div>
                    </GridBox>
                </Card>
            </FlexBox>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>StackBox 堆叠布局</h2>
                    <StackBox
                        pos={[
                            { x: 0, y: 0 },
                            { x: 20, y: 20 },
                            { x: 40, y: 40 },
                        ]}
                    >
                        <div class={styles.box} style={{ width: "120px", height: "80px", background: "#e91e63" }}>
                            底层
                        </div>
                        <div class={styles.box} style={{ width: "120px", height: "80px", background: "#9c27b0" }}>
                            中层
                        </div>
                        <div class={styles.box} style={{ width: "120px", height: "80px", background: "#673ab7" }}>
                            顶层
                        </div>
                    </StackBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>CenterBox 居中布局</h2>
                    <div class={styles.container200}>
                        <CenterBox>
                            <div class={styles.box}>居中内容</div>
                        </CenterBox>
                    </div>
                </Card>
            </FlexBox>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>Block 区块布局</h2>
                <FlexBox gap={16} wrap="wrap">
                    <Block headerTitle="区块标题" headerActions={<span>...</span>} footerLeft="左侧" footerRight="右侧">
                        <div class={styles.pad16}>这是 Block 组件的内容区域，支持 header 和 footer。</div>
                    </Block>
                    <Block headerTitle="无 Footer">
                        <div class={styles.pad16}>这个 Block 没有 footer 部分。</div>
                    </Block>
                </FlexBox>
            </Card>
        </div>
    );
};

export default LayoutPage;
