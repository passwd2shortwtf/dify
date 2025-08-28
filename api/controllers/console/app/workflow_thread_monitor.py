"""
Workflow Thread Monitor API for debugging and monitoring workflow threads.
"""
from flask_restful import Resource
from werkzeug.exceptions import Forbidden

from controllers.console import api
from controllers.console.wraps import account_initialization_required, setup_required
from core.app.apps.workflow.workflow_thread_registry import workflow_thread_registry
from libs.login import current_user, login_required


class WorkflowThreadMonitorApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def get(self):
        """
        Get workflow thread monitoring information
        """
        # Only admin users can access thread monitoring
        if not current_user.is_admin:
            raise Forbidden()

        # Get thread statistics
        running_count = workflow_thread_registry.get_running_threads_count()
        user_threads = workflow_thread_registry.get_user_threads(current_user.id)
        
        # Get detailed thread info for current user
        thread_details = []
        for task_id in user_threads:
            thread_info = workflow_thread_registry.get_thread_info(task_id)
            if thread_info:
                thread_details.append({
                    "task_id": thread_info.task_id,
                    "workflow_run_id": thread_info.workflow_run_id,
                    "thread_name": thread_info.thread.name,
                    "is_alive": thread_info.thread.is_alive(),
                    "created_at": thread_info.created_at.isoformat(),
                    "user_id": thread_info.user_id
                })

        return {
            "total_running_threads": running_count,
            "user_thread_count": len(user_threads),
            "user_threads": thread_details
        }


class WorkflowThreadCleanupApi(Resource):
    @setup_required
    @login_required
    @account_initialization_required
    def post(self):
        """
        Manually trigger thread cleanup
        """
        # Only admin users can trigger cleanup
        if not current_user.is_admin:
            raise Forbidden()

        cleaned_count = workflow_thread_registry.cleanup_finished_threads()
        
        return {
            "result": "success",
            "cleaned_threads": cleaned_count
        }


# Register endpoints
api.add_resource(
    WorkflowThreadMonitorApi,
    "/workflow-threads/monitor",
)
api.add_resource(
    WorkflowThreadCleanupApi, 
    "/workflow-threads/cleanup",
)
