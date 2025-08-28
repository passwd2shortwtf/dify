from typing import cast

from flask_login import current_user
from flask_restful import Resource, marshal_with, reqparse
from flask_restful.inputs import int_range

from controllers.console import api
from controllers.console.app.wraps import get_app_model
from controllers.console.wraps import account_initialization_required, setup_required
from fields.workflow_run_fields import (
    advanced_chat_workflow_run_pagination_fields,
    workflow_run_detail_fields,
    workflow_run_node_execution_list_fields,
    workflow_run_pagination_fields,
)
from libs.helper import uuid_value
from libs.login import login_required
from models import Account, App, AppMode, EndUser, WorkflowExecutionLogLevel
from services.workflow_run_service import WorkflowRunService
from services.workflow_execution_log_service import WorkflowExecutionLogService


class AdvancedChatAppWorkflowRunListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.ADVANCED_CHAT])
    @marshal_with(advanced_chat_workflow_run_pagination_fields)
    def get(self, app_model: App):
        """
        Get advanced chat app workflow run list
        """
        parser = reqparse.RequestParser()
        parser.add_argument("last_id", type=uuid_value, location="args")
        parser.add_argument("limit", type=int_range(1, 100), required=False, default=20, location="args")
        args = parser.parse_args()

        workflow_run_service = WorkflowRunService()
        result = workflow_run_service.get_paginate_advanced_chat_workflow_runs(app_model=app_model, args=args)

        return result


class WorkflowRunListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.ADVANCED_CHAT, AppMode.WORKFLOW])
    @marshal_with(workflow_run_pagination_fields)
    def get(self, app_model: App):
        """
        Get workflow run list
        """
        parser = reqparse.RequestParser()
        parser.add_argument("last_id", type=uuid_value, location="args")
        parser.add_argument("limit", type=int_range(1, 100), required=False, default=20, location="args")
        args = parser.parse_args()

        workflow_run_service = WorkflowRunService()
        result = workflow_run_service.get_paginate_workflow_runs(app_model=app_model, args=args)

        return result


class WorkflowRunDetailApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.ADVANCED_CHAT, AppMode.WORKFLOW])
    @marshal_with(workflow_run_detail_fields)
    def get(self, app_model: App, run_id):
        """
        Get workflow run detail
        """
        run_id = str(run_id)

        workflow_run_service = WorkflowRunService()
        workflow_run = workflow_run_service.get_workflow_run(app_model=app_model, run_id=run_id)

        return workflow_run


class WorkflowRunNodeExecutionListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.ADVANCED_CHAT, AppMode.WORKFLOW])
    @marshal_with(workflow_run_node_execution_list_fields)
    def get(self, app_model: App, run_id):
        """
        Get workflow run node execution list
        """
        run_id = str(run_id)

        workflow_run_service = WorkflowRunService()
        user = cast("Account | EndUser", current_user)
        node_executions = workflow_run_service.get_workflow_run_node_executions(
            app_model=app_model,
            run_id=run_id,
            user=user,
        )

        return {"data": node_executions}


class WorkflowRunExecutionLogListApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.ADVANCED_CHAT, AppMode.WORKFLOW])
    def get(self, app_model: App, run_id):
        """
        Get workflow run execution logs
        """
        run_id = str(run_id)
        
        parser = reqparse.RequestParser()
        parser.add_argument("node_id", type=str, location="args", required=False)
        parser.add_argument("log_level", type=str, location="args", required=False)
        parser.add_argument("limit", type=int_range(1, 1000), required=False, default=100, location="args")
        parser.add_argument("offset", type=int, required=False, default=0, location="args")
        parser.add_argument("order_desc", type=bool, required=False, default=False, location="args")
        args = parser.parse_args()
        
        # Validate log level if provided
        log_level = None
        if args.get("log_level"):
            try:
                log_level = WorkflowExecutionLogLevel(args["log_level"])
            except ValueError:
                return {"error": f"Invalid log_level: {args['log_level']}. Must be one of: stdout, stderr, info, error"}, 400
        
        # Get execution logs
        logs = WorkflowExecutionLogService.get_logs_by_task_id(
            task_id=run_id,
            tenant_id=app_model.tenant_id,
            node_id=args.get("node_id"),
            log_level=log_level,
            limit=args["limit"],
            offset=args["offset"],
            order_by_time_desc=args["order_desc"]
        )
        
        # Get log count for pagination
        total_count = WorkflowExecutionLogService.count_logs_by_workflow_run_id(
            workflow_run_id=run_id,
            tenant_id=app_model.tenant_id,
            node_id=args.get("node_id"),
            log_level=log_level
        )
        
        # Convert logs to dict format
        log_list = [log.to_dict() for log in logs]
        
        return {
            "data": log_list,
            "total": total_count,
            "limit": args["limit"],
            "offset": args["offset"],
            "has_more": (args["offset"] + args["limit"]) < total_count
        }


class WorkflowRunExecutionLogSummaryApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    @get_app_model(mode=[AppMode.ADVANCED_CHAT, AppMode.WORKFLOW])
    def get(self, app_model: App, run_id):
        """
        Get workflow run execution logs summary by node
        """
        run_id = str(run_id)
        
        # Get log summary
        summary = WorkflowExecutionLogService.get_node_log_summary(
            workflow_run_id=run_id,
            tenant_id=app_model.tenant_id
        )
        
        return {"data": summary}


api.add_resource(AdvancedChatAppWorkflowRunListApi, "/apps/<uuid:app_id>/advanced-chat/workflow-runs")
api.add_resource(WorkflowRunListApi, "/apps/<uuid:app_id>/workflow-runs")
api.add_resource(WorkflowRunDetailApi, "/apps/<uuid:app_id>/workflow-runs/<uuid:run_id>")
api.add_resource(WorkflowRunNodeExecutionListApi, "/apps/<uuid:app_id>/workflow-runs/<uuid:run_id>/node-executions")
api.add_resource(WorkflowRunExecutionLogListApi, "/apps/<uuid:app_id>/workflow-runs/<uuid:run_id>/execution-logs")
api.add_resource(WorkflowRunExecutionLogSummaryApi, "/apps/<uuid:app_id>/workflow-runs/<uuid:run_id>/execution-logs/summary")
