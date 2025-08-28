'use client'
import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import { useTranslation } from 'react-i18next'
// import {
//   RiCheckboxCircleLine,
//   RiErrorWarningLine,
//   RiCloseLine,
// } from '@remixicon/react'
import { format } from 'date-fns'
import { useBoolean } from 'ahooks'
import cn from '@/utils/classnames'
import Loading from '@/app/components/base/loading'
import { ClockPlaySlim } from '@/app/components/base/icons/src/vender/line/time'
import { AlertTriangle } from '@/app/components/base/icons/src/vender/line/alertsAndFeedback'
import ClockPlay from '@/app/components/base/icons/src/vender/line/time/ClockPlay'
import Collapse from '@/app/components/base/icons/src/vender/line/editor/Collapse'
import { fetchWorkflowRunHistory } from '@/service/workflow'
import type { WorkflowRunDetailResponse } from '@/models/log'

export interface ExecutionHistoryItem {
  id: string
  status: 'running' | 'succeeded' | 'failed' | 'stopped'
  created_at: number
  finished_at?: number
  created_by_account?: {
    name: string
  }
  error?: string
  elapsed_time?: number
  total_tokens?: number
  total_steps?: number
}

type ExecutionHistoryProps = {
  appId: string
  isWorkflow?: boolean
  selectedRunId?: string
  onSelectRun: (runId: string) => void
  className?: string
  refreshTrigger?: number // 用于触发刷新的时间戳
}

const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({
  appId,
  isWorkflow = false,
  selectedRunId,
  onSelectRun,
  className = '',
  refreshTrigger,
}) => {
  const { t } = useTranslation()
  const [collapsed, { toggle: toggleCollapsed }] = useBoolean(false)
  
  const { data: runList, isLoading, mutate } = useSWR(
    appId ? `/apps/${appId}/workflow-runs` : null,
    fetchWorkflowRunHistory
  )

  // 监听refreshTrigger变化，触发数据刷新
  useEffect(() => {
    if (refreshTrigger) {
      mutate() // 重新获取数据
    }
  }, [refreshTrigger, mutate])

  const formatTimeFromNow = (timestamp: number) => {
    return format(new Date(timestamp * 1000), 'MM/dd HH:mm')
  }

  const formatWorkflowRunIdentifier = (timestamp?: number) => {
    if (!timestamp) return ''
    return ` #${format(new Date(timestamp * 1000), 'MMddHHmm')}`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <div className="h-3.5 w-3.5 rounded-full bg-green-500" />
      case 'failed':
        return <div className="h-3.5 w-3.5 rounded-full bg-red-500" />
      case 'stopped':
        return <AlertTriangle className="h-3.5 w-3.5 text-[#F79009]" />
      case 'running':
        return <div className="h-3.5 w-3.5 rounded-full bg-blue-500 animate-pulse" />
      default:
        return null
    }
  }

  if (collapsed) {
    return (
      <div className={cn('flex h-full flex-col border-r border-divider-subtle bg-components-panel-bg flex-shrink-0', className)} style={{ width: '32px' }}>
        <div className="flex h-12 items-center justify-center border-b border-divider-subtle">
          <button
            onClick={toggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-state-base-hover"
            title={t('share.generation.executionHistory')}
          >
            <ClockPlay className="h-4 w-4 text-text-tertiary" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex h-full flex-col border-r border-divider-subtle bg-components-panel-bg flex-shrink-0', className)} style={{ width: '240px' }}>
      {/* Header */}
      <div className="flex h-12 items-center justify-between px-4 border-b border-divider-subtle">
        <div className="system-sm-semibold text-text-primary">{t('share.generation.executionHistory')}</div>
        <button
          onClick={toggleCollapsed}
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-state-base-hover"
          title="折叠"
        >
          <Collapse className="h-4 w-4 text-text-tertiary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex h-20 items-center justify-center">
            <Loading />
          </div>
        )}

        {!isLoading && !runList?.data?.length && (
          <div className="py-12">
            <ClockPlaySlim className="mx-auto mb-2 h-8 w-8 text-text-quaternary" />
            <div className="text-center text-xs text-text-quaternary">
              {t('workflow.common.notRunning')}
            </div>
          </div>
        )}

        {!isLoading && runList?.data?.map((item: ExecutionHistoryItem) => (
          <div
            key={item.id}
            className={cn(
              'mb-1 flex cursor-pointer rounded-lg px-2 py-2 hover:bg-state-base-hover',
              item.id === selectedRunId && 'bg-state-accent-hover hover:bg-state-accent-hover',
            )}
            onClick={() => onSelectRun(item.id)}
          >
            <div className="mr-2 mt-0.5 flex-shrink-0">
              {getStatusIcon(item.status)}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'flex items-center text-xs font-medium leading-4 text-text-primary',
                  item.id === selectedRunId && 'text-text-accent',
                )}
              >
                {`${isWorkflow ? 'Workflow' : 'Test'} Run${formatWorkflowRunIdentifier(item.finished_at || item.created_at)}`}
              </div>
              <div className="flex items-center text-xs leading-4 text-text-tertiary">
                {item.created_by_account?.name || 'Unknown'} · {formatTimeFromNow(item.finished_at || item.created_at)}
              </div>
              {item.status === 'running' && (
                <div className="text-xs text-blue-600">Running...</div>
              )}
              {item.status === 'failed' && item.error && (
                <div className="text-xs text-red-600 truncate" title={item.error}>
                  {item.error}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExecutionHistory