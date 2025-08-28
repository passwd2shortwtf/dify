import logging

from flask_restful import reqparse
from werkzeug.exceptions import InternalServerError

from controllers.console.app.error import (
    CompletionRequestError,
    ProviderModelCurrentlyNotSupportError,
    ProviderNotInitializeError,
    ProviderQuotaExceededError,
)
from controllers.console.explore.error import NotWorkflowAppError
from controllers.console.explore.wraps import InstalledAppResource
from controllers.web.error import InvokeRateLimitError as InvokeRateLimitHttpError
from core.app.apps.base_app_queue_manager import AppQueueManager
from core.app.entities.app_invoke_entities import InvokeFrom
from core.app.apps.workflow.workflow_thread_registry import workflow_thread_registry

from core.errors.error import (
    ModelCurrentlyNotSupportError,
    ProviderTokenNotInitError,
    QuotaExceededError,
)
from core.model_runtime.errors.invoke import InvokeError
from libs import helper
from libs.login import current_user
from models.model import AppMode, InstalledApp
from models.workflow import WorkflowRun
from services.app_generate_service import AppGenerateService
from extensions.ext_database import db
from services.errors.llm import InvokeRateLimitError

logger = logging.getLogger(__name__)


class InstalledAppWorkflowRunApi(InstalledAppResource):
    def post(self, installed_app: InstalledApp):
        """
        Run workflow
        """
        app_model = installed_app.app
        app_mode = AppMode.value_of(app_model.mode)
        if app_mode != AppMode.WORKFLOW:
            raise NotWorkflowAppError()

        parser = reqparse.RequestParser()
        parser.add_argument("inputs", type=dict, required=True, nullable=False, location="json")
        parser.add_argument("files", type=list, required=False, location="json")
        args = parser.parse_args()

        try:
            response = AppGenerateService.generate(
                app_model=app_model, user=current_user, args=args, invoke_from=InvokeFrom.EXPLORE, streaming=True
            )

            return helper.compact_generate_response(response)
        except ProviderTokenNotInitError as ex:
            raise ProviderNotInitializeError(ex.description)
        except QuotaExceededError:
            raise ProviderQuotaExceededError()
        except ModelCurrentlyNotSupportError:
            raise ProviderModelCurrentlyNotSupportError()
        except InvokeError as e:
            raise CompletionRequestError(e.description)
        except InvokeRateLimitError as ex:
            raise InvokeRateLimitHttpError(ex.description)
        except ValueError as e:
            raise e
        except Exception:
            logging.exception("internal server error.")
            raise InternalServerError()


class InstalledAppWorkflowTaskStopApi(InstalledAppResource):
    def post(self, installed_app: InstalledApp, task_id: str):
        """
        Stop workflow task
        """
        app_model = installed_app.app
        app_mode = AppMode.value_of(app_model.mode)
        if app_mode != AppMode.WORKFLOW:
            raise NotWorkflowAppError()

        # Try to stop the workflow thread first
        try:
            stopped = workflow_thread_registry.stop_thread(task_id)
            if stopped:
                return {"result": "success"}
        except Exception as e:
            pass
        
        # Fallback to setting Redis stop flag
        AppQueueManager.set_stop_flag(task_id, InvokeFrom.EXPLORE, current_user.id)
        return {"result": "success"}


class InstalledAppWorkflowRunStopApi(InstalledAppResource):
    def post(self, installed_app: InstalledApp, workflow_run_id: str):
        """
        Stop workflow by workflow_run_id
        """
        app_model = installed_app.app
        app_mode = AppMode.value_of(app_model.mode)
        if app_mode != AppMode.WORKFLOW:
            raise NotWorkflowAppError()

        # 使用简化停止机制 - 需要先获取task_id
        from models.workflow import WorkflowRun
        from extensions.ext_database import db
        
        workflow_run = db.session.query(WorkflowRun).filter(
            WorkflowRun.id == workflow_run_id,
            WorkflowRun.app_id == app_model.id
        ).first()
        
        if not workflow_run:
            return {"result": "failed", "message": "Workflow run not found"}, 404
            
        if not workflow_run.task_id:
            return {"result": "failed", "message": "Task ID not found in workflow run"}, 400
        
        # Try to stop the workflow thread first
        try:
            stopped = workflow_thread_registry.stop_thread_by_workflow_run_id(workflow_run_id)
            if stopped:
                return {"result": "success"}
        except Exception as e:
            pass
        
        # Fallback to setting Redis stop flag if we have task_id
        if workflow_run.task_id:
            AppQueueManager.set_stop_flag(workflow_run.task_id, InvokeFrom.EXPLORE, current_user.id)
        
        return {"result": "success"}
