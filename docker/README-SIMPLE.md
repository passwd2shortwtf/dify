# 🚀 Dify 简化管理指南

## 🎯 极简使用

### 快速启动

```powershell
# 启动官方版本
.\dify-simple.ps1 start official

# 启动开发版本  
.\dify-simple.ps1 start dev

# 重新构建开发版
.\dify-simple.ps1 start dev -Build
```

### 基本管理

```powershell
# 查看状态
.\dify-simple.ps1 status

# 查看日志
.\dify-simple.ps1 logs

# 停止系统
.\dify-simple.ps1 stop
```

## 🔧 两种模式

| 模式 | 说明 | 容器 |
|------|------|------|
| `official` | 官方 sandbox 镜像 | `sandbox-official` |
| `dev` | 开发版 sandbox（本地构建） | `sandbox-dev` |

## ⚙️ 自动配置

- **配置文件**: `middleware.env`（自动管理）
- **自动切换**: 脚本会根据模式自动更新配置
- **健康检查**: 自动检测服务状态

## 🔍 状态检查

```powershell
# 检查容器状态
docker ps

# 检查 API 健康
curl http://localhost:8194/health
```

## 🐛 开发模式特性

启动开发版时自动提供：
- **调试端口**: `localhost:2345`
- **源码挂载**: 实时代码更新
- **详细日志**: debug 级别日志

## 📋 配置说明

**无需手动编辑配置文件**，脚本会自动管理以下关键配置：

```bash
# 当前模式（自动设置）
COMPOSE_PROFILES=production|development

# Sandbox 主机（自动设置）  
SSRF_SANDBOX_HOST=sandbox-official|sandbox-dev

# 开发版路径
DEV_SANDBOX_PATH=../../dify-sandbox
```

## 🛠️ 故障排除

### 端口冲突
```powershell
# 检查端口占用
netstat -an | findstr 8194

# 停止其他服务
.\dify-simple.ps1 stop
```

### 构建失败
```powershell
# 清理并重建
.\dify-simple.ps1 start dev -Clean -Build
```

### 完全重置
```powershell
# 停止所有服务
.\dify-simple.ps1 stop

# 清理 Docker
docker system prune -f

# 重新启动
.\dify-simple.ps1 start official
```

## 💡 最佳实践

1. **开发流程**: `official` → `dev` → 测试 → 回到 `official`
2. **定期清理**: 使用 `-Clean` 清理旧数据
3. **版本更新**: 使用 `-Build` 重新构建镜像

## 📊 与原版本对比

| 特性 | 原复杂版本 | 简化版本 |
|------|------------|----------|
| 配置文件 | 2个模板文件 | 1个配置文件 |
| 模式选项 | 4个重复值 | 2个清晰值 |
| 功能 | 热切换/服务选择/超时 | 核心功能 |
| 代码行数 | ~400行 | ~150行 |
| 学习成本 | 高 | 低 |

**结论**: 简化版本保留了核心功能，去除了复杂性，更适合日常使用。
