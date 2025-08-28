# 工作流执行日志功能部署检查清单

## 🚀 部署前检查

### 1. 数据库准备
- [ ] 确保 PostgreSQL 数据库运行正常
- [ ] 确认数据库用户具有创建表和索引的权限
- [ ] 运行数据库迁移脚本：
  ```sql
  -- 执行 dify_local/api/migrations/workflow_execution_logs_migration.sql
  ```

### 2. 代码文件检查
确认以下新创建/修改的文件存在：

**新增文件**：
- [ ] `dify_local/api/models/workflow_execution_log.py` - 数据模型
- [ ] `dify_local/api/services/workflow_execution_log_service.py` - 服务类
- [ ] `dify_local/api/migrations/workflow_execution_logs_migration.sql` - 数据库脚本
- [ ] `dify_local/WORKFLOW_EXECUTION_LOGS_README.md` - 功能文档

**修改文件**：
- [ ] `dify_local/api/models/__init__.py` - 导入新模型
- [ ] `dify_local/api/core/workflow/graph_engine/graph_engine.py` - 日志收集逻辑
- [ ] `dify_local/api/controllers/console/app/workflow_run.py` - API 接口

### 3. 依赖检查
- [ ] 确认 SQLAlchemy 版本兼容
- [ ] 确认 Flask-RESTful 正常工作
- [ ] 检查导入路径是否正确

## 🔧 部署步骤

### 1. 备份数据库
```bash
pg_dump -h localhost -U postgres dify > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 创建数据库表
```bash
psql -h localhost -U postgres -d dify -f dify_local/api/migrations/workflow_execution_logs_migration.sql
```

### 3. 重启应用服务
```bash
# 停止当前服务
pkill -f "python.*app.py"

# 启动新服务
cd dify_local/api && python app.py
```

### 4. 验证部署
```bash
# 检查数据库表是否创建成功
psql -h localhost -U postgres -d dify -c "\d workflow_execution_logs"

# 检查 API 服务是否正常启动
curl http://localhost:5001/health

# 测试新 API 接口（需要有效的 app_id 和 run_id）
curl "http://localhost:5001/console/api/apps/{app_id}/workflow-runs/{run_id}/execution-logs"
```

## 🧪 功能测试

### 1. 创建测试工作流
- [ ] 创建包含代码节点的工作流
- [ ] 在代码节点中启用流式功能
- [ ] 添加一些 `print()` 语句用于生成日志

### 2. 运行测试
- [ ] 执行工作流并确认运行成功
- [ ] 查看数据库中是否有日志记录：
  ```sql
  SELECT * FROM workflow_execution_logs ORDER BY created_at DESC LIMIT 10;
  ```

### 3. API 测试
- [ ] 测试日志列表 API
- [ ] 测试日志摘要 API
- [ ] 测试各种查询参数（node_id, log_level, 分页等）

## 🔍 故障排查

### 1. 如果没有日志记录
检查：
- [ ] 代码节点是否启用了流式功能
- [ ] 代码是否有实际输出（print 语句）
- [ ] 查看应用日志是否有 "Failed to store execution log" 错误

### 2. 如果 API 接口返回错误
检查：
- [ ] 数据库连接是否正常
- [ ] workflow_run_id 是否存在
- [ ] 用户权限是否正确

### 3. 性能问题
监控：
- [ ] 数据库查询性能
- [ ] 日志表大小增长速度
- [ ] 应用内存使用情况

## 📈 监控建议

### 1. 数据库监控
```sql
-- 监控日志表大小
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename = 'workflow_execution_logs';

-- 监控索引使用情况
SELECT 
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
    AND relname = 'workflow_execution_logs';
```

### 2. 应用监控
- [ ] 监控日志存储的成功/失败比率
- [ ] 监控 API 响应时间
- [ ] 监控内存使用情况

## 🔄 回滚方案

如果部署后出现问题，可以按以下步骤回滚：

### 1. 代码回滚
```bash
git checkout <previous_commit_hash>
```

### 2. 数据库回滚（可选）
```sql
-- 如果需要删除日志表
DROP TABLE IF EXISTS workflow_execution_logs;
```

### 3. 重启服务
```bash
cd dify_local/api && python app.py
```

## ✅ 部署完成确认

- [ ] 数据库表创建成功且具有正确的索引
- [ ] API 接口可以正常访问
- [ ] 工作流执行时能够生成日志记录
- [ ] 可以通过 API 查询到执行日志
- [ ] 应用性能没有明显下降
- [ ] 所有测试用例通过

## 📞 技术支持

如果在部署过程中遇到问题，请：

1. 检查应用日志文件
2. 查看数据库连接状态
3. 确认所有依赖是否正确安装
4. 参考 `WORKFLOW_EXECUTION_LOGS_README.md` 中的详细说明
