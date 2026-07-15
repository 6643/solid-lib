import styles from "./CityPicker.module.css";
import { createMemo, createSignal, createEffect, For, Show, type Signal, untrack } from "solid-js";
import type { Element } from "solid-js";
import { SvgIcon } from "./SvgIcon";
import { icon_chevron_right } from "./svgicons";

interface City {
    parent: number;
    code: number;
    name: string;
}

const [getCities, setCities] = createSignal<City[]>([]);

export const initCities = async (path: string) => {
    const str = await fetch(path).then((resp) => resp.text());
    const citys = str
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [parent, code, name] = line.split(",") as [string, string, string];
            return { parent: parseInt(parent, 10), code: parseInt(code, 10), name };
        })
        .filter((city) => Number.isFinite(city.parent) && Number.isFinite(city.code) && city.name);
    setCities(citys);
};

const getCityPath = (code: number): City[] => {
    const citys = getCities();
    const path: City[] = [];
    let current = citys.find((city) => city.code === code);
    while (current) {
        path.push(current);
        current = citys.find((city) => city.code === current!.parent);
    }
    return path;
};

export const CityPicker = (props: {
    vis: Signal<boolean>;
    cityCode?: number;
    banCodes?: number[];
    change?: (city?: { code: number; names: string[] }) => void;
    children?: Element;
    url: string;
}) => {
    const [getVis, setVis] = props.vis;
    const [getPickCode, setPickCode] = createSignal(untrack(() => props.cityCode) ?? 0);

    const getBanned = createMemo(() => new Set(props.banCodes ?? []));
    const getBreadcrumb = createMemo(() => getCityPath(getPickCode()).reverse());
    const getOptions = createMemo(() => {
        const parent = getPickCode();
        const banned = getBanned();
        return getCities().filter((city) => city.parent === parent && !banned.has(city.code));
    });

    const pick = (city: City) => {
        setPickCode(city.code);
        // Intermediate admin codes are < 100000; leaf districts are selected and close.
        if (city.code < 100000) return;
        setVis(false);
        props.change?.({
            code: city.code,
            names: getCityPath(city.code)
                .reverse()
                .map((c) => c.name),
        });
    };

    const toBreadcrumb = (code: number) => {
        setPickCode(code);
    };

    createEffect(
        () => props.cityCode,
        (code) => {
            if (code != null) setPickCode(code);
        },
    );

    createEffect(
        () => ({ open: getVis(), url: props.url, empty: getCities().length === 0 }),
        ({ open, url, empty }) => {
            if (open && url && empty) void initCities(url);
        },
    );

    return (
        <>
            {props.children}
            <Show when={getVis()}>
                <div class={styles.CityPicker}>
                    <nav>
                        <div onClick={() => toBreadcrumb(0)}>全部</div>
                        <For each={getBreadcrumb()}>
                            {(city) => (
                                <>
                                    <span>
                                        <SvgIcon size={20} name={icon_chevron_right} />
                                    </span>
                                    <div onClick={() => toBreadcrumb(city.code)}>{city.name}</div>
                                </>
                            )}
                        </For>
                    </nav>
                    <main>
                        <For each={getOptions()}>
                            {(city) => (
                                <div onClick={() => pick(city)}>
                                    <span>{city.name}</span>
                                    {city.code < 100000 ? <SvgIcon size={20} name={icon_chevron_right} /> : null}
                                </div>
                            )}
                        </For>
                    </main>
                </div>
            </Show>
        </>
    );
};
