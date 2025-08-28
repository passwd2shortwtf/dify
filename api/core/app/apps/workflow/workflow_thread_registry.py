"""
Global workflow thread registry for managing running workflow threads.
This allows cross-request thread communication and proper cleanup.
"""
import threading
import time
from typing import Optional, Dict, Set
from dataclasses import dataclass
from datetime import datetime

from core.app.apps.base_app_queue_manager import AppQueueManager
from extensions.ext_redis import redis_client


@dataclass
class WorkflowThreadInfo:
    """Information about a running workflow thread."""
    task_id: str
    thread: threading.Thread
    queue_manager: AppQueueManager
    workflow_run_id: str
    created_at: datetime
    user_id: str
    

class WorkflowThreadRegistry:
    """
    Global registry for managing running workflow threads.
    Enables cross-request thread communication and proper cleanup.
    """
    
    def __init__(self):
        self._threads: Dict[str, WorkflowThreadInfo] = {}
        self._lock = threading.RLock()
        self._cleanup_thread: Optional[threading.Thread] = None
        self._start_cleanup_thread()
    
    def register_thread(
        self, 
        task_id: str, 
        thread: threading.Thread, 
        queue_manager: AppQueueManager,
        workflow_run_id: str,
        user_id: str
    ) -> None:
        """Register a new workflow thread."""
        with self._lock:
            thread_info = WorkflowThreadInfo(
                task_id=task_id,
                thread=thread,
                queue_manager=queue_manager,
                workflow_run_id=workflow_run_id,
                created_at=datetime.now(),
                user_id=user_id
            )
            self._threads[task_id] = thread_info
            
            # Store mapping in Redis for persistence
            redis_client.setex(
                f"workflow_thread_registry:{task_id}",
                3600,  # 1 hour expiry
                workflow_run_id
            )
    
    def get_thread_info(self, task_id: str) -> Optional[WorkflowThreadInfo]:
        """Get thread info by task_id."""
        with self._lock:
            return self._threads.get(task_id)
    
    def get_thread_by_workflow_run_id(self, workflow_run_id: str) -> Optional[WorkflowThreadInfo]:
        """Get thread info by workflow_run_id."""
        with self._lock:
            for thread_info in self._threads.values():
                if thread_info.workflow_run_id == workflow_run_id:
                    return thread_info
            return None
    
    def stop_thread(self, task_id: str) -> bool:
        """Stop a workflow thread by task_id."""
        with self._lock:
            thread_info = self._threads.get(task_id)
            if thread_info:
                try:
                    # Set the Redis stop flag - the original mechanism
                    from core.app.apps.base_app_queue_manager import AppQueueManager
                    AppQueueManager.set_stop_flag(
                        task_id=task_id, 
                        invoke_from=thread_info.queue_manager._invoke_from,
                        user_id=thread_info.user_id
                    )
                    
                    # Try to publish QueueStopEvent to the queue
                    try:
                        from core.app.entities.queue_entities import QueueStopEvent
                        from core.app.apps.base_app_queue_manager import PublishFrom
                        
                        stop_event = QueueStopEvent(stopped_by=QueueStopEvent.StopBy.USER_MANUAL)
                        thread_info.queue_manager.publish(stop_event, PublishFrom.TASK_PIPELINE)
                        
                        return True
                        
                    except Exception as e:
                        # If direct publish fails, fallback to Redis flag mechanism
                        return True
                except Exception as e:
                    return False
            return False
    
    def stop_thread_by_workflow_run_id(self, workflow_run_id: str) -> bool:
        """Stop a workflow thread by workflow_run_id."""
        thread_info = self.get_thread_by_workflow_run_id(workflow_run_id)
        if thread_info:
            return self.stop_thread(thread_info.task_id)
        return False
    
    def unregister_thread(self, task_id: str) -> None:
        """Unregister a finished thread."""
        with self._lock:
            if task_id in self._threads:
                del self._threads[task_id]
                redis_client.delete(f"workflow_thread_registry:{task_id}")
    
    def cleanup_finished_threads(self) -> int:
        """Clean up finished/dead threads. Returns count of cleaned threads."""
        cleaned_count = 0
        with self._lock:
            finished_task_ids = []
            for task_id, thread_info in self._threads.items():
                # Check if thread is still alive
                if not thread_info.thread.is_alive():
                    finished_task_ids.append(task_id)
                # Also check for very old threads (>2 hours)
                elif (datetime.now() - thread_info.created_at).total_seconds() > 7200:
                    finished_task_ids.append(task_id)
                    
            for task_id in finished_task_ids:
                self.unregister_thread(task_id)
                cleaned_count += 1
                
        return cleaned_count
    
    def get_running_threads_count(self) -> int:
        """Get count of currently running threads."""
        with self._lock:
            return len(self._threads)
    
    def get_user_threads(self, user_id: str) -> Set[str]:
        """Get all task_ids for a specific user."""
        with self._lock:
            return {
                task_id for task_id, thread_info in self._threads.items()
                if thread_info.user_id == user_id
            }

    def _start_cleanup_thread(self) -> None:
        """Start background cleanup thread."""
        def cleanup_worker():
            while True:
                try:
                    cleaned_count = self.cleanup_finished_threads()
                    if cleaned_count > 0:
                        print(f"Cleaned up {cleaned_count} finished workflow threads")
                    time.sleep(60)  # Check every minute
                except Exception as e:
                    print(f"Error in workflow thread cleanup: {e}")
                    time.sleep(60)
        
        self._cleanup_thread = threading.Thread(
            target=cleanup_worker,
            name="WorkflowThreadCleanup",
            daemon=True
        )
        self._cleanup_thread.start()


# Global instance
workflow_thread_registry = WorkflowThreadRegistry()