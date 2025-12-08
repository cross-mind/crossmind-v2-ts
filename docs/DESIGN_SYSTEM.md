# CrossMind Design System

> 📖 **相关文档**：[文档中心](./README.md) | [产品需求文档](./PRD.md) | [业务需求](./requirements/) | [技术架构](./ARCHITECTURE.md)

## Design Philosophy

CrossMind 采用 **Minimal Dense Layout (MDL)** 设计风格，灵感来自 Linear、Vercel 等现代开发工具。核心理念是：**通过布局和层级组织信息，而非装饰性元素**。

## Core Principles

### 1. Structure Over Decoration
- ✅ 使用分隔线 (`divide-y`) 而非卡片边框
- ✅ 利用间距和对齐传达层级关系
- ✅ 最小化背景色、阴影、边框等视觉噪音
- ❌ 避免过度使用 Card、Badge、装饰性图标

### 2. Information Density
- ✅ 单行 Header 集成所有控制项（标题、搜索、过滤器）
- ✅ 表格式列表布局，固定宽度 + 弹性内容
- ✅ Hover 展开详情，默认保持紧凑
- ❌ 避免大量空白和重复的包装元素

### 3. Functional Aesthetics
- ✅ 每个元素都有明确功能
- ✅ 交互反馈简洁明确（subtle hover、transition-colors）
- ✅ 信息优先级清晰（foreground → muted-foreground → muted-foreground/60）
- ❌ 避免纯装饰性的动画和效果

## Layout Patterns

### Pattern 1: Single-Line Header
```tsx
<div className="flex items-center gap-4 px-6 py-3 border-b shrink-0">
  {/* Icon + Title + Stats */}
  <div className="flex items-center gap-2">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <h1 className="text-sm font-medium">Title</h1>
    <span className="text-xs text-muted-foreground/60">·</span>
    <span className="text-xs text-muted-foreground">Count</span>
  </div>

  {/* Controls: Search + Filters */}
  <div className="flex-1 flex items-center gap-3">
    <Input className="flex-1 max-w-md h-8" />
    <div className="flex gap-1">
      <Button variant="ghost" size="sm" className="h-8">Filter</Button>
    </div>
  </div>
</div>
```

### Pattern 2: Table-like List View

**核心思路**：模仿表格的固定列宽 + 弹性内容布局，但用简单的 flex 实现，避免真正的 `<table>` 元素。

**列数建议**：
- ✅ **3 列**：Category (固定宽) + Content (flex-1) + Meta (固定宽)
- ⚠️ **4+ 列**：容易显得拥挤，除非有强烈的功能需求
- ❌ **卡片式堆叠**：信息密度低，不符合 MDL 风格

**实现示例**：
```tsx
<ScrollArea className="flex-1">
  <div className="divide-y divide-border/50">
    {items.map(item => (
      <div className="group flex items-center gap-4 px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors">
        {/* Column 1: Category/Type (Fixed Width) */}
        <div className="flex items-center gap-2 w-24 shrink-0">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-xs text-muted-foreground">{item.category}</span>
        </div>

        {/* Column 2: Main Content (Flexible) */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground line-clamp-1 group-hover:line-clamp-none">
            {item.content}
          </p>
        </div>

        {/* Column 3: Meta Info (Fixed Width, Optional) */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground/60 shrink-0">
          {item.relatedDoc && (
            <>
              <span className="group-hover:text-primary transition-colors">{item.relatedDoc}</span>
              <span>·</span>
            </>
          )}
          <span>{item.date}</span>
        </div>
      </div>
    ))}
  </div>
</ScrollArea>
```

**关键技术点**：
- `line-clamp-1` + `group-hover:line-clamp-none`：默认单行，hover 展开
- `min-w-0`：允许 flex 子元素正确收缩和 truncate
- `shrink-0`：固定列不被压缩
- `divide-y divide-border/50`：行分隔线，比 border 更轻量

### Pattern 3: Inline Metadata with Dividers

**核心原则**：用文本颜色层级 + 圆点分隔符代替 Badge/Tag 组件

```tsx
{/* Good: Inline text with dot separator */}
<div className="flex items-center gap-3 text-xs text-muted-foreground/60">
  <span className="group-hover:text-primary">Document Name</span>
  <span>·</span>
  <span>Dec 6</span>
</div>

{/* Bad: Badge/Tag wrapping */}
<div className="flex gap-2">
  <Badge variant="outline">Document Name</Badge>
  <Badge variant="secondary">Dec 6</Badge>
</div>
```

