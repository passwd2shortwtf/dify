import { useCallback } from 'react'
import type { ExecutionLogResponse } from '@/types/workflow'

export type ExecutionLogEntry = {
  id: string
  node_execution_id: string
  node_id: string
  node_type: string
  log_content: string
  log_level: 'stdout' | 'stderr' | 'info' | 'error'
  log_time: string
  created_at: string
  parallel_id?: string
  parallel_start_node_id?: string
  parent_parallel_id?: string
  parent_parallel_start_node_id?: string
}

export const useWorkflowExecutionLog = () => {
  const handleWorkflowExecutionLog = useCallback((params: ExecutionLogResponse) => {
    const { data } = params
    
    // Convert the execution log response to our log entry format
    const logEntry: ExecutionLogEntry = {
      id: `${data.node_execution_id}-${Date.now()}`, // Generate unique ID
      node_execution_id: data.node_execution_id,
      node_id: data.node_id,
      node_type: data.node_type,
      log_content: data.log_content,
      log_level: data.log_level as 'stdout' | 'stderr' | 'info' | 'error',
      log_time: data.log_time,
      created_at: new Date().toISOString(),
      parallel_id: data.parallel_id,
      parallel_start_node_id: data.parallel_start_node_id,
      parent_parallel_id: data.parent_parallel_id,
      parent_parallel_start_node_id: data.parent_parallel_start_node_id,
    }

    // Dispatch a custom event that the log panel can listen to
    const customEvent = new CustomEvent('workflow-execution-log', {
      detail: logEntry,
    })
    window.dispatchEvent(customEvent)

    console.log('📝 [DEBUG] Received workflow execution log:', logEntry)
  }, [])

  return {
    handleWorkflowExecutionLog,
  }
}
