# 工作流执行日志功能

## 概述

本功能为工作流运行添加了持久化的执行日志记录，允许客户端通过 API 查询工作流运行期间产生的详细日志信息。

## 功能特性

### 1. 日志持久化存储
- 自动收集工作流执行过程中产生的实时日志
- 将日志存储到专用的数据库表 `workflow_execution_logs`
- 支持多种日志级别：`stdout`、`stderr`、`info`、`error`

### 2. 日志内容
每条日志记录包含以下信息：
- **运行节点**: 产生日志的节点ID
- **日志内容**: 具体的日志文本内容
- **日志时间**: 日志产生的时间戳
- **日志级别**: 日志类型（stdout/stderr/info/error）
- **关联信息**: workflow_run_id、app_id、tenant_id等

### 3. API 接口
提供了两个主要的 API 接口来查询执行日志：

#### 查询执行日志列表
```
GET /console/api/apps/{app_id}/workflow-runs/{run_id}/execution-logs
```

**查询参数**：
- `node_id` (可选): 筛选特定节点的日志
- `log_level` (可选): 筛选特定级别的日志 (stdout/stderr/info/error)
- `limit` (可选): 返回记录数限制 (1-1000, 默认100)
- `offset` (可选): 偏移量 (默认0)
- `order_desc` (可选): 是否按时间降序排序 (默认false)

**响应格式**：
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "uuid", 
      "app_id": "uuid",
      "workflow_id": "uuid",
      "workflow_run_id": "uuid",
      "node_id": "string",
      "node_execution_id": "uuid",
      "log_content": "string",
      "log_level": "stdout|stderr|info|error",
      "log_time": "2024-08-21T09:30:00.000Z",
      "created_at": "2024-08-21T09:30:00.000Z"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0,
  "has_more": true
}
```

#### 查询日志摘要
```
GET /console/api/apps/{app_id}/workflow-runs/{run_id}/execution-logs/summary
```

**响应格式**：
```json
{
  "data": [
    {
      "node_id": "1755227639468",
      "log_level": "stdout",
      "log_count": 10,
      "first_log_time": "2024-08-21T09:30:00.000Z",
      "last_log_time": "2024-08-21T09:30:10.000Z"
    }
  ]
}
```

## 使用方法

### 1. 启用代码节点的流式功能

在代码节点配置中启用 "Enable Real-time Logs" 选项：

```json
{
  "streaming": {
    "enabled": true,
    "buffer_timeout": 100,
    "max_log_lines": 1000
  }
}
```

### 2. 运行工作流

当工作流运行时，系统会自动：
- 收集代码节点产生的输出和错误信息
- 解析日志级别和内容
- 存储到 `workflow_execution_logs` 表

### 3. 查询执行日志

使用提供的 API 接口查询日志：

```bash
# 查询所有日志
curl "http://localhost:5001/console/api/apps/{app_id}/workflow-runs/{run_id}/execution-logs"

# 查询特定节点的错误日志
curl "http://localhost:5001/console/api/apps/{app_id}/workflow-runs/{run_id}/execution-logs?node_id=1755227639468&log_level=stderr"

# 查询日志摘要
curl "http://localhost:5001/console/api/apps/{app_id}/workflow-runs/{run_id}/execution-logs/summary"
```

## 数据库设置

### 1. 创建数据库表

运行以下 SQL 脚本创建必要的数据库表：

```sql
-- 参见 dify_local/api/migrations/workflow_execution_logs_migration.sql
```

### 2. 表结构说明

- **主表**: `workflow_execution_logs`
- **索引**: 针对查询优化的多个复合索引
- **关联**: 与 `workflow_runs` 和 `workflow_node_executions` 表关联

## 技术实现

### 1. 数据收集
- 在 `GraphEngine` 中拦截 `RunStreamChunkEvent` 事件
- 解析事件内容，提取日志信息
- 异步存储到数据库，不影响工作流执行性能

### 2. 数据存储
- 使用 `WorkflowExecutionLogService` 服务类处理日志的增删改查
- 支持按节点、日志级别、时间范围等条件查询
- 提供分页和排序功能

### 3. API 实现
- 在现有的 `workflow_run.py` 控制器中添加新的 API 端点
- 使用标准的 Flask-RESTful 资源类
- 支持参数验证和错误处理

## 性能考虑

1. **异步存储**: 日志存储不会阻塞工作流执行
2. **索引优化**: 针对常用查询场景创建了合适的数据库索引  
3. **分页支持**: 大量日志数据的分页查询
4. **错误处理**: 日志存储失败不会影响工作流正常执行

## 后续扩展

当前实现了基础的日志存储和查询功能。后续可以考虑：

1. **实时推送**: 为正在运行的工作流提供 WebSocket 实时日志推送
2. **日志过期**: 自动清理过期的日志数据
3. **日志搜索**: 支持关键词搜索和高级筛选
4. **日志导出**: 支持导出指定格式的日志文件
5. **监控告警**: 基于错误日志的监控和告警机制
