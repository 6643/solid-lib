import { useLoad } from "../utils/useLoad"


export const LoadMore = <T,>(
    api: (page: number, args?: T) => Promise<boolean>,
    args?: T,
    threshold?: number,
) => {
    let el: HTMLDivElement | undefined
    const { reset } = useLoad(() => el, api, () => args, threshold)

    return {
        reset,
        LoadMore: <span ref={el}></span>
    }
}
