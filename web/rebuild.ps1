# 设置错误操作首选项
$ErrorActionPreference = "Stop"

Write-Host "🚀 开始执行重建流程..." -ForegroundColor Cyan

# 询问用户选择环境
Write-Host "请选择运行环境：" -ForegroundColor Yellow
Write-Host "输入 Y/y 进入开发环境（支持热重载）" -ForegroundColor Yellow
Write-Host "输入其他任意内容进入生产环境" -ForegroundColor Yellow
$envChoice = Read-Host "请输入选择"

try {
    # 停止可能正在运行的Node进程
    # Write-Host "正在检查并停止已存在的Node进程..." -ForegroundColor Yellow
    # Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # 清理操作
    Write-Host "🧹 执行清理操作..." -ForegroundColor Green
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next"
    }
    if (Test-Path "pnpm-lock.yaml") {
        Remove-Item -Force "pnpm-lock.yaml"
    }
    
    # 安装依赖
    Write-Host "📦 安装依赖..." -ForegroundColor Green
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install 失败" }
    
    # 根据用户选择执行不同的命令
    if ($envChoice -eq "Y" -or $envChoice -eq "y") {
        Write-Host "🚀 启动开发环境（支持热重载）..." -ForegroundColor Green
        pnpm dev
    } else {
        # 构建项目
        Write-Host "🔨 构建项目..." -ForegroundColor Green
        pnpm build
        if ($LASTEXITCODE -ne 0) { throw "pnpm run build 失败" }
        
        # 启动项目
        Write-Host "🚀 启动生产环境..." -ForegroundColor Green
        pnpm start
    }
    
} catch {
    Write-Host "❌ 执行过程中出现错误：" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} 