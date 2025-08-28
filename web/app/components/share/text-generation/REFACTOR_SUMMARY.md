# Text Generation 界面重构总结

## 重构目标
对 `share/text-generation/index.tsx` 界面进行重构扩展，实现以下功能：
1. 在Result左侧插入显示应用执行历史列表
2. 重构Result组件，参考workflow/run组件的逻辑
3. 根据选中的执行列表项显示对应run的信息
4. 对正在执行中的run，不显示RESULT tab，转而显示LOG tab

## 新增组件

### 1. ExecutionHistory 组件
**路径**: `dify_local/web/app/components/share/text-generation/execution-history/index.tsx`

**功能**:
- 显示应用执行历史列表
- 支持状态图标显示（运行中、成功、失败、停止）
- 支持折叠/展开功能
- 点击选择运行记录
- 参考 `view-history.tsx` 的设计和交互

**特性**:
- 宽度为 240px，可折叠到 32px
- 显示运行状态、创建者、时间等信息
- 支持无数据状态展示

### 2. EnhancedResult 组件
**路径**: `dify_local/web/app/components/share/text-generation/enhanced-result/index.tsx`

**功能**:
- 重构后的结果展示组件
- 参考 `workflow/run/index.tsx` 的Run组件逻辑
- 支持多个tab：RESULT、LOG、DETAIL、TRACING
- 根据运行状态动态显示tab

**特性**:
- 正在运行时优先显示LOG tab
- 已完成运行显示RESULT tab
- 集成WorkflowLog组件显示实时日志
- 支持停止正在运行的工作流

## 主要修改

### 1. 界面布局调整
在 `dify_local/web/app/components/share/text-generation/index.tsx` 中：
- 修改Result区域为横向布局（flex-row）
- 在workflow模式下添加ExecutionHistory组件
- 使用条件渲染在workflow模式下显示EnhancedResult组件

### 2. 状态管理
新增状态：
```typescript
const [selectedRunId, setSelectedRunId] = useState<string>()
const [workflowLogs, setWorkflowLogs] = useState<any[]>([])

const handleSelectRun = (runId: string) => {
  setSelectedRunId(runId)
}
```

### 3. 国际化支持
在 `zh-Hans/share-app.ts` 和 `en-US/share-app.ts` 中添加：
- `executionHistory`: 执行历史
- `selectRunToView`: 选择运行记录查看详情
- `selectRunToViewDesc`: 从左侧历史列表中选择一条运行记录
- `log`: 日志

## 使用场景

### Workflow 模式（isWorkflow=true）且PC端
- 显示ExecutionHistory组件在左侧
- 使用EnhancedResult组件展示详情
- 支持历史记录选择和详情查看

### 非Workflow模式或移动端
- 保持原有的Result组件逻辑
- 不显示ExecutionHistory组件

## 技术实现

### 组件复用
- 复用 `workflow/run` 下的组件：
  - `OutputPanel`：结果输出展示
  - `ResultPanel`：详细信息展示
  - `TracingPanel`：执行追踪展示
- 复用 `workflow/workflow-log` 组件显示日志

### API集成
- 使用 `fetchWorkflowRunHistory` 获取执行历史
- 使用 `fetchRunDetail` 获取运行详情
- 使用 `fetchTracingList` 获取执行追踪
- 使用 `stopWorkflowRun` 停止运行中的工作流

### 响应式设计
- 仅在PC端（isPC=true）显示执行历史列表
- 移动端保持原有布局和交互

## 兼容性说明
- 重构后保持向后兼容
- 非workflow模式下行为不变
- 移动端体验保持一致
- 批量运行功能不受影响

## 未来优化方向
1. 实时更新执行历史列表
2. 支持执行历史的筛选和搜索
3. 优化LOG tab的实时日志显示
4. 添加更多执行统计信息
5. 支持导出执行历史