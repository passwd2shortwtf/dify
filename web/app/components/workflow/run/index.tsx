'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useContext } from 'use-context-selector'
import { useTranslation } from 'react-i18next'
import OutputPanel from './output-panel'
import ResultPanel from './result-panel'
import TracingPanel from './tracing-panel'
import LogPanel from './log-panel'
import cn from '@/utils/classnames'
import { ToastContext } from '@/app/components/base/toast'
import Loading from '@/app/components/base/loading'
import { fetchRunDetail, fetchTracingList } from '@/service/log'
import type { NodeTracing } from '@/types/workflow'
import type { WorkflowRunDetailResponse } from '@/models/log'
import { useStore as useAppStore } from '@/app/components/app/store'
import { stopWorkflowRun } from '@/service/workflow'
import { useStore } from '@/app/components/workflow/store'

export type RunProps = {
  hideResult?: boolean
  activeTab?: 'RESULT' | 'DETAIL' | 'TRACING' | 'LOG'
  runID: string
  getResultCallback?: (result: WorkflowRunDetailResponse) => void
}

const RunPanel: FC<RunProps> = ({ hideResult, activeTab = 'RESULT', runID, getResultCallback }) => {
  const { t } = useTranslation()
  const { notify } = useContext(ToastContext)
  const [currentTab, setCurrentTab] = useState<string>(activeTab)
  const appDetail = useAppStore(state => state.appDetail)
  const workflowRunningData = useStore(state => state.workflowRunningData)
  const [loading, setLoading] = useState<boolean>(true)
  const [runDetail, setRunDetail] = useState<WorkflowRunDetailResponse>()
  const [list, setList] = useState<NodeTracing[]>([])

  const executor = useMemo(() => {
    if (runDetail?.created_by_role === 'account')
      return runDetail.created_by_account?.name || ''
    if (runDetail?.created_by_role === 'end_user')
      return runDetail.created_by_end_user?.session_id || ''
    return 'N/A'
  }, [runDetail])

  const getResult = useCallback(async (appID: string, runID: string) => {
    try {
      const res = await fetchRunDetail({
        appID,
        runID,
      })
      setRunDetail(res)
      if (getResultCallback)
        getResultCallback(res)
    }
    catch (err) {
      notify({
        type: 'error',
        message: `${err}`,
      })
    }
  }, [notify, getResultCallback])

  const getTracingList = useCallback(async (appID: string, runID: string) => {
    try {
      const { data: nodeList } = await fetchTracingList({
        url: `/apps/${appID}/workflow-runs/${runID}/node-executions`,
      })
      setList(nodeList)
    }
    catch (err) {
      notify({
        type: 'error',
        message: `${err}`,
      })
    }
  }, [notify])

  const getData = async (appID: string, runID: string) => {
    setLoading(true)
    await getResult(appID, runID)
    await getTracingList(appID, runID)
    setLoading(false)
  }

  const switchTab = async (tab: string) => {
    setCurrentTab(tab)
    if (tab === 'RESULT')
      appDetail?.id && await getResult(appDetail.id, runID)
    appDetail?.id && await getTracingList(appDetail.id, runID)
  }

  useEffect(() => {
    // fetch data
    if (appDetail && runID)
      getData(appDetail.id, runID)
  }, [appDetail, runID])

  const [height, setHeight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const adjustResultHeight = () => {
    if (ref.current)
      setHeight(ref.current?.clientHeight - 16 - 16 - 2 - 1)
  }

  useEffect(() => {
    adjustResultHeight()
  }, [loading])

  return (
    <div className='relative flex grow flex-col'>
      {/* tab */}
      <div className='flex shrink-0 items-center border-b-[0.5px] border-divider-subtle px-4'>
        {!hideResult && (
          <div
            className={cn(
              'system-sm-semibold-uppercase mr-6 cursor-pointer border-b-2 border-transparent py-3 text-text-tertiary',
              currentTab === 'RESULT' && '!border-util-colors-blue-brand-blue-brand-600 text-text-primary',
            )}
            onClick={() => switchTab('RESULT')}
          >{t('runLog.result')}</div>
        )}
        <div
          className={cn(
            'system-sm-semibold-uppercase mr-6 cursor-pointer border-b-2 border-transparent py-3 text-text-tertiary',
            currentTab === 'DETAIL' && '!border-util-colors-blue-brand-blue-brand-600 text-text-primary',
          )}
          onClick={() => switchTab('DETAIL')}
        >{t('runLog.detail')}</div>
        <div
          className={cn(
            'system-sm-semibold-uppercase mr-6 cursor-pointer border-b-2 border-transparent py-3 text-text-tertiary',
            currentTab === 'TRACING' && '!border-util-colors-blue-brand-blue-brand-600 text-text-primary',
          )}
          onClick={() => switchTab('TRACING')}
        >{t('runLog.tracing')}</div>
        <div
          className={cn(
            'system-sm-semibold-uppercase mr-6 cursor-pointer border-b-2 border-transparent py-3 text-text-tertiary',
            currentTab === 'LOG' && '!border-util-colors-blue-brand-blue-brand-600 text-text-primary',
          )}
          onClick={() => switchTab('LOG')}
        >{t('workflow.panel.executionLogs')}</div>
      </div>
      {/* panel detail */}
      <div ref={ref} className={cn('relative h-0 grow overflow-y-auto rounded-b-2xl bg-components-panel-bg')}>
        {loading && (
          <div className='flex h-full items-center justify-center bg-components-panel-bg'>
            <Loading />
          </div>
        )}
        {!loading && currentTab === 'RESULT' && runDetail && (
          <OutputPanel
            outputs={runDetail.outputs}
            error={runDetail.error}
            height={height}
          />
        )}
        {!loading && currentTab === 'DETAIL' && runDetail && (
          <ResultPanel
            inputs={runDetail.inputs}
            outputs={runDetail.outputs}
            status={runDetail.status}
            error={runDetail.error}
            elapsed_time={runDetail.elapsed_time}
            total_tokens={runDetail.total_tokens}
            created_at={runDetail.created_at}
            created_by={executor}
            steps={runDetail.total_steps}
            exceptionCounts={runDetail.exceptions_count}
          />
        )}
        {!loading && currentTab === 'TRACING' && (
          <TracingPanel
            className='bg-background-section-burn'
            list={list}
          />
        )}
        {!loading && currentTab === 'LOG' && (
          <LogPanel
            appId={appDetail?.id || ''}
            workflowRunId={runID}
            isRunning={runDetail?.status === 'running'}
            height={height}
          />
        )}
        {runDetail?.status === 'running' && (
          <div className='sticky bottom-0 flex justify-end p-4 bg-components-panel-bg border-t border-gray-200'>
            <button
              onClick={async () => {
                try {
                  await stopWorkflowRun(`/apps/${appDetail?.id}/workflow-runs/${runID}/stop`)
                  notify({ type: 'info', message: t('appDebug.infoMessage.workflowStopped') })
                } catch (error) {
                  console.error('Failed to stop workflow:', error)
                  notify({ type: 'error', message: t('appDebug.errorMessage.failedToStopWorkflow') })
                }
              }}
              className='inline-flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
            >
              {t('common.stop')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RunPanel
