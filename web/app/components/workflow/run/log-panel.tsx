'use client'
import type { FC } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cn from 'classnames'
import { fetchWorkflowExecutionLogs } from '@/service/log'


export type ExecutionLogEntry = {
  id: string
  node_execution_id: string
  node_id: string
  node_type: string
  log_content: string
  log_level: 'stdout' | 'stderr' | 'info' | 'error'
  log_time: string
  created_at: string
}

export type LogPanelProps = {
  appId: string
  workflowRunId: string
  isRunning?: boolean
  className?: string
  height?: number
}

const LogPanel: FC<LogPanelProps> = ({
  appId,
  workflowRunId,
  isRunning = false,
  className,
  height,
}) => {
  const { t } = useTranslation()
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch static logs for completed workflows
  const fetchLogs = useCallback(async () => {
    if (!workflowRunId || isRunning) return

    setLoading(true)
    setError(null)

    try {
      // Fetch execution logs from API
      const response = await fetchWorkflowExecutionLogs({
        appID: appId,
        runID: workflowRunId,
        params: {
          limit: 1000, // Fetch a reasonable number of logs
          order_desc: false // Oldest first
        }
      })
      setLogs(response.data || [])
    } catch (err) {
      console.error('Failed to fetch execution logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }, [workflowRunId, isRunning])

  // Handle real-time log updates for running workflows
  useEffect(() => {
    if (!isRunning) {
      fetchLogs()
      return
    }

    // Listen for real-time execution log events
    const handleExecutionLog = (event: CustomEvent) => {
      const logEntry = event.detail as ExecutionLogEntry
      setLogs(prevLogs => [...prevLogs, logEntry])
    }

    // Add event listener for real-time logs
    window.addEventListener('workflow-execution-log', handleExecutionLog as EventListener)

    return () => {
      window.removeEventListener('workflow-execution-log', handleExecutionLog as EventListener)
    }
  }, [workflowRunId, isRunning, fetchLogs])

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
      case 'stderr':
        return 'text-red-600'
      case 'stdout':
        return 'text-green-600'
      case 'info':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
      case 'stderr':
        return '❌'
      case 'stdout':
        return '✅'
      case 'info':
        return 'ℹ️'
      default:
        return '📝'
    }
  }

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr)
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        fractionalSecondDigits: 3 
      } as any)
    } catch {
      return timeStr
    }
  }

  const renderLogEntry = (log: ExecutionLogEntry, index: number) => (
    <div
      key={`${log.id}-${index}`}
      className="flex items-start space-x-3 py-2 px-3 hover:bg-gray-50 border-b border-gray-100"
    >
      {/* Timestamp */}
      <div className="flex-shrink-0 w-20 text-xs text-gray-500 font-mono">
        {formatTime(log.log_time)}
      </div>

      {/* Log Level Icon */}
      <div className="flex-shrink-0 text-sm">
        {getLogLevelIcon(log.log_level)}
      </div>

      {/* Node Info */}
      <div className="flex-shrink-0 w-24 text-xs text-gray-600 truncate">
        {log.node_id}
      </div>

      {/* Log Content */}
      <div className={cn('flex-1 text-sm', getLogLevelColor(log.log_level))}>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
          {log.log_content}
        </pre>
      </div>
    </div>
  )

  return (
    <div className={cn('flex flex-col bg-white border border-gray-200 rounded-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900">
            {t('workflow.panel.executionLogs')}
          </h3>
          {isRunning && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600">{t('workflow.panel.realTime')}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{logs.length} logs</span>
          {loading && <span>{t('common.loading')}</span>}
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-auto"
        style={{ height: height ? `${height}px` : '400px' }}
      >
        {error && (
          <div className="p-4 text-center">
            <div className="text-red-600 text-sm">{error}</div>
            <button
              onClick={fetchLogs}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {!error && !loading && logs.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            {isRunning 
              ? t('workflow.panel.waitingForLogs')
              : t('workflow.panel.noLogs')
            }
          </div>
        )}

        {!error && logs.length > 0 && (
          <div className="divide-y divide-gray-100">
            {logs.map(renderLogEntry)}
          </div>
        )}

        {loading && logs.length === 0 && (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <span className="ml-2 text-sm text-gray-600">{t('common.loading')}</span>
          </div>
        )}
      </div>

      {/* Footer with scroll info */}
      {logs.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>
              {t('workflow.panel.totalLogs', { count: logs.length })}
            </span>
            {isRunning && (
              <span>{t('workflow.panel.autoScroll')}</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LogPanel
