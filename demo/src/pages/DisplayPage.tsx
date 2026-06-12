import { createSignal, For } from "solid-js";
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
          <Counter
            value={counterVal()}
            change={setCounterVal}
            min={0}
            max={99}
          />
          <p class={styles.note}>当前值: {counterVal()}（范围 0-99）</p>
        </Card>
      </FlexBox>

      <FlexBox gap={16} wrap="wrap">
        <Card class={styles.card}>
          <h2 class={styles.cardTitle}>AvatarImage 头像</h2>
          <FlexBox gap={12} wrap="wrap" ai="center">
            <AvatarImage
              size={32}
              color="blue"
            >
              https://api.dicebear.com/7.x/avataaars/svg?seed=1
            </AvatarImage>
            <AvatarImage
              size={48}
              color="pink"
            >
              https://api.dicebear.com/7.x/avataaars/svg?seed=2
            </AvatarImage>
            <AvatarImage
              size={64}
              color="white"
            >
              https://api.dicebear.com/7.x/avataaars/svg?seed=3
            </AvatarImage>
            <AvatarImage
              size={128}
              color="gray"
            >
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
        <div style={{ height: "300px", overflow: "auto" }}>
          <ListBox items={listItems} overscan={10}>
            {(item) => (
              <div class={styles.listItem}>
                <strong>{item.name}</strong>
                <span>{item.desc}</span>
              </div>
            )}
          </ListBox>
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
    </div>
  );
};

export default DisplayPage;
