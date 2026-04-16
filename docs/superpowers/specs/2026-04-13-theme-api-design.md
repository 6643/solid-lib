# Theme API Design

**Date:** 2026-04-13

## Goal

为 `src/ui/theme.ts` 增加两个全局生效的主题切换函数:

- `setLightTheme()`
- `setDarkTheme()`

这两个函数只负责切换全局 DOM class, 不负责持久化、不读取系统主题、也不引入额外状态管理。

## Scope

### In

- 在 `src/ui/theme.ts` 导出 `setLightTheme()`
- 在 `src/ui/theme.ts` 导出 `setDarkTheme()`
- 作用目标为 `document.documentElement`
- 通过 `classList` 维护 `light` / `dark` 两个互斥 class

### Out

- `localStorage` 持久化
- 自动跟随系统主题
- 新增通用 `setTheme()` API
- 新增 signal/store/context 封装
- 服务端主题注入或 SSR 兼容层

## Public API

```ts
export function setLightTheme(): void;
export function setDarkTheme(): void;
```

语义约束:

- `setLightTheme()` 移除 `dark`, 添加 `light`
- `setDarkTheme()` 移除 `light`, 添加 `dark`
- 两个函数都只修改全局 `html` 元素 class

## Runtime Behavior

### DOM target

主题 class 挂在 `document.documentElement`, 即页面的 `html` 元素。

选择这个目标的原因:

- 作用范围天然是全局
- CSS 变量和全局主题样式通常以 `html` 为根更稳定
- 比挂在 `body` 更适合作为库级默认约定

### Class rules

`light` 与 `dark` 必须保持互斥。

规则如下:

1. `setLightTheme()`:
   - `classList.remove("dark")`
   - `classList.add("light")`
2. `setDarkTheme()`:
   - `classList.remove("light")`
   - `classList.add("dark")`

因此无论调用顺序如何, 最终都只会保留当前主题对应的 class。

## Implementation Notes

实现保持最小化:

- 不抽象额外 helper, 除非文件内为消除重复只保留非常小的局部复用
- 不缓存 DOM 引用之外的主题状态
- 不引入浏览器环境检测之外的额外分支

如果库当前运行前提就是浏览器环境, 则直接访问 `document.documentElement` 即可。

## Testing

至少验证以下行为:

- 调用 `setLightTheme()` 后, `html` 包含 `light` 且不包含 `dark`
- 调用 `setDarkTheme()` 后, `html` 包含 `dark` 且不包含 `light`
- 连续交替调用两个函数时, class 始终保持互斥

如果当前仓库尚未为 `src/ui/theme.ts` 建立单测, 允许先以窄范围实现为主, 再按现有测试模式补齐。

## Risks

- [风险] 若项目已有外部样式依赖其他 class 名, `light` / `dark` 命名需要与现有 CSS 保持一致
- [风险] 若调用发生在非浏览器环境, 直接访问 `document` 会失败；是否需要处理取决于库当前既有运行边界

## Rollback

回退路径很简单:

- 删除 `src/ui/theme.ts` 中新增的两个导出函数
- 恢复调用方原有的主题切换方式
