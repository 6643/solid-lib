# solid-lib

`solid-lib` 当前包含两个核心子项目:

- [builder](./src/builder/README.md)
  面向 Bun + Solid 的最小构建与开发工具链
- [route](./src/route/README.md)
  面向静态路径的最小 SPA route 能力
- [ui](./src/ui/README.md)
  面向亮暗模式与主题变量的最小 UI 主题能力

## 导入约束

- 不支持 `import ... from "solid-lib"`
- builder 只能从 `solid-lib/builder` 导入
- route 只能从 `solid-lib/route` 导入
- ui 只能从 `solid-lib/ui` 导入
- 样式只能从 `solid-lib/ui.css` 导入
