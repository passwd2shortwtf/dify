# 🛠️ Dify 数据库管理指南

## 📋 目录
1. [数据库连接配置](#数据库连接配置)
2. [数据库分析工具](#数据库分析工具)
3. [清理建议](#清理建议)
4. [可视化工具连接](#可视化工具连接)

## 🔗 数据库连接配置

### 快速连接信息
- **主机**: localhost
- **端口**: 5432
- **数据库**: dify
- **用户名**: postgres
- **密码**: difyai123456 (默认开发环境密码)

> 详细配置信息请参考 [`DATABASE_CONFIG_INFO.md`](DATABASE_CONFIG_INFO.md)

## 🔍 数据库分析工具

### 1. 安装依赖
```bash
pip install -r database_analysis_requirements.txt
```

### 2. 运行分析
```bash
# 使用默认配置分析
python database_analysis.py

# 自定义数据库连接
python database_analysis.py --host localhost --port 5432 --database dify --username postgres --password your_password
```

### 3. 分析结果
工具会生成：
- **控制台报告**: 显示表大小、记录数、清理建议
- **清理脚本**: `database_cleanup.sql` - 可执行的SQL清理脚本

### 4. 分析内容

#### 📊 表大小排行
显示占用空间最大的前10个表

#### ⚙️ 工作流表分析
重点分析以下与工作流相关的表：
- `workflow_runs` - 工作流运行记录
- `workflow_node_executions` - 节点执行记录
- `workflow_app_logs` - 应用日志
- `workflow_execution_logs` - 执行日志（新增）
- `messages` - 消息记录
- `conversations` - 对话记录
- `celery_taskmeta` - Celery任务元数据

#### 💡 清理建议
根据数据量和年龄提供优先级分类的清理建议：
- 🔴 **高优先级**: 建议立即清理
- 🟡 **中优先级**: 建议定期清理

## 🧹 清理建议

### 高优先级清理目标

#### 1. Celery任务元数据
```sql
-- 删除7天前的Celery任务记录（临时数据）
DELETE FROM celery_taskmeta 
WHERE date_done < NOW() - INTERVAL '7 days';
```

#### 2. 工作流执行日志
```sql
-- 删除7天前的执行日志（调试数据）
DELETE FROM workflow_execution_logs 
WHERE created_at < NOW() - INTERVAL '7 days';
```

#### 3. 调试运行记录
```sql
-- 删除30天前的调试运行记录
DELETE FROM workflow_runs 
WHERE triggered_from = 'debugging' 
  AND created_at < NOW() - INTERVAL '30 days';
```

### 中优先级清理目标

#### 1. 节点执行记录
```sql
-- 删除90天前的节点执行记录
DELETE FROM workflow_node_executions 
WHERE created_at < NOW() - INTERVAL '90 days';
```

#### 2. 旧消息记录
```sql
-- 删除90天前的消息记录
DELETE FROM messages 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### 清理后优化
```sql
-- 清理后重建统计信息和回收空间
VACUUM ANALYZE;
```

## 🖥️ 可视化工具连接

### 推荐工具

#### 1. pgAdmin (免费)
- 下载地址: https://www.pgadmin.org/
- 功能完整的PostgreSQL管理工具

#### 2. DBeaver (免费)
- 下载地址: https://dbeaver.io/
- 通用数据库管理工具

#### 3. DataGrip (付费)
- JetBrains出品的专业数据库IDE

#### 4. Navicat (付费)
- 商业数据库管理工具

### 连接配置示例 (pgAdmin)

1. **右键 "Servers" → "Register" → "Server"**
2. **General标签页**:
   - Name: Dify Local
3. **Connection标签页**:
   - Host name/address: localhost
   - Port: 5432
   - Maintenance database: dify
   - Username: postgres
   - Password: difyai123456

## ⚠️ 安全注意事项

### 1. 备份重要数据
在执行任何清理操作前，请确保备份重要数据：
```bash
# 完整备份
pg_dump -h localhost -U postgres dify > dify_backup_$(date +%Y%m%d).sql

# 仅备份特定表
pg_dump -h localhost -U postgres --table=workflow_runs dify > workflow_runs_backup.sql
```

### 2. 生产环境注意事项
- 🔒 修改默认密码
- 🌐 限制网络访问
- 📊 监控数据库性能
- 🔄 定期备份

### 3. 测试清理脚本
在生产环境执行前，先在测试环境验证清理脚本：
```sql
-- 查看影响的记录数（不实际删除）
SELECT COUNT(*) FROM workflow_runs 
WHERE triggered_from = 'debugging' 
  AND created_at < NOW() - INTERVAL '30 days';
```

## 📊 监控建议

### 1. 定期运行分析工具
建议每周运行一次数据库分析：
```bash
# 创建定时任务
echo "0 2 * * 1 cd /path/to/dify_local && python database_analysis.py > weekly_db_report.txt 2>&1" | crontab -
```

### 2. 设置监控阈值
- 单表记录数 > 100万条
- 单表大小 > 1GB
- 数据库总大小 > 10GB

### 3. 自动化清理
可以基于分析结果设置自动化清理策略：
```bash
# 示例：自动清理7天前的临时数据
cat << 'EOF' > auto_cleanup.sql
DELETE FROM celery_taskmeta WHERE date_done < NOW() - INTERVAL '7 days';
DELETE FROM workflow_execution_logs WHERE created_at < NOW() - INTERVAL '7 days';
VACUUM ANALYZE;
EOF

# 每日自动执行
echo "0 3 * * * psql -h localhost -U postgres -d dify -f /path/to/auto_cleanup.sql" | crontab -
```

## 🆘 故障排查

### 1. 连接问题
```bash
# 测试数据库连接
psql -h localhost -p 5432 -U postgres -d dify -c "SELECT version();"

# 检查Docker容器状态
docker ps | grep postgres
```

### 2. 性能问题
```sql
-- 查看长时间运行的查询
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- 查看表统计信息
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename IN ('workflow_runs', 'workflow_node_executions');
```

### 3. 空间问题
```sql
-- 查看数据库大小
SELECT pg_size_pretty(pg_database_size('dify'));

-- 查看未使用的空间
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```
