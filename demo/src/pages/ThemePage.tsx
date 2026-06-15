import { Card, FlexBox, FilledButton, OutlinedButton, TextButton, TextInput, Counter, ThemeSwitch, AccentSelector } from "../../../src/ui/_";
import styles from "./Pages.module.css";

const ThemePage = () => {
    return (
        <div class={styles.page}>
            <h1 class={styles.title}>主题设置</h1>
            <p class={styles.desc}>切换亮暗模式，选择强调色</p>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>亮暗模式</h2>
                <FlexBox gap={16} ai="center">
                    <ThemeSwitch />
                    <span class={styles.note}>点击切换</span>
                </FlexBox>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>强调色</h2>
                <FlexBox gap={16} ai="center">
                    <AccentSelector />
                </FlexBox>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>组件预览</h2>
                <FlexBox gap={16} dir="column">
                    <FlexBox gap={8} wrap="wrap">
                        <FilledButton text="强调按钮" />
                        <OutlinedButton text="描边按钮" />
                        <TextButton text="文字按钮" />
                    </FlexBox>
                    <TextInput label="输入框" value="示例文本" changed={() => {}} />
                    <Counter value={42} min={0} max={99} />
                </FlexBox>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>色彩层级</h2>
                <FlexBox gap={8} dir="column">
                    <div class={styles.colorSwatch} style={{ background: "var(--bg-page)", color: "var(--fg-primary)" }}>
                        page — 页面背景
                    </div>
                    <div class={styles.colorSwatch} style={{ background: "var(--bg-base)", color: "var(--fg-primary)" }}>
                        base — 卡片、容器
                    </div>
                    <div class={styles.colorSwatch} style={{ background: "var(--bg-raised)", color: "var(--fg-primary)" }}>
                        raised — 按钮、凸起
                    </div>
                    <div class={styles.colorSwatch} style={{ background: "var(--bg-inset)", color: "var(--fg-secondary)" }}>
                        inset — 输入框、凹陷
                    </div>
                    <div class={styles.colorSwatch} style={{ background: "var(--disabled-color)", color: "var(--fg-secondary)" }}>
                        disabled — 禁用状态
                    </div>
                </FlexBox>
            </Card>
        </div>
    );
};

export default ThemePage;
