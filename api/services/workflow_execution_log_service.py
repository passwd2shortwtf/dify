from collections.abc import Sequence
from datetime import datetime
from typing import Optional

from extensions.ext_database import db
from models import WorkflowExecutionLog, WorkflowExecutionLogLevel, WorkflowRun
from sqlalchemy import and_, desc, text
from sqlalchemy.orm import Query


class WorkflowExecutionLogService:
    """
    工作流执行日志服务
    
    提供工作流执行日志的创建、查询和管理功能
    """
    
    @staticmethod
    def add_log(
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
    ) -> WorkflowExecutionLog:
        """
        添加执行日志记录
        
        Args:
            tenant_id: 租户ID
            app_id: 应用ID
            workflow_id: 工作流ID
            workflow_run_id: 工作流运行ID
            node_id: 节点ID
            log_content: 日志内容
            log_level: 日志级别
            log_time: 日志时间（可选，默认当前时间）
            node_execution_id: 节点执行ID（可选）
            
        Returns:
            WorkflowExecutionLog: 创建的日志记录
        """
        log_entry = WorkflowExecutionLog.create_log(
            tenant_id=tenant_id,
            app_id=app_id,
            workflow_id=workflow_id,
            workflow_run_id=workflow_run_id,
            node_id=node_id,
            log_content=log_content,
            log_level=log_level,
            log_time=log_time,
            node_execution_id=node_execution_id,
        )
        
        db.session.add(log_entry)
        db.session.commit()
        
        return log_entry
    
    @staticmethod
    def get_logs_by_workflow_run_id(
        workflow_run_id: str,
        tenant_id: str,
        *,
        node_id: Optional[str] = None,
        log_level: Optional[WorkflowExecutionLogLevel] = None,
        limit: int = 1000,
        offset: int = 0,
        order_by_time_desc: bool = False,
    ) -> Sequence[WorkflowExecutionLog]:
        """
        根据工作流运行ID查询执行日志
        
        Args:
            workflow_run_id: 工作流运行ID
            tenant_id: 租户ID（安全检查）
            node_id: 节点ID过滤（可选）
            log_level: 日志级别过滤（可选）
            limit: 返回记录数限制
            offset: 偏移量
            order_by_time_desc: 是否按时间降序排序
            
        Returns:
            Sequence[WorkflowExecutionLog]: 日志记录列表
        """
        query = db.session.query(WorkflowExecutionLog).filter(
            and_(
                WorkflowExecutionLog.workflow_run_id == workflow_run_id,
                WorkflowExecutionLog.tenant_id == tenant_id
            )
        )
        
        if node_id:
            query = query.filter(WorkflowExecutionLog.node_id == node_id)
            
        if log_level:
            query = query.filter(WorkflowExecutionLog.log_level == log_level.value)
        
        if order_by_time_desc:
            query = query.order_by(desc(WorkflowExecutionLog.log_time))
        else:
            query = query.order_by(WorkflowExecutionLog.log_time)
            
        return query.offset(offset).limit(limit).all()
    
    @staticmethod
    def get_logs_by_task_id(
        task_id: str,
        tenant_id: str,
        *,
        node_id: Optional[str] = None,
        log_level: Optional[WorkflowExecutionLogLevel] = None,
        limit: int = 1000,
        offset: int = 0,
        order_by_time_desc: bool = False,
    ) -> Sequence[WorkflowExecutionLog]:
        """
        根据任务ID查询执行日志
        
        注意：task_id 通常对应 WorkflowRun.id
        
        Args:
            task_id: 任务ID（WorkflowRun.id）
            tenant_id: 租户ID（安全检查）
            node_id: 节点ID过滤（可选）
            log_level: 日志级别过滤（可选）
            limit: 返回记录数限制
            offset: 偏移量
            order_by_time_desc: 是否按时间降序排序
            
        Returns:
            Sequence[WorkflowExecutionLog]: 日志记录列表
        """
        # task_id 就是 workflow_run_id
        return WorkflowExecutionLogService.get_logs_by_workflow_run_id(
            workflow_run_id=task_id,
            tenant_id=tenant_id,
            node_id=node_id,
            log_level=log_level,
            limit=limit,
            offset=offset,
            order_by_time_desc=order_by_time_desc,
        )
    
    @staticmethod
    def get_workflow_run_with_logs(
        workflow_run_id: str,
        tenant_id: str,
    ) -> tuple[Optional[WorkflowRun], Sequence[WorkflowExecutionLog]]:
        """
        获取工作流运行记录及其执行日志
        
        Args:
            workflow_run_id: 工作流运行ID
            tenant_id: 租户ID（安全检查）
            
        Returns:
            tuple: (工作流运行记录, 执行日志列表)
        """
        # 查询工作流运行记录
        workflow_run = db.session.query(WorkflowRun).filter(
            and_(
                WorkflowRun.id == workflow_run_id,
                WorkflowRun.tenant_id == tenant_id
            )
        ).first()
        
        # 查询执行日志
        logs = WorkflowExecutionLogService.get_logs_by_workflow_run_id(
            workflow_run_id=workflow_run_id,
            tenant_id=tenant_id,
            order_by_time_desc=False  # 按时间正序
        )
        
        return workflow_run, logs
    
    @staticmethod
    def count_logs_by_workflow_run_id(
        workflow_run_id: str,
        tenant_id: str,
        *,
        node_id: Optional[str] = None,
        log_level: Optional[WorkflowExecutionLogLevel] = None,
    ) -> int:
        """
        统计工作流运行的日志数量
        
        Args:
            workflow_run_id: 工作流运行ID
            tenant_id: 租户ID（安全检查）
            node_id: 节点ID过滤（可选）
            log_level: 日志级别过滤（可选）
            
        Returns:
            int: 日志数量
        """
        query = db.session.query(WorkflowExecutionLog).filter(
            and_(
                WorkflowExecutionLog.workflow_run_id == workflow_run_id,
                WorkflowExecutionLog.tenant_id == tenant_id
            )
        )
        
        if node_id:
            query = query.filter(WorkflowExecutionLog.node_id == node_id)
            
        if log_level:
            query = query.filter(WorkflowExecutionLog.log_level == log_level.value)
            
        return query.count()
    
    @staticmethod
    def delete_logs_by_workflow_run_id(
        workflow_run_id: str,
        tenant_id: str,
    ) -> int:
        """
        删除指定工作流运行的所有日志
        
        Args:
            workflow_run_id: 工作流运行ID
            tenant_id: 租户ID（安全检查）
            
        Returns:
            int: 删除的记录数
        """
        deleted_count = db.session.query(WorkflowExecutionLog).filter(
            and_(
                WorkflowExecutionLog.workflow_run_id == workflow_run_id,
                WorkflowExecutionLog.tenant_id == tenant_id
            )
        ).delete()
        
        db.session.commit()
        return deleted_count
    
    @staticmethod
    def get_node_log_summary(
        workflow_run_id: str,
        tenant_id: str,
    ) -> list[dict]:
        """
        获取工作流运行中各节点的日志摘要
        
        Args:
            workflow_run_id: 工作流运行ID
            tenant_id: 租户ID（安全检查）
            
        Returns:
            list[dict]: 每个节点的日志统计信息
        """
        # 使用原生SQL进行分组统计
        sql = text("""
            SELECT 
                node_id,
                log_level,
                COUNT(*) as log_count,
                MIN(log_time) as first_log_time,
                MAX(log_time) as last_log_time
            FROM workflow_execution_logs 
            WHERE workflow_run_id = :workflow_run_id 
                AND tenant_id = :tenant_id
            GROUP BY node_id, log_level
            ORDER BY node_id, log_level
        """)
        
        result = db.session.execute(sql, {
            'workflow_run_id': workflow_run_id,
            'tenant_id': tenant_id
        })
        
        summary = []
        for row in result:
            summary.append({
                'node_id': row.node_id,
                'log_level': row.log_level,
                'log_count': row.log_count,
                'first_log_time': row.first_log_time.isoformat() if row.first_log_time else None,
                'last_log_time': row.last_log_time.isoformat() if row.last_log_time else None,
            })
            
        return summary
