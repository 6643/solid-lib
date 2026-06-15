import { createSignal } from "solid-js";
import { Card, FilledButton, IconButton, OutlinedButton, TextButton, Block, FlexBox, SvgIcon } from "../../../src/ui/_";
import {
    icon_add,
    icon_remove,
    icon_favorite,
    icon_star,
    icon_check,
    icon_close,
    icon_search,
    icon_settings,
    icon_home,
    icon_person,
    icon_light_mode,
    icon_dark_mode,
    icon_computer,
    icon_brightness_auto,
    icon_settings_brightness,
    icon_contrast,
    icon_desktop_windows,
    icon_desktop_mac,
    icon_devices,
    icon_monitor,
    icon_laptop_chromebook,
} from "../../../src/ui/svgicons";

import styles from "./Pages.module.css";

const ButtonsPage = () => {
    const [count, setCount] = createSignal(0);

    return (
        <div class={styles.page}>
            <h1 class={styles.title}>按钮组件</h1>
            <p class={styles.desc}>展示所有按钮变体：FilledButton、OutlinedButton、TextButton、IconButton</p>

            <FlexBox gap={16} wrap="wrap">
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Filled Buttons</h2>
                    <FlexBox gap={8} wrap="wrap">
                        <FilledButton text="默认" />
                        <FilledButton text="禁用" disabled />
                        <FilledButton text="自定义颜色" bgColor="#e91e63" />
                        <FilledButton text="圆角" borderRadius={20} />
                        <FilledButton text="带图标" icon={icon_favorite} />
                        <FilledButton
                            text={`点击 ${count()}`}
                            tap={() => {
                                setCount((c) => c + 1);
                            }}
                        />{" "}
                        <FilledButton text="异步操作" tap={() => new Promise((r) => setTimeout(r, 1000))} />
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Outlined Buttons</h2>
                    <FlexBox gap={8} wrap="wrap">
                        <OutlinedButton text="默认" />
                        <OutlinedButton text="禁用" disabled />
                        <OutlinedButton text="自定义颜色" color="#4caf50" />
                        <OutlinedButton text="圆角" borderRadius={20} />
                        <OutlinedButton text="带图标" icon={icon_star} />
                        <OutlinedButton text="异步操作" tap={() => new Promise((r) => setTimeout(r, 1000))} />
                    </FlexBox>
                </Card>
                <hr />
                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Text Buttons</h2>
                    <FlexBox gap={8} wrap="wrap">
                        <TextButton text="默认" />
                        <TextButton text="禁用" disabled />
                        <TextButton text="自定义颜色" color="#ff9800" />
                        <TextButton text="带图标" icon={icon_search} />
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>Icon Buttons</h2>
                    <FlexBox gap={8} wrap="wrap">
                        <IconButton icon={icon_add} />
                        <IconButton icon={icon_remove} />
                        <IconButton icon={icon_favorite} />
                        <IconButton icon={icon_star} />
                        <IconButton icon={icon_check} />
                        <IconButton icon={icon_close} />
                        <IconButton icon={icon_search} />
                        <IconButton icon={icon_settings} />
                        <IconButton icon={icon_home} />
                        <IconButton icon={icon_person} />
                        <IconButton icon={icon_add} disabled />
                    </FlexBox>
                </Card>

                <Card class={styles.card}>
                    <h2 class={styles.cardTitle}>主题 / 设备图标</h2>
                    <FlexBox gap={8} wrap="wrap">
                        <IconButton icon={icon_light_mode} />
                        <IconButton icon={icon_dark_mode} />
                        <IconButton icon={icon_computer} />
                        <IconButton icon={icon_brightness_auto} />
                        <IconButton icon={icon_settings_brightness} />
                        <IconButton icon={icon_contrast} />
                        <IconButton icon={icon_desktop_windows} />
                        <IconButton icon={icon_desktop_mac} />
                        <IconButton icon={icon_devices} />
                        <IconButton icon={icon_monitor} />
                        <IconButton icon={icon_laptop_chromebook} />
                    </FlexBox>
                </Card>
            </FlexBox>

            <Card class={styles.card}>
                <h2 class={styles.cardTitle}>按钮尺寸</h2>
                <FlexBox gap={8} ai="center">
                    <FilledButton text="小" height={28} />
                    <FilledButton text="默认" />
                    <FilledButton text="大" height={48} />
                    <FilledButton text="宽按钮" width={200} />
                </FlexBox>
            </Card>
        </div>
    );
};

export default ButtonsPage;
