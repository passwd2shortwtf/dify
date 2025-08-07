# 外部链接导航功能

## 概述

新增了一个名为"外部链接"的导航项，与其他导航（探索、工作室、知识库、工具）平级，用于展示各种外部资源和链接。

## 功能特性

- 新增 `ExternalNav` 组件，与其他导航保持一致的样式设计
- 创建了 `/external` 路由页面，支持 Markdown 内容渲染
- 支持国际化，中文显示为"外部链接"，英文显示为"External Links"
- **动态内容加载**: 页面内容从 `public/external-content.md` 文件动态读取
- **实时刷新**: 支持手动刷新和自动刷新功能
- **错误处理**: 加载失败时显示友好的错误信息和默认内容
- **链接处理**: 外部链接自动在新窗口打开
- **响应式设计**: 支持移动端和桌面端

## 文件结构

```
dify_local/web/
├── app/
│   ├── components/header/
│   │   └── external-nav/
│   │       └── index.tsx          # 外部链接导航组件
│   └── (commonLayout)/external/
│       └── page.tsx               # 外部链接页面
├── i18n/
│   ├── zh-Hans/common.ts          # 中文翻译
│   ├── zh-Hant/common.ts          # 繁体中文翻译
│   ├── en-US/common.ts            # 英文翻译
│   ├── ja-JP/common.ts            # 日文翻译
│   └── ko-KR/common.ts            # 韩文翻译
├── public/
│   └── external-content.md        # Markdown 内容文件
└── EXTERNAL_NAV_README.md         # 本说明文件
```

## 使用方法

### 1. 编辑页面内容

编辑 `public/external-content.md` 文件来自定义页面内容：

```markdown
# 外部链接

外部工具与各种相关资源

## DB后台

- [术语表](http://172.26.159.245:7123/table/lang_term)
- [文本表](http://172.26.159.245:7123/table/lang)

## 开发资源

```javascript
// 示例代码
function hello() {
  console.log('Hello, Dify!')
}
```

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2024-01-01 | 初始版本 |

> **注意**: 这是一个示例页面，您可以根据需要修改内容。

---

*最后更新时间: 2024-01-01*
```

### 2. 访问页面

在浏览器中访问 `/external` 路径即可查看外部链接页面。

### 3. 导航显示

外部链接导航项会显示在页面顶部的导航栏中，与其他导航项并列显示。

### 4. 刷新功能

- **手动刷新**: 点击页面右上角的"刷新"按钮
- **自动刷新**: 勾选"自动刷新"选项，可选择刷新间隔（10秒、30秒、1分钟、5分钟）
- **最后更新时间**: 显示内容最后加载的时间

## 技术实现

- 使用 `react-markdown` 和 `remark-gfm` 进行 Markdown 渲染
- 支持表格、代码块、链接等 Markdown 语法
- 动态从 `public/external-content.md` 文件加载内容
- 添加时间戳参数防止浏览器缓存
- 响应式设计，支持移动端和桌面端
- 使用 Tailwind CSS 进行样式设计
- 自定义 Markdown 组件渲染，优化链接和代码块显示

## 自定义

### 修改导航图标

在 `external-nav/index.tsx` 中修改图标：

```tsx
import {
  RiExternalLinkFill,    // 激活状态图标
  RiExternalLinkLine,    // 默认状态图标
} from '@remixicon/react'
```

### 修改页面样式

在 `external/page.tsx` 中修改页面布局和样式。

### 修改自动刷新间隔

在 `external/page.tsx` 中修改 `refreshInterval` 的默认值和选项：

```tsx
const [refreshInterval, setRefreshInterval] = useState(30) // 默认30秒
```

### 添加更多语言支持

在 `i18n/` 目录下的其他语言文件中添加 `external: '翻译文本'` 到 `menus` 对象中。

## 高级功能

### 自动刷新

页面支持自动刷新功能，可以设置不同的刷新间隔：
- 10秒
- 30秒（默认）
- 1分钟
- 5分钟

### 错误处理

当无法加载 `external-content.md` 文件时，页面会：
1. 显示错误信息
2. 显示默认的fallback内容
3. 保持页面功能正常

### 链接处理

- 外部链接（以 `http` 开头）会自动在新窗口打开
- 内部链接保持原有行为
- 所有链接都有适当的 `rel` 属性确保安全性

### 缓存控制

- 使用时间戳参数防止浏览器缓存
- 设置 `Cache-Control` 和 `Pragma` 头部
- 确保每次都能获取最新的内容

## 注意事项

- 确保 `public/external-content.md` 文件存在且格式正确
- 页面内容支持标准的 Markdown 语法
- 导航项会根据用户权限显示（非知识库管理员可见）
- 自动刷新功能会消耗一定的网络资源，建议根据实际需求设置合适的间隔
- 外部链接会在新窗口打开，确保用户体验的一致性 