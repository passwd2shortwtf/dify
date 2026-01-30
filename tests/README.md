# Dify Tests

本目录包含 Dify 项目的测试文件。

## 目录结构

```
tests/
└── unit_tests/
    └── events/
        └── test_provider_update_deadlock_prevention.py  # Provider 更新死锁预防测试
```

## 测试分类

Dify 项目的测试主要分布在以下位置：

| 位置 | 描述 |
|------|------|
| `/tests/` | 项目根级别测试 |
| `/api/tests/` | API 后端测试（包含单元测试、集成测试等） |

### API 后端测试

API 后端测试位于 `/api/tests/` 目录，包含：

- **unit_tests/** - 单元测试
- **integration_tests/** - 集成测试
- **artifact_tests/** - 构建产物测试

## 运行测试

### 环境准备

确保已安装 [uv](https://docs.astral.sh/uv/) 包管理器：

```bash
pip install uv
# 或者在 macOS 上
brew install uv
```

### 安装测试依赖

```bash
cd api
uv sync --dev
```

### 运行所有测试

```bash
uv run -P api bash dev/pytest/pytest_all_tests.sh
```

### 运行特定类型的测试

```bash
# 运行单元测试
dev/pytest/pytest_unit_tests.sh

# 运行 Model Runtime 测试
dev/pytest/pytest_model_runtime.sh

# 运行 Tools 测试
dev/pytest/pytest_tools.sh

# 运行 Workflow 测试
dev/pytest/pytest_workflow.sh

# 运行向量数据库测试
dev/pytest/pytest_vdb.sh
```

## 编写测试

### 测试命名规范

- 测试文件以 `test_` 前缀命名
- 测试类以 `Test` 前缀命名
- 测试方法以 `test_` 前缀命名

### 示例

```python
import pytest

class TestExample:
    """示例测试类"""
    
    def setup_method(self):
        """每个测试方法执行前的准备工作"""
        pass
    
    def test_basic_functionality(self):
        """测试基本功能"""
        assert True
    
    def test_with_mock(self, mocker):
        """使用 mock 的测试"""
        mock_func = mocker.patch('module.function')
        mock_func.return_value = 'mocked'
        # 测试逻辑
```

## 相关文档

- [贡献指南](../CONTRIBUTING.md)
- [API 后端 README](../api/README.md)
- [开发文档](https://docs.dify.ai)
