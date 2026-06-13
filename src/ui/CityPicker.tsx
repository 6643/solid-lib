import styles from "./CityPicker.module.css";
import { createEffect, createMemo, createSignal, For, type Signal } from "solid-js";
import type { JSX } from "@solidjs/web";
import { SvgIcon } from "./SvgIcon";
import { icon_chevron_right } from "./svgicons";

export const CityPicker = (props: {
    vis: Signal<boolean>;
    cityCode?: number;
    banCodes?: number[];
    change?: (city?: { code: number; names: string[] }) => void;
    children?: JSX.Element;
    url: string;
}) => {
    const [getVis, setVis] = props.vis;
    const [getPickCode, setPickCode] = createSignal(props.cityCode ?? 0);
    const getPickCity = createMemo(() => getCity(getPickCode() ?? 0).reverse());
    const getCityChilds = createMemo(() => getChilds(getPickCode() ?? 0));

    const pick = (city: City) => {
        setPickCode(city.code);
        if (city.code < 100000) return;
        setVis(false);
        props.change?.({ code: getPickCode() ?? 0, names: getPickCity().map((city) => city.name) });
    };

    createEffect(
        () => ({ vis: getVis(), url: props.url, cities: getCities().length }),
        ({ vis, url, cities }) => {
            if (vis && url && cities == 0) initCities(url);
        },
    );

    return <>{props.children}</>;
};

interface City {
    parent: number;
    code: number;
    name: string;
}
const [getCities, setCities] = createSignal<City[]>([]);

export const initCities = async (path: string) => {
    const str = await fetch(path).then((resp) => resp.text());
    const citys = str.split("\n").map((line) => {
        const [parent, code, name] = line.split(",") as [string, string, string];
        return { parent: parseInt(parent), code: parseInt(code), name };
    });
    setCities(citys);
};

const getChilds = (code: number): City[] => {
    const citys = getCities();
    const _citys = citys.filter(({ parent }) => parent == code);
    if (_citys.length > 0) return _citys;
    const city = citys.find((city) => city.code == code);
    return citys.filter(({ parent }) => parent == (city?.parent ?? 0));
};

const getCity = (code: number): City[] => {
    const citys = getCities();
    const c = citys.find((city) => city.code == code);
    const _citys: City[] = [];
    if (!c) return _citys;

    _citys.push(c);
    const b = citys.find((city) => city.code == c.parent);
    if (!b) return _citys;

    _citys.push(b);
    const a = citys.find((city) => city.code == b.parent);
    if (a) _citys.push(a);

    return _citys;
};
