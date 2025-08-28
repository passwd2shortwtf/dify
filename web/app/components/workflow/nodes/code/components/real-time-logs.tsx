import type { FC } from 'react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFilterLine,
  RiPauseLine,
  RiPlayLine,
  RiTerminalLine,
} from '@remixicon/react'
import type { StreamLogEvent } from '../types'
import { StreamingStatus } from '../types'
import cn from '@/utils/classnames'
import Button from '@/app/components/base/button'
import Tooltip from '@/app/components/base/tooltip'

interface RealTimeLogsProps {
  isOpen: boolean
  onClose: () => void
  logs: StreamLogEvent[]
  status: StreamingStatus
  maxLines?: number
  onClear?: () => void
  onDownload?: () => void
  className?: string
}

const RealTimeLogs: FC<RealTimeLogsProps> = ({
  isOpen,
  onClose,
  logs,
  status,
  maxLines = 1000,
  onClear,
  onDownload,
  className,
}) => {
  const { t } = useTranslation()
  const logsContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [logFilter, setLogFilter] = useState<'all' | 'stdout' | 'stderr' | 'error'>('all')
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])
  
  // 检测用户手动滚动
  const handleScroll = useCallback(() => {
    if (!logsContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
    setAutoScroll(isAtBottom)
  }, [])
  
  // 过滤日志
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true
    return log.type === logFilter
  })
  
  // 限制显示的日志数量
  const displayLogs = filteredLogs.slice(-maxLines)
  
  // 获取日志样式
  const getLogClassName = (logType: string) => {
    switch (logType) {
      case 'stdout':
        return 'text-gray-200'
      case 'stderr':
        return 'text-orange-400'
      case 'error':
        return 'text-red-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-gray-300'
    }
  }
  
  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
      })
    } catch {
      return timestamp
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className={cn('bg-white border rounded-lg shadow-lg', className)}>
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <RiTerminalLine className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-800">
            {t('workflow.nodes.code.realTimeLogs')}
          </span>
          <span className="text-xs text-gray-500">
            ({displayLogs.length}/{logs.length})
          </span>
          {status === StreamingStatus.RUNNING && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-600">
                {t('workflow.nodes.code.streaming')}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* 过滤器 */}
          <select
            value={logFilter}
            onChange={(e) => setLogFilter(e.target.value as any)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="all">{t('workflow.nodes.code.filters.all')}</option>
            <option value="stdout">{t('workflow.nodes.code.filters.stdout')}</option>
            <option value="stderr">{t('workflow.nodes.code.filters.stderr')}</option>
            <option value="error">{t('workflow.nodes.code.filters.error')}</option>
          </select>
          
          {/* 自动滚动切换 */}
          <Tooltip content={autoScroll ? t('workflow.nodes.code.pauseAutoScroll') : t('workflow.nodes.code.resumeAutoScroll')}>
            <Button
              variant="ghost"
              size="small"
              onClick={() => setAutoScroll(!autoScroll)}
            >
              {autoScroll ? <RiPauseLine className="w-3 h-3" /> : <RiPlayLine className="w-3 h-3" />}
            </Button>
          </Tooltip>
          
          {/* 清空日志 */}
          {onClear && (
            <Tooltip content={t('workflow.nodes.code.clearLogs')}>
              <Button
                variant="ghost"
                size="small"
                onClick={onClear}
              >
                <RiDeleteBinLine className="w-3 h-3" />
              </Button>
            </Tooltip>
          )}
          
          {/* 下载日志 */}
          {onDownload && (
            <Tooltip content={t('workflow.nodes.code.downloadLogs')}>
              <Button
                variant="ghost"
                size="small"
                onClick={onDownload}
              >
                <RiDownloadLine className="w-3 h-3" />
              </Button>
            </Tooltip>
          )}
          
          {/* 关闭 */}
          <Button
            variant="ghost"
            size="small"
            onClick={onClose}
          >
            <RiCloseLine className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* 日志内容 */}
      <div
        ref={logsContainerRef}
        onScroll={handleScroll}
        className="h-80 overflow-y-auto p-2 bg-gray-900 text-sm font-mono"
      >
        {displayLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            {t('workflow.nodes.code.noLogs')}
          </div>
        ) : (
          displayLogs.map((log, index) => (
            <div
              key={index}
              className="flex gap-2 py-0.5 hover:bg-gray-800 rounded px-1"
            >
              <span className="text-gray-400 text-xs shrink-0 w-20">
                {formatTimestamp(log.timestamp)}
              </span>
              <span className={cn('text-xs shrink-0 w-12', {
                'text-gray-400': log.type === 'stdout',
                'text-orange-400': log.type === 'stderr',
                'text-red-400': log.type === 'error',
                'text-blue-400': log.type === 'info',
              })}>
                [{log.type.toUpperCase()}]
              </span>
              <span className={cn('break-words', getLogClassName(log.type))}>
                {log.content}
              </span>
            </div>
          ))
        )}
        
        {/* 滚动到底部提示 */}
        {!autoScroll && status === StreamingStatus.RUNNING && (
          <div
            className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-blue-600 transition-colors"
            onClick={() => {
              setAutoScroll(true)
              if (logsContainerRef.current) {
                logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
              }
            }}
          >
            <span className="text-xs">
              {t('workflow.nodes.code.scrollToBottom')} ↓
            </span>
          </div>
        )}
      </div>
      
      {/* 底部状态栏 */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-600 rounded-b-lg">
        <div className="flex justify-between items-center">
          <span>
            {t('workflow.nodes.code.status.current')}: 
            <span className={cn('ml-1 font-medium', {
              'text-blue-600': status === StreamingStatus.RUNNING,
              'text-green-600': status === StreamingStatus.COMPLETED,
              'text-red-600': status === StreamingStatus.FAILED,
              'text-gray-600': status === StreamingStatus.IDLE,
            })}>
              {t(`workflow.nodes.code.status.${status}`)}
            </span>
          </span>
          
          {logs.length > maxLines && (
            <span className="text-orange-600">
              {t('workflow.nodes.code.logsLimited', { maxLines })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RealTimeLogs
