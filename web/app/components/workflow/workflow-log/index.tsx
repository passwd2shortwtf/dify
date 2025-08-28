'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import cn from '@/utils/classnames'

export type WorkflowLogEntry = {
  timestamp: number
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  nodeId?: string
  nodeName?: string
  iterationNumber?: number
}

export type WorkflowLogProps = {
  logs: WorkflowLogEntry[]
  className?: string
}

const WorkflowLog: FC<WorkflowLogProps> = ({
  logs,
  className,
}) => {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [logs])

  const getTypeColor = (type: WorkflowLogEntry['type']) => {
    switch (type) {
      case 'info':
        return 'text-text-secondary'
      case 'success':
        return 'text-text-success'
      case 'error':
        return 'text-text-destructive'
      case 'warning':
        return 'text-text-warning'
      default:
        return 'text-text-secondary'
    }
  }

  const getTypeIcon = (type: WorkflowLogEntry['type']) => {
    switch (type) {
      case 'info':
        return '💬'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      default:
        return '💬'
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-between p-4 border-b border-divider-subtle">
        <h3 className="text-text-primary system-md-semibold">
          {t('workflow.log.title', 'Workflow Logs')}
        </h3>
        <span className="text-text-tertiary system-xs-regular">
          {t('workflow.log.totalLogs', { count: logs.length }, `${logs.length} logs`)}
        </span>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            {t('workflow.log.noLogs', 'No logs available')}
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-background-default-subtle">
              <span className="text-sm">{getTypeIcon(log.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('system-xs-semibold', getTypeColor(log.type))}>
                    {log.type.toUpperCase()}
                  </span>
                  <span className="text-text-tertiary system-xs-regular">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.nodeName && (
                    <span className="text-text-secondary system-xs-regular bg-background-default-subtle px-1 rounded">
                      {log.nodeName}
                    </span>
                  )}
                </div>
                <div className="text-text-primary system-sm-regular break-words">
                  {log.message}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default WorkflowLog
