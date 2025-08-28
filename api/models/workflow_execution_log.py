from datetime import UTC, datetime
from enum import StrEnum
from typing import TYPE_CHECKING, Optional

import sqlalchemy as sa
from sqlalchemy import Index, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .types import StringUUID

if TYPE_CHECKING:
    from .workflow import WorkflowRun, WorkflowNodeExecutionModel


class WorkflowExecutionLogLevel(StrEnum):
    """
    Workflow execution log level enum
    """
    STDOUT = "stdout"
    STDERR = "stderr"  
    INFO = "info"
    ERROR = "error"


class WorkflowExecutionLog(Base):
    """
    Workflow Execution Log
    
    记录工作流执行过程中产生的实时日志，包括代码节点的输出、错误信息等。
    
    Attributes:
    - id (uuid) Log record ID
    - tenant_id (uuid) Workspace ID  
    - app_id (uuid) App ID
    - workflow_id (uuid) Workflow ID
    - workflow_run_id (uuid) Workflow Run ID, 关联到WorkflowRun表
    - node_id (string) Node ID that generated this log
    - node_execution_id (uuid, optional) Node execution ID, 关联到WorkflowNodeExecutionModel  
    - log_content (text) Log content
    - log_level (string) Log level: stdout/stderr/info/error
    - log_time (timestamp) Log generation time
    - created_at (timestamp) Record creation time
    """
    
    __tablename__ = "workflow_execution_logs"
    __table_args__ = (
        # 主键约束
        sa.PrimaryKeyConstraint("id", name="workflow_execution_log_pkey"),
        # 根据workflow_run_id查询日志的索引
        Index("workflow_execution_log_run_idx", "tenant_id", "workflow_run_id", "log_time"),
        # 根据node_id查询日志的索引 
        Index("workflow_execution_log_node_idx", "tenant_id", "workflow_run_id", "node_id", "log_time"),
        # 根据log_level查询的索引
        Index("workflow_execution_log_level_idx", "tenant_id", "workflow_run_id", "log_level"),
    )
    
    # 主键
    id: Mapped[str] = mapped_column(StringUUID, server_default=sa.text("uuid_generate_v4()"))
    
    # 租户和应用信息
    tenant_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    app_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    workflow_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    
    # 关联的运行记录
    workflow_run_id: Mapped[str] = mapped_column(StringUUID, nullable=False)
    
    # 节点信息
    node_id: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    node_execution_id: Mapped[Optional[str]] = mapped_column(StringUUID, nullable=True)
    
    # 日志内容
    log_content: Mapped[str] = mapped_column(sa.Text, nullable=False)
    log_level: Mapped[str] = mapped_column(sa.String(50), nullable=False)  # stdout/stderr/info/error
    log_time: Mapped[datetime] = mapped_column(sa.DateTime, nullable=False)
    
    # 记录创建时间
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime, 
        nullable=False, 
        server_default=func.current_timestamp()
    )
    
    @classmethod
    def create_log(
        cls,
        *,
        tenant_id: str,
        app_id: str, 
        workflow_id: str,
        workflow_run_id: str,
        node_id: str,
        log_content: str,
        log_level: WorkflowExecutionLogLevel,
        log_time: Optional[datetime] = None,
        node_execution_id: Optional[str] = None,
    ) -> "WorkflowExecutionLog":
        """
        创建一条执行日志记录
        
        Args:
            tenant_id: 租户ID
            app_id: 应用ID
            workflow_id: 工作流ID  
            workflow_run_id: 工作流运行ID
            node_id: 节点ID
            log_content: 日志内容
            log_level: 日志级别
            log_time: 日志时间，默认为当前时间
            node_execution_id: 节点执行ID（可选）
            
        Returns:
            WorkflowExecutionLog: 创建的日志记录
        """
        if log_time is None:
            log_time = datetime.now(UTC).replace(tzinfo=None)
            
        log_entry = cls(
            tenant_id=tenant_id,
            app_id=app_id,
            workflow_id=workflow_id,
            workflow_run_id=workflow_run_id,
            node_id=node_id,
            node_execution_id=node_execution_id,
            log_content=log_content,
            log_level=log_level.value,
            log_time=log_time,
        )
        
        return log_entry
    
    def to_dict(self) -> dict:
        """
        转换为字典格式
        
        Returns:
            dict: 日志记录的字典表示
        """
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "app_id": self.app_id,
            "workflow_id": self.workflow_id,
            "workflow_run_id": self.workflow_run_id,
            "node_id": self.node_id,
            "node_execution_id": self.node_execution_id,
            "log_content": self.log_content,
            "log_level": self.log_level,
            "log_time": self.log_time.isoformat() if self.log_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
