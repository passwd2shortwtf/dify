# 🚀 工作流执行日志表迁移指南

## 📋 概述

本指南将帮助您执行数据库迁移，创建新的 `workflow_execution_logs` 表，以支持工作流执行日志的持久化存储功能。

## 🎯 迁移目标

迁移将创建以下内容：
- ✅ **`workflow_execution_logs` 表** - 存储工作流执行日志
- ✅ **3个优化索引** - 提高查询性能
- ✅ **表和列注释** - 便于理解和维护

## 📁 迁移脚本文件

提供了多种不同环境的迁移脚本：

| 脚本文件 | 适用环境 | 特点 |
|---------|---------|------|
| `migrate_quick.py` | 任何有Python的环境 | 🚀 **推荐** - 一键执行，无需参数 |
| `run_migration.py` | Python环境 | 功能完整，支持自定义参数 |
| `run_migration.sh` | Linux/macOS | Shell脚本，使用psql命令 |
| `run_migration.ps1` | Windows PowerShell | PowerShell脚本，彩色输出 |
| `run_migration.bat` | Windows 命令提示符 | 批处理脚本，兼容性最好 |

## 🚀 快速开始（推荐方式）

### 1. 一键执行迁移

最简单的方式，适合大多数用户：

```bash
python migrate_quick.py
```

这个脚本会：
- ✅ 自动检测SQL文件位置
- ✅ 使用默认数据库配置
- ✅ 提供友好的用户界面
- ✅ 自动验证迁移结果

### 2. 运行效果

```
🚀 Dify 工作流执行日志表 - 一键迁移
==================================================
🔍 使用配置:
  📄 SQL文件: D:\MyProject\dify_dev\dify_local\api\migrations\workflow_execution_logs_migration.sql
  🗄️  数据库: dify
  🖥️  主机: localhost:5432
  👤 用户: postgres

❓ 确认执行迁移？(y/N): y

✅ 成功连接到数据库: dify
🚀 开始执行数据库迁移...
📄 正在执行SQL文件: ...
✅ SQL执行成功
🔍 验证迁移结果...
✅ 表结构验证成功
📊 表列数: 11
📇 索引数: 3

🎉 数据库迁移成功完成！
```

## ⚙️ 高级使用方式

### Python脚本（完整版）

适合需要自定义配置的用户：

```bash
# 使用默认配置
python run_migration.py

# 自定义数据库连接
python run_migration.py --host localhost --port 5432 --database dify --username postgres --password your_password

# 强制重新创建表（如果已存在）
python run_migration.py --force

# 自定义SQL文件路径
python run_migration.py --sql-file /path/to/migration.sql
```

### Shell脚本（Linux/macOS）

```bash
# 添加执行权限
chmod +x run_migration.sh

# 使用默认配置
./run_migration.sh

# 自定义配置
./run_migration.sh --host localhost --port 5432 --database dify --username postgres --password your_password

# 强制模式
./run_migration.sh --force
```

### PowerShell脚本（Windows）

```powershell
# 使用默认配置
.\run_migration.ps1

# 自定义配置
.\run_migration.ps1 -Host localhost -Port 5432 -Database dify -Username postgres -Password your_password

# 强制模式
.\run_migration.ps1 -Force
```

### 批处理脚本（Windows）

```cmd
# 双击运行或命令行执行
run_migration.bat
```

## 🔧 依赖要求

### Python脚本依赖

```bash
# 安装必需的Python包
pip install psycopg2-binary

# 或者使用requirements文件
pip install -r database_analysis_requirements.txt
```

### 系统依赖

所有脚本都需要 **PostgreSQL 客户端工具** (`psql` 命令)：

#### Windows
- 下载并安装: https://www.postgresql.org/download/windows/
- 或使用包管理器: `winget install PostgreSQL.PostgreSQL`

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

#### Linux (CentOS/RHEL)
```bash
sudo yum install postgresql
# 或新版本
sudo dnf install postgresql
```

