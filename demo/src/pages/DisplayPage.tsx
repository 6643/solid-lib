import { createSignal, createMemo } from "solid-js";
import {
    Card,
    FlexBox,
    CountDown,
    Counter,
    TimeLine,
    AvatarImage,
    ImagePlayer,
    ListBox,
    SortListBox,
    SvgIcon,
    TextInput,
    NumberInput,
    CaptchaInput,
} from "../../../src/ui/_";
import { icon_drag_handle, icon_add, icon_remove } from "../../../src/ui/svgicons";

import styles from "./Pages.module.css";

interface TodoItem {
    id: number;
    text: string;
}

const DisplayPage = () => {
    const [counterVal, setCounterVal] = createSignal(1);
    const [sortItems, setSortItems] = createSignal<TodoItem[]>([
        { id: 1, text: "学习 SolidJS" },
        { id: 2, text: "编写 UI 组件" },
        { id: 3, text: "创建 Demo 应用" },
        { id: 4, text: "测试组件功能" },
        { id: 5, text: "优化性能" },
    ]);

    const now = Math.floor(Date.now() / 1000);
    const timelineEvents = [
        { time: now - 3600, info: "1小时前的事件" },
        { time: now - 7200, info: "2小时前的事件" },
        { time: now - 86400, info: "昨天的事件" },
        { time: now - 172800, info: "前天的事件" },
        { time: now - 259200, info: "3天前的事件" },
        { time: now - 345600, info: "4天前的事件" },
    ];

    const listItems = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `项目 ${i + 1}`,
        desc: `这是第 ${i + 1} 个项目的描述`,
    }));

    const [code4, setCode4] = createSignal("");
    const [code6, setCode6] = createSignal("");
    const [listFilter, setListFilter] = createSignal("");
    const [listIndex, setListIndex] = createSignal(0);
    const filteredCount = createMemo(() => {
        const q = listFilter();
        return q ? listItems.filter((item) => item.name.includes(q)).length : listItems.length;
    });

    return (
        <div class={styles.page}>
            <h1 class={styles.title}>展示组件</h1>
            <p class={styles.desc}>展示 CountDown、Counter、TimeLine、AvatarImage、ImagePlayer、ListBox、SortListBox</p>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>CountDown 倒计时</h2>
                    <CountDown value={300} done={() => console.log("倒计时完成!")} />
                    <p class={styles.note}>5分钟倒计时（300秒）</p>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Counter 计数器</h2>
                    <Counter value={counterVal()} change={setCounterVal} min={0} max={99} />
                    <p class={styles.note}>当前值: {counterVal()}（范围 0-99）</p>
                </Card>
            </FlexBox>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>AvatarImage 头像</h2>
                    <FlexBox gap={12} wrap="wrap" ai="center">
                        <AvatarImage size={32} color="blue">
                            https://api.dicebear.com/7.x/avataaars/svg?seed=1
                        </AvatarImage>
                        <AvatarImage size={48} color="pink">
                            https://api.dicebear.com/7.x/avataaars/svg?seed=2
                        </AvatarImage>
                        <AvatarImage size={64} color="white">
                            https://api.dicebear.com/7.x/avataaars/svg?seed=3
                        </AvatarImage>
                        <AvatarImage size={128} color="gray">
                            https://api.dicebear.com/7.x/avataaars/svg?seed=4
                        </AvatarImage>
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>SvgIcon 图标</h2>
                    <FlexBox gap={12} wrap="wrap">
                        <SvgIcon name={icon_add} size={24} />
                        <SvgIcon name={icon_remove} size={24} />
                        <SvgIcon name={icon_drag_handle} size={24} />
                    </FlexBox>
                    <p class={styles.note}>支持自定义 size 和 color</p>
                </Card>
            </FlexBox>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>TimeLine 时间线</h2>
                <TimeLine title="最近活动" visCount={3}>
                    {timelineEvents}
                </TimeLine>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>ListBox 虚拟列表（1000项）</h2>
                <FlexBox gap={8} ai="center" wrap="wrap" style={{ "margin-bottom": "8px" }}>
                    <TextInput label="过滤" value={listFilter()} changed={setListFilter} />
                    <NumberInput
                        label="跳转到"
                        value={listIndex()}
                        changed={setListIndex}
                        min={0}
                        max={filteredCount() - 1}
                        step={1}
                    />
                    <span
                        style={{
                            "font-size": "12px",
                            color: "var(--secondary-fg)",
                            "align-self": "flex-end",
                            "padding-bottom": "8px",
                        }}
                    >
                        共 {filteredCount()} 项
                    </span>
                </FlexBox>
                <div class={styles.container300}>
                    <ListBox
                        items={listItems}
                        index={listIndex()}
                        changed={setListIndex}
                        filter={listFilter() ? (item) => item.name.includes(listFilter()) : undefined}
                        children={(item) => (
                            <div class={styles.listItem}>
                                <strong>{item.name}</strong>
                                <span>{item.desc}</span>
                            </div>
                        )}
                    />
                </div>
            </Card>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>SortListBox 可排序列表</h2>
                <SortListBox
                    items={sortItems()}
                    hookChange={(newItems) => setSortItems(newItems)}
                    renderItem={(item) => (
                        <div class={styles.sortItem}>
                            <span class={styles.sortItemId}>#{item.id}</span>
                            <span>{item.text}</span>
                        </div>
                    )}
                />
            </Card>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>CaptchaInput 验证码（4位）</h2>
                    <CaptchaInput label="短信验证码" length={4} value={code4()} changed={setCode4} />
                    <p class={styles.note}>当前值: {code4() || "（未输入）"}</p>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>CaptchaInput 验证码（6位）</h2>
                    <CaptchaInput label="邮箱验证码" length={6} value={code6()} changed={setCode6} />
                    <p class={styles.note}>当前值: {code6() || "（未输入）"}</p>
                </Card>
            </FlexBox>
        </div>
    );
};

export default DisplayPage;
