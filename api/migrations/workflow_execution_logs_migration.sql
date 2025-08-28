-- 工作流执行日志表创建脚本
-- 运行此脚本以创建 workflow_execution_logs 表

CREATE TABLE IF NOT EXISTS workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    app_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    workflow_run_id UUID NOT NULL,
    node_id VARCHAR(255) NOT NULL,
    node_execution_id UUID,
    log_content TEXT NOT NULL,
    log_level VARCHAR(50) NOT NULL,
    log_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS workflow_execution_log_run_idx 
    ON workflow_execution_logs (tenant_id, workflow_run_id, log_time);

CREATE INDEX IF NOT EXISTS workflow_execution_log_node_idx 
    ON workflow_execution_logs (tenant_id, workflow_run_id, node_id, log_time);

CREATE INDEX IF NOT EXISTS workflow_execution_log_level_idx 
    ON workflow_execution_logs (tenant_id, workflow_run_id, log_level);

-- 添加注释
COMMENT ON TABLE workflow_execution_logs IS '工作流执行日志表，记录工作流执行过程中产生的实时日志';

COMMENT ON COLUMN workflow_execution_logs.id IS '日志记录ID';
COMMENT ON COLUMN workflow_execution_logs.tenant_id IS '租户ID';
COMMENT ON COLUMN workflow_execution_logs.app_id IS '应用ID';
COMMENT ON COLUMN workflow_execution_logs.workflow_id IS '工作流ID';
COMMENT ON COLUMN workflow_execution_logs.workflow_run_id IS '工作流运行ID，关联到workflow_runs表';
COMMENT ON COLUMN workflow_execution_logs.node_id IS '产生日志的节点ID';
COMMENT ON COLUMN workflow_execution_logs.node_execution_id IS '节点执行ID，关联到workflow_node_executions表（可选）';
COMMENT ON COLUMN workflow_execution_logs.log_content IS '日志内容';
COMMENT ON COLUMN workflow_execution_logs.log_level IS '日志级别：stdout/stderr/info/error';
COMMENT ON COLUMN workflow_execution_logs.log_time IS '日志产生时间';
COMMENT ON COLUMN workflow_execution_logs.created_at IS '记录创建时间';
