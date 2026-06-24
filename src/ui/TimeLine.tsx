import styles from "./TimeLine.module.css";
import { createSignal, For, Show } from "solid-js";
import { SvgIcon } from "./SvgIcon";
import { icon_expand_all, icon_unfold_less } from "./svgicons";
export const TimeLine = (props: {
    title: string;
    children: { time: number; info: string; url?: string }[];
    visCount?: number;
}) => {
    const initEvents = props.children.slice(0, props.visCount ?? 3);
    const [getEvents, setEvents] = createSignal(initEvents);
    const toggle = () => setEvents(getEvents().length != props.children.length ? props.children : initEvents);

    return (
        <div class={styles.time_line}>
            <div>{props.title}</div>
            <For each={getEvents()}>
                {({ time, info, url }) => (
                    <Show when={url} fallback={<Item time={time} info={info} />}>
                        <a href={url}>
                            <Item time={time} info={info} />
                        </a>
                    </Show>
                )}
            </For>
            <Show when={props.children.length > initEvents.length}>
                <div class={styles.toggle}>
                    <span></span>
                    <div onClick={toggle}>
                        <span>{getEvents().length != props.children.length ? "展开" : "收起"}</span>
                        <SvgIcon
                            color="var(--secondary-fg)"
                            name={getEvents().length != props.children.length ? icon_expand_all : icon_unfold_less}
                        />
                    </div>
                </div>
            </Show>
        </div>
    );
};

const Item = (props: { time: number; info: string; url?: string }) => {
    return (
        <div class={styles.item}>
            <span></span>
            <div>
                <span>{toRecentTime(props.time)}</span>
                <div>{props.info}</div>
            </div>
        </div>
    );
};

const toRecentTime = (timestamp: number): string => {
    const now = new Date();
    const dt = new Date(timestamp * 1000);
    const currentYear = now.getFullYear();
    const todayStart = new Date(currentYear, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const yesterdayStart = new Date(currentYear, now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);

    const dtObj = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);

    const hours = dt.getHours().toString().padStart(2, "0");
    const minutes = dt.getMinutes().toString().padStart(2, "0");
    const timePart = `${hours}:${minutes}`;

    const month = (dt.getMonth() + 1).toString().padStart(2, "0");
    const day = dt.getDate().toString().padStart(2, "0");
    const monthDayPart = `${month}-${day}`;

    const year = dt.getFullYear();
    const shortYear = year.toString().slice(-2);

    if (dtObj.getTime() === todayStart.getTime()) {
        return `今天 ${timePart}`;
    } else if (dtObj.getTime() === yesterdayStart.getTime()) {
        return `昨天 ${timePart}`;
    } else if (year === currentYear) {
        return `${monthDayPart} ${timePart}`;
    }
    return `${shortYear}-${monthDayPart} ${timePart}`;
};
