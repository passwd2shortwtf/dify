import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'

export type WorkflowLogEntry = {
  timestamp: number
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
  nodeId?: string
  nodeName?: string
  iterationNumber?: number
}

type WorkflowLogProps = {
  logs: WorkflowLogEntry[]
  className?: string
}

const WorkflowLog: React.FC<WorkflowLogProps> = ({
  logs,
  className = '',
}) => {
  const { t } = useTranslation()
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])

  const getLogMessage = (log: WorkflowLogEntry) => {
    let message = log.message
    if (log.nodeName) {
      message = `[${log.nodeName}] ${message}`
    }
    if (log.iterationNumber !== undefined) {
      message = `${message} (第 ${log.iterationNumber} 次)`
    }
    return message
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-900">{t('工作流日志')}</div>
      </div>
      <div ref={logContainerRef} className="flex-1 overflow-auto p-4">
        {logs.map((log, index) => (
          <div
            key={index}
            className={`flex items-start mb-2 text-sm ${
              log.type === 'error' ? 'text-red-600' :
              log.type === 'success' ? 'text-green-600' :
              log.type === 'warning' ? 'text-yellow-600' :
              'text-gray-600'
            }`}
          >
            <div className="flex-shrink-0 w-32">
              {format(log.timestamp, 'HH:mm:ss')}
            </div>
            <div className="flex-1">
              {getLogMessage(log)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default WorkflowLog 