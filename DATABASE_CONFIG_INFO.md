# 🗄️ Dify 数据库配置信息

## 📍 数据库连接信息

### 默认配置（Docker环境）

根据配置文件分析，Dify 使用 PostgreSQL 数据库，默认配置如下：

```
主机: localhost
端口: 5432
用户名: postgres  
密码: difyai123456
数据库名: dify
```

### 🔧 配置文件位置

#### 1. Docker 配置文件
- **主配置**: `dify_local/docker/middleware.env`
- **示例配置**: `dify_local/docker/middleware.env.example`
- **Docker Compose**: `dify_local/docker/docker-compose.middleware-enhanced.yaml`

#### 2. 应用配置文件  
- **数据库配置类**: `dify_local/api/configs/middleware/__init__.py`
- **应用配置**: `dify_local/api/configs/app_config.py`

### 📋 环境变量

数据库连接通过以下环境变量配置：

```bash
DB_HOST=localhost           # 数据库主机地址
DB_PORT=5432               # 数据库端口
DB_USERNAME=postgres       # 数据库用户名
DB_PASSWORD=difyai123456   # 数据库密码
DB_DATABASE=dify          # 数据库名称
```

### 🔗 连接字符串

完整的 SQLAlchemy 连接字符串格式：
```
postgresql://postgres:difyai123456@localhost:5432/dify
```

## 🛠️ 可视化数据库工具连接配置

### 1. pgAdmin
- **Host**: localhost
- **Port**: 5432  
- **Database**: dify
- **Username**: postgres
- **Password**: difyai123456

### 2. DBeaver
```
Database Type: PostgreSQL
Server Host: localhost
Port: 5432
Database: dify
Username: postgres
Password: difyai123456
```

### 3. DataGrip / IntelliJ IDEA
```
Database: PostgreSQL
Host: localhost
Port: 5432
Database: dify
User: postgres
Password: difyai123456
```

### 4. Navicat
```
Connection Type: PostgreSQL
Hostname/IP Address: localhost
Port: 5432
Initial Database: dify
User Name: postgres
Password: difyai123456
```

## 🐳 Docker 环境访问

如果数据库运行在 Docker 容器中，确保：

1. **端口映射已启用**:
   ```yaml
   # 在 docker-compose.middleware-enhanced.yaml 中
   ports:
     - "${EXPOSE_POSTGRES_PORT:-5432}:5432"
   ```

2. **容器外部访问**:
   ```bash
   # 检查容器是否运行
   docker ps | grep postgres
   
   # 检查端口映射
   docker port <postgres_container_name>
   ```

3. **网络连接测试**:
   ```bash
   # 测试连接
   telnet localhost 5432
   
   # 或使用 psql 测试
   psql -h localhost -p 5432 -U postgres -d dify
   ```

## 🔐 安全注意事项

⚠️ **重要**: 默认密码 `difyai123456` 仅适用于开发环境！

### 生产环境建议：
1. 修改默认密码
2. 使用强密码策略
3. 限制数据库访问IP
4. 启用SSL连接
5. 定期备份数据

## 📊 连接池配置

当前 SQLAlchemy 连接池设置：
```python
SQLALCHEMY_POOL_SIZE = 30          # 连接池大小
SQLALCHEMY_MAX_OVERFLOW = 10       # 最大溢出连接数
SQLALCHEMY_POOL_RECYCLE = 3600     # 连接回收时间(秒)
SQLALCHEMY_POOL_PRE_PING = False   # 连接预检查
```

## 🔍 故障排查

### 常见连接问题：

1. **连接被拒绝**:
   - 检查数据库服务是否启动
   - 确认端口映射正确
   - 验证防火墙设置

2. **认证失败**:
   - 确认用户名密码正确
   - 检查用户权限

3. **数据库不存在**:
   - 确认数据库名称 `dify` 已创建
   - 检查初始化脚本是否执行

### 检查命令：
```bash
# 检查Docker容器状态
docker ps | grep -E "(postgres|db)"

# 查看数据库日志
docker logs <postgres_container_name>

# 进入容器检查
docker exec -it <postgres_container_name> psql -U postgres -d dify
```
