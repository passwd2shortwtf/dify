'use client'
import type { FC } from 'react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBoolean } from 'ahooks'
import { t } from 'i18next'
import produce from 'immer'
// import { RiStopCircleLine } from '@remixicon/react'
import cn from '@/utils/classnames'
import Loading from '@/app/components/base/loading'
import { fetchRunDetail, fetchTracingList } from '@/service/log'
import type { NodeTracing } from '@/types/workflow'
import type { WorkflowRunDetailResponse } from '@/models/log'
import { stopWorkflowRun } from '@/service/workflow'
import type { PromptConfig } from '@/models/debug'
import type { InstalledApp } from '@/models/explore'
import type { VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import type { SiteInfo } from '@/models/share'
import LogPanel from '@/app/components/workflow/run/log-panel'
import Toast from '@/app/components/base/toast'
import { sendCompletionMessage, sendWorkflowMessage, updateFeedback } from '@/service/share'
import { useWorkflowExecutionLog } from '@/app/components/workflow/hooks/use-workflow-run-event/use-workflow-execution-log'
import type { FeedbackType } from '@/app/components/base/chat/chat/type'
import { NodeRunningStatus, WorkflowRunningStatus } from '@/app/components/workflow/types'
import type { WorkflowProcess } from '@/app/components/base/chat/types'
import { sleep } from '@/utils'
import { TEXT_GENERATION_TIMEOUT_MS } from '@/config'
import { getFilesInLogs } from '@/app/components/base/file-uploader/utils'
// import TextGenerationRes from '@/app/components/app/text-generate/item'
import WorkflowProcessItem from '@/app/components/base/chat/chat/answer/workflow-process'

// Import components from workflow/run
import OutputPanel from '@/app/components/workflow/run/output-panel'
import ResultPanel from '@/app/components/workflow/run/result-panel'
import TracingPanel from '@/app/components/workflow/run/tracing-panel'

export type EnhancedResultProps = {
  isWorkflow: boolean
  isCallBatchAPI: boolean
  isPC: boolean
  isMobile: boolean
  isInstalledApp: boolean
  installedAppInfo?: InstalledApp
  promptConfig: PromptConfig | null
  moreLikeThisEnabled: boolean
  visionConfig: VisionSettings
  completionFiles: VisionFile[]
  siteInfo: SiteInfo | null
  appId: string
  runId?: string
  onSaveMessage?: (messageId: string) => void
  taskId?: number
  className?: string
  // 新增的props用于处理实时运行
  inputs?: Record<string, any>
  controlSend?: number
  controlRetry?: number
  controlStopResponding?: number
  onShowRes?: () => void
  onCompleted?: (completionRes: string, taskId?: number, success?: boolean) => void
  onRunStart?: () => void
  isError?: boolean
  isShowTextToSpeech?: boolean
  onSelectCurrentRun?: (runId: string) => void
  onExecutionStatusChange?: () => void
}

const EnhancedResult: FC<EnhancedResultProps> = ({
  isWorkflow,
  isCallBatchAPI,
  isPC,
  isMobile,
  isInstalledApp,
  installedAppInfo,
  isError,
  isShowTextToSpeech,
  promptConfig,
  moreLikeThisEnabled,
  inputs = {},
  controlSend,
  controlRetry,
  controlStopResponding,
  onShowRes,
  onSaveMessage,
  taskId,
  onCompleted,
  visionConfig,
  completionFiles,
  siteInfo,
  onRunStart,
  appId,
  runId,
  onSelectCurrentRun,
  onExecutionStatusChange,
  className = '',
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const { handleWorkflowExecutionLog } = useWorkflowExecutionLog()

  // 当前运行相关状态
  const [isResponding, { setTrue: setRespondingTrue, setFalse: setRespondingFalse }] = useBoolean(false)
  const [completionRes, doSetCompletionRes] = useState<any>('')
  const completionResRef = useRef<any>()
  const setCompletionRes = (res: any) => {
    completionResRef.current = res
    doSetCompletionRes(res)
  }
  const getCompletionRes = () => completionResRef.current
  const [workflowProcessData, doSetWorkflowProcessData] = useState<WorkflowProcess>()
  const workflowProcessDataRef = useRef<WorkflowProcess>()
  const setWorkflowProcessData = (data: WorkflowProcess) => {
    workflowProcessDataRef.current = data
    doSetWorkflowProcessData(data)
  }
  const getWorkflowProcessData = () => workflowProcessDataRef.current
  const [messageId, setMessageId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackType>({
    rating: null,
  })
  const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined)

  // 历史运行相关状态
  const [currentTab, setCurrentTab] = useState<string>('RESULT')
  const [loading, setLoading] = useState<boolean>(true)
  const [runDetail, setRunDetail] = useState<WorkflowRunDetailResponse>()
  const [tracingList, setTracingList] = useState<NodeTracing[]>([])

  // 判断是否是当前运行状态
  const isCurrentRun = isResponding || (!runId && completionRes)
  const isHistoryRun = runId && !isCurrentRun

  useEffect(() => {
    if (controlStopResponding)
      setRespondingFalse()
  }, [controlStopResponding])

  const executor = useMemo(() => {
    if (runDetail?.created_by_role === 'account')
      return runDetail.created_by_account?.name || ''
    if (runDetail?.created_by_role === 'end_user')
      return runDetail.created_by_end_user?.session_id || ''
    return 'N/A'
  }, [runDetail])

  const handleFeedback = async (feedback: FeedbackType) => {
    await updateFeedback({ url: `/messages/${messageId}/feedbacks`, body: { rating: feedback.rating } }, isInstalledApp, installedAppInfo?.id)
    setFeedback(feedback)
  }

  const logError = (message: string) => {
    notify({ type: 'error', message })
  }

  const checkCanSend = () => {
    // batch will check outer
    if (isCallBatchAPI)
      return true

    const prompt_variables = promptConfig?.prompt_variables
    if (!prompt_variables || prompt_variables?.length === 0) {
      if (completionFiles.find(item => item.transfer_method === TransferMethod.local_file && !item.upload_file_id)) {
        notify({ type: 'info', message: t('appDebug.errorMessage.waitForFileUpload') })
        return false
      }
      return true
    }

    let hasEmptyInput = ''
    const requiredVars = prompt_variables?.filter(({ key, name, required }) => {
      const res = (!key || !key.trim()) || (!name || !name.trim()) || (required || required === undefined || required === null)
      return res
    }) || [] // compatible with old version
    requiredVars.forEach(({ key, name }) => {
      if (hasEmptyInput)
        return

      if (!inputs[key])
        hasEmptyInput = name
    })

    if (hasEmptyInput) {
      logError(t('appDebug.errorMessage.valueOfVarRequired', { key: hasEmptyInput }))
      return false
    }

    if (completionFiles.find(item => item.transfer_method === TransferMethod.local_file && !item.upload_file_id)) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForFileUpload') })
      return false
    }
    return !hasEmptyInput
  }

  const handleSend = async () => {
    if (isResponding) {
      notify({ type: 'info', message: t('appDebug.errorMessage.waitForResponse') })
      return false
    }

    if (!checkCanSend())
      return

    const data: Record<string, any> = {
      inputs,
    }
    if (visionConfig.enabled && completionFiles && completionFiles?.length > 0) {
      data.files = completionFiles.map((item) => {
        if (item.transfer_method === TransferMethod.local_file) {
          return {
            ...item,
            url: '',
          }
        }
        return item
      })
    }

    setMessageId(null)
    setFeedback({
      rating: null,
    })
    setCompletionRes('')

    let res: string[] = []
    let tempMessageId = ''

    if (!isPC) {
      onShowRes?.()
      onRunStart?.()
    }

    setRespondingTrue()
    let isEnd = false
    let isTimeout = false;
    (async () => {
      await sleep(TEXT_GENERATION_TIMEOUT_MS)
      if (!isEnd) {
        setRespondingFalse()
        onCompleted?.(getCompletionRes(), taskId, false)
        isTimeout = true
      }
    })()



    if (isWorkflow) {
      sendWorkflowMessage(
        data,
        {
          onWorkflowStarted: ({ workflow_run_id, task_id }) => {
            tempMessageId = workflow_run_id
            setCurrentTaskId(task_id)
            setWorkflowProcessData({
              status: WorkflowRunningStatus.Running,
              tracing: [],
              expand: false,
              resultText: '',
            })
            // 自动选中当前运行
            onSelectCurrentRun?.(workflow_run_id)
            setCurrentTab('LOG') // 运行时显示日志
            // 触发执行历史刷新
            onExecutionStatusChange?.()
          },
          onIterationStart: ({ data: iterationData }) => {
            setWorkflowProcessData(produce(getWorkflowProcessData()!, (draft) => {
              draft.expand = true
              draft.tracing!.push({
                ...iterationData,
                status: NodeRunningStatus.Running,
                expand: true,
              })
            }))

          },
          onNodeStarted: ({ data: nodeData }) => {
            setWorkflowProcessData(produce(getWorkflowProcessData()!, (draft) => {
              draft.expand = true
              draft.tracing!.push({
                ...nodeData,
                status: NodeRunningStatus.Running,
                expand: true,
              })
            }))

          },
          onNodeFinished: ({ data: nodeData }) => {
            setWorkflowProcessData(produce(getWorkflowProcessData()!, (draft) => {
              const currentIndex = draft.tracing!.findIndex(item => item.node_id === nodeData.node_id)
              if (currentIndex !== -1) {
                draft.tracing![currentIndex] = {
                  ...draft.tracing![currentIndex],
                  ...nodeData,
                  status: NodeRunningStatus.Succeeded,
                }
              }
            }))

          },
          onWorkflowFinished: ({ data }) => {
            if (isTimeout) {
              isEnd = true
              return
            }
            setWorkflowProcessData(produce(getWorkflowProcessData()!, (draft) => {
              draft.status = WorkflowRunningStatus.Succeeded
              draft.files = getFilesInLogs(data.outputs || []) as any[]
            }))

            if (!data.outputs) {
              setCompletionRes('')
            }
            else {
              setCompletionRes(data.outputs)
              const isStringOutput = Object.keys(data.outputs).length === 1 && typeof data.outputs[Object.keys(data.outputs)[0]] === 'string'
              if (isStringOutput) {
                setWorkflowProcessData(produce(getWorkflowProcessData()!, (draft) => {
                  draft.resultText = data.outputs[Object.keys(data.outputs)[0]]
                }))
              }
            }
            setRespondingFalse()
            setMessageId(tempMessageId)
            onCompleted?.(getCompletionRes(), taskId, true)
            setCurrentTab('RESULT') // 完成后显示结果
            // 触发执行历史刷新
            onExecutionStatusChange?.()
            isEnd = true
          },
          onTextChunk: (params) => {
            const { data: { text } } = params
            setWorkflowProcessData(produce(getWorkflowProcessData()!, (draft) => {
              draft.resultText += text
            }))
          },
          onTextReplace: (params) => {
            const { data: { text } } = params
            setWorkflowProcessData(produce(getWorkflowProcessData()!, (draft) => {
              draft.resultText = text
            }))
          },
          onExecutionLog: handleWorkflowExecutionLog,
        },
        isInstalledApp,
        installedAppInfo?.id,
      )
    }
    else {
      sendCompletionMessage(data, {
        onData: (data: string, _isFirstMessage: boolean, { messageId }) => {
          tempMessageId = messageId
          res.push(data)
          setCompletionRes(res.join(''))
        },
        onCompleted: () => {
          if (isTimeout) {
            notify({ type: 'warning', message: t('appDebug.warningMessage.timeoutExceeded') })
            return
          }
          setRespondingFalse()
          setMessageId(tempMessageId)
          onCompleted?.(getCompletionRes(), taskId, true)
          // 触发执行历史刷新
          onExecutionStatusChange?.()
          isEnd = true
        },
        onMessageReplace: (messageReplace) => {
          res = [messageReplace.answer]
          setCompletionRes(res.join(''))
        },
        onError() {
          if (isTimeout) {
            notify({ type: 'warning', message: t('appDebug.warningMessage.timeoutExceeded') })
            return
          }
          setRespondingFalse()
          onCompleted?.(getCompletionRes(), taskId, false)
          // 触发执行历史刷新
          onExecutionStatusChange?.()
          isEnd = true
        },
      }, isInstalledApp, installedAppInfo?.id)
    }
  }

  // 监听controlSend变化
  useEffect(() => {
    if (controlSend) {
      handleSend()
    }
  }, [controlSend])

  useEffect(() => {
    if (controlRetry)
      handleSend()
  }, [controlRetry])

  // 历史运行相关逻辑
  const getResult = useCallback(async (appID: string, runID: string) => {
    try {
      const res = await fetchRunDetail({
        appID,
        runID,
      })
      setRunDetail(res)
    }
    catch (err) {
      notify({
        type: 'error',
        message: `${err}`,
      })
    }
  }, [notify])

  const getTracingList = useCallback(async (appID: string, runID: string) => {
    try {
      const { data: nodeList } = await fetchTracingList({
        url: `/apps/${appID}/workflow-runs/${runID}/node-executions`,
      })
      setTracingList(nodeList)
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
    await Promise.all([
      getResult(appID, runID),
      getTracingList(appID, runID)
    ])
    setLoading(false)
  }

  const switchTab = async (tab: string) => {
    setCurrentTab(tab)
    if (tab === 'RESULT' && appId && runId)
      await getResult(appId, runId)
    if (appId && runId)
      await getTracingList(appId, runId)
  }

  useEffect(() => {
    if (appId && runId && isHistoryRun) {
      getData(appId, runId)
      // 根据运行状态设置默认tab
      if (runDetail?.status === 'running') {
        setCurrentTab('LOG')
      } else {
        setCurrentTab('RESULT')
      }
    } else if (isHistoryRun) {
      setLoading(false)
      setRunDetail(undefined)
      setTracingList([])
    }
  }, [appId, runId, runDetail?.status, isHistoryRun])

  const [height, setHeight] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const adjustResultHeight = () => {
    if (ref.current)
      setHeight(ref.current?.clientHeight - 16 - 16 - 2 - 1)
  }

  useEffect(() => {
    adjustResultHeight()
  }, [loading])

  // 如果是当前运行且没有数据，显示等待状态
  if (isCurrentRun && !completionRes && !isResponding) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center bg-components-panel-bg', className)}>
        <div className="text-center">
          <div className="mb-2 text-base font-medium text-text-secondary">
            {t('share.generation.selectRunToView')}
          </div>
          <div className="text-sm text-text-tertiary">
            {t('share.generation.selectRunToViewDesc')}
          </div>
        </div>
      </div>
    )
  }

  // 如果是历史运行但没有选中，显示提示
  if (isHistoryRun && !runId) {
    return (
      <div className={cn('flex h-full flex-col items-center justify-center bg-components-panel-bg', className)}>
        <div className="text-center">
          <div className="mb-2 text-base font-medium text-text-secondary">
            {t('share.generation.selectRunToView')}
          </div>
          <div className="text-sm text-text-tertiary">
            {t('share.generation.selectRunToViewDesc')}
          </div>
        </div>
      </div>
    )
  }

  const isRunning = isResponding || runDetail?.status === 'running'
  const showLogTab = isRunning || isWorkflow
  const shouldShowResultTab = !isRunning || (isCurrentRun && completionRes)

  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      {/* tab */}
      <div className='flex shrink-0 items-center border-b-[0.5px] border-divider-subtle px-4'>
        {shouldShowResultTab && (
          <div
            className={cn(
              'system-sm-semibold-uppercase mr-6 cursor-pointer border-b-2 border-transparent py-3 text-text-tertiary',
              currentTab === 'RESULT' && '!border-util-colors-blue-brand-blue-brand-600 text-text-primary',
            )}
            onClick={() => setCurrentTab('RESULT')}
          >{t('runLog.result')}</div>
        )}
        {showLogTab && (
          <div
            className={cn(
              'system-sm-semibold-uppercase mr-6 cursor-pointer border-b-2 border-transparent py-3 text-text-tertiary',
              currentTab === 'LOG' && '!border-util-colors-blue-brand-blue-brand-600 text-text-primary',
            )}
            onClick={() => setCurrentTab('LOG')}
          >{t('share.generation.log')}</div>
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
      </div>

      {/* panel detail */}
      <div ref={ref} className={cn('relative h-0 grow overflow-y-auto bg-components-panel-bg')}>
        {isHistoryRun && loading && (
          <div className='flex h-full items-center justify-center bg-components-panel-bg'>
            <Loading />
          </div>
        )}
        
        {/* 当前运行结果 */}
        {isCurrentRun && currentTab === 'RESULT' && (
          <div className="p-4">
            {isResponding && !completionRes && (
              <div className="flex items-center justify-center py-8">
                <Loading />
                <span className="ml-2 text-text-secondary">运行中...</span>
              </div>
            )}
            {completionRes && (
              <div className="space-y-4">
                {isWorkflow && workflowProcessData && (
                  <WorkflowProcessItem
                    data={workflowProcessData}
                  />
                )}
                {typeof completionRes === 'string' ? (
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: completionRes }} />
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">
                      {JSON.stringify(completionRes, null, 2)}
                    </pre>
                  </div>
                )}
                {/* 反馈按钮 */}
                {messageId && (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleFeedback({ rating: 'like' })}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500',
                        feedback.rating === 'like' && 'border-blue-500 bg-blue-50 text-blue-600'
                      )}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleFeedback({ rating: 'dislike' })}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500',
                        feedback.rating === 'dislike' && 'border-red-500 bg-red-50 text-red-600'
                      )}
                    >
                      👎
                    </button>
                    {onSaveMessage && (
                      <button
                        onClick={() => onSaveMessage(messageId)}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500"
                      >
                        📋
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* 历史运行结果 */}
        {isHistoryRun && !loading && currentTab === 'RESULT' && runDetail && (
          <OutputPanel
            outputs={runDetail.outputs}
            error={runDetail.error}
            height={height}
          />
        )}
        
        {/* 日志 */}
        {currentTab === 'LOG' && (
          <LogPanel 
            appId={appId}
            workflowRunId={runId || currentTaskId || ''}
            isRunning={isCurrentRun && isResponding}
            className="h-full"
          />
        )}
        
        {/* 详情 */}
        {!loading && currentTab === 'DETAIL' && (
          <div>
            {isCurrentRun && workflowProcessData && (
              <ResultPanel
                inputs={JSON.stringify(inputs, null, 2)}
                outputs={completionRes}
                status={workflowProcessData.status}
                error={''}
                elapsed_time={0}
                total_tokens={0}
                created_at={Date.now() / 1000}
                created_by="Current User"
                steps={workflowProcessData.tracing?.length || 0}
                exceptionCounts={0}
              />
            )}
            {isHistoryRun && runDetail && (
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
          </div>
        )}
        
        {/* 追踪 */}
        {!loading && currentTab === 'TRACING' && (
          <div>
            {isCurrentRun && workflowProcessData && (
              <TracingPanel
                className='bg-background-section-burn'
                list={workflowProcessData.tracing || []}
              />
            )}
            {isHistoryRun && (
              <TracingPanel
                className='bg-background-section-burn'
                list={tracingList}
              />
            )}
          </div>
        )}
        
        {isRunning && (
          <div className='sticky bottom-0 flex justify-end p-4 bg-components-panel-bg border-t border-gray-200'>
            <button
              onClick={async () => {
                try {
                  await stopWorkflowRun(`/installed-apps/${installedAppInfo?.id}/workflows/run/${runId}/stop`)
                  setRespondingFalse()
                  notify({ type: 'info', message: t('appDebug.infoMessage.workflowStopped') })
                  // 触发执行历史刷新
                  onExecutionStatusChange?.()
                } catch (error) {
                  console.error('Failed to stop workflow:', error)
                  notify({ type: 'error', message: t('appDebug.errorMessage.failedToStopWorkflow') })
                }
              }}
              className='inline-flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
            >
              <div className="mr-2 h-4 w-4">⏹</div>
              {t('common.stop')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedResult