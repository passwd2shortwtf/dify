# 🚀 Dify 增强版配置指南

## 🎯 概述

这是一个增强版的 Dify 中间件配置，支持在**一个 YAML 文件**中灵活切换：
- ✅ **官方 Sandbox** (生产模式)
- ✅ **开发版 Sandbox** (开发模式)

## 🔧 核心特性

### 🎛️ Profile 切换
- **`production/official`**: 使用官方 sandbox 镜像
- **`development/dev`**: 使用本地构建的开发版 sandbox

### 🌐 智能配置
- **环境变量驱动**: 通过 `.env` 文件控制
- **动态网络配置**: 自动调整内部服务发现
- **开发友好**: 开发模式额外暴露调试端口

### 🛠️ 管理工具
- **一键脚本**: `dify-manager.ps1` 统一管理
- **状态监控**: 实时查看系统健康状态
- **日志聚合**: 集中查看所有服务日志

## 📋 快速开始

### 1. 准备配置文件

```powershell
# 复制环境变量模板
Copy-Item middleware-dev.env middleware.env

# 编辑配置（可选）
notepad middleware.env
```

### 2. 启动官方版本

```powershell
# 方法A: 使用管理脚本（推荐）
.\dify-manager.ps1 start official

# 方法B: 直接使用 docker-compose
docker-compose -f docker-compose.middleware-enhanced.yaml --profile production up -d
```

### 3. 切换到开发版本

```powershell
# 一键切换
.\dify-manager.ps1 switch dev

# 或者重新构建并启动
.\dify-manager.ps1 start dev -Build
```

## 🎮 管理命令

### 基本操作

```powershell
# 启动服务（官方版本）
.\dify-manager.ps1 start official

# 启动服务（开发版本）
.\dify-manager.ps1 start dev

# 停止服务
.\dify-manager.ps1 stop

# 重启服务
.\dify-manager.ps1 restart

# 切换模式
.\dify-manager.ps1 switch dev
```

### 高级操作

```powershell
# 重新构建并启动
.\dify-manager.ps1 start dev -Build

# 清理数据并启动
.\dify-manager.ps1 start official -Clean

# 查看系统状态
.\dify-manager.ps1 status

# 查看所有日志
.\dify-manager.ps1 logs

# 查看特定服务日志
.\dify-manager.ps1 logs -Service sandbox-dev
```

## ⚙️ 配置详解

### 环境变量文件 (`middleware.env`)

```bash
# 🔧 Sandbox Mode Configuration
COMPOSE_PROFILES=production          # 当前使用的 profile
DEV_SANDBOX_PATH=../../dify-sandbox  # 开发版 sandbox 路径
DEV_DEBUG_PORT=2345                 # 调试端口
DEV_LOG_LEVEL=debug                 # 开发日志级别

# 其他配置...
```

### Profile 说明

| Profile | 容器名 | 镜像来源 | 用途 | 额外端口 |
|---------|--------|----------|------|----------|
| `production` | `sandbox-official` | 官方镜像 | 生产环境 | 无 |
| `development` | `sandbox-dev` | 本地构建 | 开发调试 | 2345, 9090 |

### 网络配置

```yaml
# 自动服务发现
SSRF_SANDBOX_HOST: sandbox-official  # 生产模式
SSRF_SANDBOX_HOST: sandbox-dev       # 开发模式
```

## 🔍 状态检查

### 查看当前配置

```powershell
# 查看完整状态
.\dify-manager.ps1 status

# 查看容器状态
docker-compose -f docker-compose.middleware-enhanced.yaml ps
```

### 健康检查

```powershell
# Sandbox API
curl http://localhost:8194/health

# PostgreSQL
docker exec dify_local_docker_db_1 pg_isready

# Redis
docker exec dify_local_docker_redis_1 redis-cli ping
```

## 🐛 调试开发版 Sandbox

### 连接调试器

```powershell
# 启动开发版
.\dify-manager.ps1 start dev

# 在 VSCode/Cursor 中连接到 localhost:2345
# 或使用 dlv 命令行工具
```

### 查看开发日志

```powershell
# 实时日志
.\dify-manager.ps1 logs -Service sandbox-dev

# 查看容器内部
docker exec -it dify-sandbox-dev bash
```

### 代码热重载

