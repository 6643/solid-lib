import styles from "./CountDown.module.css"
import { createMemo, createSignal, For, onSettled, onCleanup, Show } from "solid-js"

export const CountDown = (props: {
    value: number
    done?: VoidFunction
}) => {
    const [getVal, setVal] = createSignal(props.value)
    const getHms = createMemo(() => parseTime(getVal()))
    const isSplit = (array: number[], index: number) => {
        const length = array.length;
        const isSecondToLast = (length >= 2) && (index === length - 2)
        const isFourthToLast = (length >= 4) && (index === length - 4)
        return isSecondToLast || isFourthToLast
    }

    onSettled(() => {
        const timer = setInterval(() => {
            if (getVal() > 0) setVal(getVal() - 1)
            if (getVal() == 0) {
                props.done?.()
                clearInterval(timer)
            }
        }, 1000)
        onCleanup(() => clearInterval(timer))
    })


    return <div class={styles.countdown}>
        <For each={getHms()}>{(num, index) =>
            <>
                <Show when={isSplit(getHms(), index())}><span>:</span></Show>
                <Down val={num} />
            </>
        }</For>
    </div>
}



const Down = (props: { val: number }) => {
    return <main class={styles.move}>
        <div>{props.val + 1 > 9 ? 0 : props.val + 1}</div>
        <div>{props.val}</div>
        <div>{props.val - 1 < 0 ? 9 : props.val - 1}</div>
    </main >
}


function parseTime(totalSeconds: number) {
    if (totalSeconds < 1) return [0, 0, 0, 0, 0]
    const hours = Math.floor(totalSeconds / 3600);
    const remainingAfterHours = totalSeconds % 3600;
    const minutes = Math.floor(remainingAfterHours / 60);
    const seconds = remainingAfterHours % 60;

    const formattedHoursDigits = String(hours).split("").map(Number);

    const formattedMinutesDigits = String(minutes).padStart(2, "0").split('').map(Number);
    const formattedSecondsDigits = String(seconds).padStart(2, "0").split('').map(Number);

    return [
        ...formattedHoursDigits,
        ...formattedMinutesDigits,
        ...formattedSecondsDigits
    ];
}