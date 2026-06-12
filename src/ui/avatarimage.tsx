import styles from "./avatarimage.module.css"


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
    let color: string | undefined
    if (props.color === "blue") color = "#00AEEC"
    else if (props.color === "pink") color = "#fb7299"
    else if (props.color === "white") color = "white"

    return <img class={styles.AvatarImage} src={props.children} style={{ "--size": props.size, "--color": color }} />
}