开发版 sandbox 支持代码热重载：
1. 修改源码文件
2. 容器内自动重新编译
3. 服务自动重启

## 🛠️ 故障排除

### 常见问题

#### 1. 端口冲突

```powershell
# 检查端口占用
netstat -an | findstr 8194

# 修改 middleware.env 中的端口配置
EXPOSE_SANDBOX_PORT=8195
```

#### 2. 容器无法启动

```powershell
# 查看错误日志
.\dify-manager.ps1 logs

# 重新构建镜像
.\dify-manager.ps1 start dev -Build -Clean
```

#### 3. 网络连接问题

```powershell
# 检查网络状态
docker network ls
docker network inspect dify_local_docker_ssrf_proxy_network

# 重置网络
.\dify-manager.ps1 stop
docker network prune
.\dify-manager.ps1 start
```

#### 4. 配置不生效

```powershell
# 检查环境变量
Get-Content middleware.env | findstr COMPOSE_PROFILES

# 重新加载配置
.\dify-manager.ps1 restart
```

### 完全重置

```powershell
# 停止所有服务
.\dify-manager.ps1 stop

# 清理容器和网络
docker-compose -f docker-compose.middleware-enhanced.yaml down --volumes
docker system prune -f

# 重新启动
.\dify-manager.ps1 start official
```

## 🎯 开发工作流

### 日常开发

```powershell
# 1. 启动开发环境
.\dify-manager.ps1 start dev

# 2. 在 dify-sandbox 目录中开发
cd ../../dify-sandbox
code .  # 使用 Dev Containers

# 3. 测试更改
# 代码自动热重载，在 Dify 系统中测试

# 4. 查看日志
.\dify-manager.ps1 logs -Service sandbox-dev
```

### 版本切换

```powershell
# 测试官方版本兼容性
.\dify-manager.ps1 switch official

# 回到开发版本继续开发
.\dify-manager.ps1 switch dev
```

### 性能对比

```powershell
# 官方版本性能基准
.\dify-manager.ps1 start official
# 运行性能测试...

# 开发版本性能测试
.\dify-manager.ps1 switch dev
# 运行相同测试...
```

## 📊 监控和日志

### 日志管理

```powershell
# 所有服务日志
.\dify-manager.ps1 logs

# 特定服务日志
.\dify-manager.ps1 logs -Service db
.\dify-manager.ps1 logs -Service redis
.\dify-manager.ps1 logs -Service sandbox-dev

# 跟踪实时日志
docker-compose -f docker-compose.middleware-enhanced.yaml logs -f --tail=100
```

### 性能监控

```powershell
# 容器资源使用
docker stats

# 磁盘使用
docker system df

# 网络监控
docker network inspect dify_local_docker_ssrf_proxy_network
```

## 🔗 集成其他工具

### CI/CD 集成

```yaml
# GitHub Actions 示例
- name: Test with Official Sandbox
  run: |
    .\dify-manager.ps1 start official
    # 运行测试
    
- name: Test with Dev Sandbox
  run: |
    .\dify-manager.ps1 switch dev -Build
    # 运行测试
```

### VSCode 集成

```json
// .vscode/tasks.json
{
  "tasks": [
    {
      "label": "Start Dify Dev",
      "type": "shell",
      "command": ".\\dify-manager.ps1 start dev",
      "group": "build"
    },
    {
      "label": "Switch to Official",
      "type": "shell", 
      "command": ".\\dify-manager.ps1 switch official",
      "group": "build"
    }
  ]
}
```

## 📚 参考资源

- [Docker Compose Profiles 文档](https://docs.docker.com/compose/profiles/)
- [Dify 官方文档](https://docs.dify.ai/)
- [环境变量最佳实践](https://12factor.net/config)
- [容器调试指南](https://docs.docker.com/engine/reference/commandline/exec/)

## 💡 最佳实践

1. **版本控制**: 将 `middleware-dev.env` 纳入版本控制，`middleware.env` 添加到 `.gitignore`
2. **自动化**: 使用脚本管理，避免手动操作
3. **监控**: 定期检查容器健康状态
4. **备份**: 重要数据定期备份
5. **文档**: 记录自定义配置和修改

这样你就有了一个完整的、生产级的 Dify Sandbox 开发和部署解决方案！🚀
