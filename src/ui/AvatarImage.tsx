import styles from "./AvatarImage.module.css"


// 在未来这个组件有边框
// 下线状态下边框为灰色
// 在线男生为蓝色
// 在线女生为粉色
// 在线其他为白色



export const AvatarImage = (props: {
    children: string
    size?: 32 | 48 | 64 | 128
    color?: "blue" | "pink" | "white" | "gray"
}) => {
    const getColor = () => {
        if (props.color === "blue") return "#00AEEC"
        if (props.color === "pink") return "#fb7299"
        if (props.color === "white") return "white"
        return undefined
    }

    return <img class={styles.avatar_image} src={props.children} style={{ "--size": props.size, "--color": getColor() }} />
}