#### macOS
```bash
# 使用 Homebrew
brew install postgresql

# 使用 MacPorts
sudo port install postgresql15
```

## 📊 迁移验证

迁移完成后，脚本会自动验证：

### 1. 表创建验证
- ✅ 检查 `workflow_execution_logs` 表是否存在
- ✅ 验证表结构（11个列）

### 2. 索引验证
- ✅ `workflow_execution_log_run_idx` - 运行ID索引
- ✅ `workflow_execution_log_node_idx` - 节点ID索引  
- ✅ `workflow_execution_log_level_idx` - 日志级别索引

### 3. 手动验证（可选）

```sql
-- 检查表是否存在
SELECT tablename FROM pg_tables WHERE tablename = 'workflow_execution_logs';

-- 检查表结构
\d workflow_execution_logs

-- 检查索引
SELECT indexname FROM pg_indexes WHERE tablename = 'workflow_execution_logs';

-- 测试插入（可选）
INSERT INTO workflow_execution_logs (
    tenant_id, app_id, workflow_id, workflow_run_id, 
    node_id, log_content, log_level, log_time
) VALUES (
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    'test_node', 'Test log content', 'stdout', NOW()
);
```

## ⚠️ 注意事项

### 1. 备份建议
虽然此迁移只创建新表，但建议执行前备份：

```bash
# 完整备份
pg_dump -h localhost -U postgres dify > backup_before_migration.sql

# 仅备份表结构
pg_dump -h localhost -U postgres --schema-only dify > schema_backup.sql
```

### 2. 权限要求
确保数据库用户具有以下权限：
- ✅ 创建表权限 (`CREATE`)
- ✅ 创建索引权限
- ✅ 添加注释权限

### 3. 存储空间
新表初始占用空间很小，但随着使用会增长：
- 空表: ~8KB
- 10万条记录: ~50-100MB（取决于日志内容长度）

### 4. 重复执行
如果表已存在：
- 默认会停止执行并提示
- 使用 `--force` 或 `-Force` 参数强制重新创建
- **警告**: 强制模式会删除现有数据！

## 🔍 故障排查

### 1. 连接失败
```
❌ 数据库连接失败
```

**解决方案**:
- 检查数据库服务是否启动
- 验证连接参数（主机、端口、用户名、密码）
- 确认防火墙设置
- 检查Docker容器状态（如果使用Docker）

### 2. 权限错误
```
ERROR: permission denied for schema public
```

**解决方案**:
```sql
-- 授予创建权限
GRANT CREATE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON DATABASE dify TO postgres;
```

### 3. psql命令未找到
```
❌ psql 命令未找到
```

**解决方案**:
- 安装PostgreSQL客户端工具（见上面的安装说明）
- 确保 `psql` 在系统PATH中
- Windows用户可能需要重启命令提示符

### 4. 文件路径错误
```
❌ SQL文件不存在
```

**解决方案**:
- 确保在正确的目录执行脚本
- 检查 `api/migrations/workflow_execution_logs_migration.sql` 文件是否存在
- 使用绝对路径或 `--sql-file` 参数指定正确路径

## 🎉 成功后的下一步

迁移成功后，您可以：

### 1. 测试新功能
- 运行工作流应用
- 在代码节点中启用流式日志功能
- 查看实时日志是否正常显示

### 2. 查询执行日志
```bash
# 使用API查询日志
curl "http://localhost:5001/console/api/apps/{app_id}/workflow-runs/{run_id}/execution-logs"
```

### 3. 监控数据库
```bash
# 运行数据库分析
python database_analysis.py
```

### 4. 管理日志数据
- 设置日志清理策略
- 监控表大小增长
- 根据需要调整索引

## 📚 相关文档

- [工作流执行日志功能文档](WORKFLOW_EXECUTION_LOGS_README.md)
- [数据库管理指南](DATABASE_MANAGEMENT_GUIDE.md)
- [部署检查清单](DEPLOYMENT_CHECKLIST.md)