**何时例外**：
- ✅ 状态指示器（可用圆点 + 文字）：`<div className="h-1.5 w-1.5 rounded-full bg-green-500" />`
- ✅ 交互式过滤器按钮（Header 中）：`<Button variant="ghost">Filter</Button>`
- ❌ 纯展示的分类标签：改用文本 + 圆点

## Typography Hierarchy

### Sizes (使用 Tailwind 标准值)
- **Page Title**: `text-sm font-medium` (不用 text-lg/text-xl)
- **Content**: `text-sm` (主体内容)
- **Meta/Secondary**: `text-xs text-muted-foreground`
- **Tertiary**: `text-xs text-muted-foreground/60`

### Weights
- 仅使用 `font-medium` 和默认 `font-normal`
- 避免 `font-bold` 或 `font-semibold`

## Color Usage

### Text Hierarchy
```css
/* Primary Content */
text-foreground

/* Secondary Info */
text-muted-foreground

/* Tertiary / Timestamps */
text-muted-foreground/60
```

### Interactive States
```css
/* Default */
hover:bg-muted/40

/* Active/Selected */
bg-muted

/* Accent on Hover */
group-hover:text-primary
```

### Category/Status Indicators
- 使用小圆点 (`h-1.5 w-1.5 rounded-full`) + 文字
- 不要用 Badge 包裹，保持 inline

## Spacing System

### Container Padding
- **Horizontal**: `px-6`（统一）
- **Vertical**: `py-3`（列表行）、`py-4`（分组区域）

### Gaps
- **元素间**: `gap-2` 或 `gap-3`
- **分组间**: `gap-4`

### 避免
- ❌ 自定义间距值 (如 `gap-2.5`, `p-3.5`)
- ❌ 过大的 padding (如 `p-6` 在列表项中)

## Component Guidelines

### Use
- ✅ `Button` with `variant="ghost"` or `variant="secondary"`
- ✅ `Input` with minimal styling
- ✅ `ScrollArea` for overflow
- ✅ `Separator` or `divide-y` for sections

### Avoid
- ❌ `Card` 作为列表项容器（改用 `div` + `hover:bg-muted/40`）
- ❌ `Badge` 用于分类标签（改用 `text-xs` + 圆点）
- ❌ 过度使用 `shadow-*` 和 `backdrop-blur`

## Animation & Transitions

### Use
- ✅ `transition-colors` for hover states
- ✅ `duration-200` or `duration-300` (subtle)
- ✅ Simple transforms: `group-hover:translate-x-0.5`

### Avoid
- ❌ Complex animations (`animate-pulse`, `animate-spin` 除非有功能需求)
- ❌ 过长的 duration (`duration-500`+)
- ❌ 多重 transform 叠加

## Implementation Checklist

在设计新页面或重构现有页面时，检查：

- [ ] Header 是否单行，集成了所有控制项？
- [ ] 列表是否使用 `divide-y` 而非 Card？
- [ ] 是否避免了不必要的 Badge/Tag 组件？
- [ ] Hover 效果是否仅用 `bg-muted/40`？
- [ ] 是否使用标准的 `text-sm`/`text-xs` 而非自定义尺寸？
- [ ] 间距是否使用标准值（2, 3, 4, 6）？
- [ ] 是否有纯装饰性元素可以移除？

## 适用场景

### MDL 表格布局适合：
- ✅ 记忆/日志/历史记录列表
- ✅ 文档/文件列表
- ✅ 通知/更新流
- ✅ 任何需要快速扫描的信息列表

### 不适合场景（需要其他布局）：
- ❌ Kanban 看板（用列式分组）
- ❌ 数据可视化（用图表）
- ❌ 富媒体内容（用网格/画廊）
- ❌ 表单输入（用垂直堆叠）

## Examples

参考以下页面的实现：
- ✅ `src/pages/ProjectMemoryPage.tsx` - 标准的 MDL 3列布局
- 🔄 `src/pages/TaskBoardPage.tsx` - Kanban 布局（保持不变）
- 🔄 `src/pages/IdeaInputPage.tsx` - 待应用 MDL 到历史记录部分
- 🔄 `src/pages/DevDashboardPage.tsx` - 待应用 MDL 到任务/日志列表
