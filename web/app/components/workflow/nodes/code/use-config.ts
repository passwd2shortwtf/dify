import { useCallback, useEffect, useState } from 'react'
import produce from 'immer'
import useVarList from '../_base/hooks/use-var-list'
import useOutputVarList from '../_base/hooks/use-output-var-list'
import { BlockEnum, VarType } from '../../types'
import type { Var, Variable } from '../../types'
import { useStore } from '../../store'
import type { CodeNodeType, OutputVar, StreamLogEvent, StreamingConfig } from './types'
import { CodeLanguage, StreamingStatus } from './types'
import useNodeCrud from '@/app/components/workflow/nodes/_base/hooks/use-node-crud'
import { fetchNodeDefault } from '@/service/workflow'
import { useStore as useAppStore } from '@/app/components/app/store'
import {
  useNodesReadOnly,
} from '@/app/components/workflow/hooks'


const useConfig = (id: string, payload: CodeNodeType) => {
  const { nodesReadOnly: readOnly } = useNodesReadOnly()

  const appId = useAppStore.getState().appDetail?.id

  const [allLanguageDefault, setAllLanguageDefault] = useState<Record<CodeLanguage, CodeNodeType> | null>(null)
  useEffect(() => {
    if (appId) {
      (async () => {
        const { config: javaScriptConfig } = await fetchNodeDefault(appId, BlockEnum.Code, { code_language: CodeLanguage.javascript }) as any
        const { config: pythonConfig } = await fetchNodeDefault(appId, BlockEnum.Code, { code_language: CodeLanguage.python3 }) as any
        setAllLanguageDefault({
          [CodeLanguage.javascript]: javaScriptConfig as CodeNodeType,
          [CodeLanguage.python3]: pythonConfig as CodeNodeType,
        } as any)
      })()
    }
  }, [appId])

  const defaultConfig = useStore(s => s.nodesDefaultConfigs)[payload.type]
  const { inputs, setInputs } = useNodeCrud<CodeNodeType>(id, payload)
  const { handleVarListChange, handleAddVariable } = useVarList<CodeNodeType>({
    inputs,
    setInputs,
  })

  const [outputKeyOrders, setOutputKeyOrders] = useState<string[]>([])
  const syncOutputKeyOrders = useCallback((outputs: OutputVar) => {
    setOutputKeyOrders(Object.keys(outputs))
  }, [])
  useEffect(() => {
    if (inputs.code) {
      if (inputs.outputs && Object.keys(inputs.outputs).length > 0)
        syncOutputKeyOrders(inputs.outputs)

      return
    }

    const isReady = defaultConfig && Object.keys(defaultConfig).length > 0
    if (isReady) {
      setInputs({
        ...inputs,
        ...defaultConfig,
      })
      syncOutputKeyOrders(defaultConfig.outputs)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultConfig])

  const handleCodeChange = useCallback((code: string) => {
    const newInputs = produce(inputs, (draft) => {
      draft.code = code
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  const handleCodeLanguageChange = useCallback((codeLanguage: CodeLanguage) => {
    const currDefaultConfig = allLanguageDefault?.[codeLanguage]

    const newInputs = produce(inputs, (draft) => {
      draft.code_language = codeLanguage
      if (!currDefaultConfig)
        return
      draft.code = currDefaultConfig.code
      draft.variables = currDefaultConfig.variables
      draft.outputs = currDefaultConfig.outputs
    })
    setInputs(newInputs)
  }, [allLanguageDefault, inputs, setInputs])

  const handleSyncFunctionSignature = useCallback(() => {
      const generateSyncSignatureCode = (code: string) => {
      let mainDefRe
      let newMainDef
      if (inputs.code_language === CodeLanguage.javascript) {
        mainDefRe = /function\s+main\b\s*\([\s\S]*?\)/g
        newMainDef = 'function main({{var_list}})'
        let param_list = inputs.variables?.map(item => item.variable).join(', ') || ''
        param_list = param_list ? `{${param_list}}` : ''
        newMainDef = newMainDef.replace('{{var_list}}', param_list)
      }

      else if (inputs.code_language === CodeLanguage.python3) {
        mainDefRe = /def\s+main\b\s*\([\s\S]*?\)/g
        const param_list = []
        for (const item of inputs.variables) {
          let param = item.variable
          let param_type = ''
          switch (item.value_type) {
            case VarType.string:
              param_type = ': str'
              break
            case VarType.number:
              param_type = ': float'
              break
            case VarType.object:
              param_type = ': dict'
              break
            case VarType.array:
              param_type = ': list'
              break
            case VarType.arrayNumber:
              param_type = ': list[float]'
              break
            case VarType.arrayString:
              param_type = ': list[str]'
              break
            case VarType.arrayObject:
              param_type = ': list[dict]'
              break
          }
          param += param_type
          param_list.push(`${param}`)
        }

        newMainDef = `def main(${param_list.join(', ')})`
      }
      else { return code }

      const newCode = code.replace(mainDefRe, newMainDef)
      return newCode
    }

    const newInputs = produce(inputs, (draft) => {
      draft.code = generateSyncSignatureCode(draft.code)
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  const {
    handleVarsChange,
    handleAddVariable: handleAddOutputVariable,
    handleRemoveVariable,
    isShowRemoveVarConfirm,
    hideRemoveVarConfirm,
    onRemoveVarConfirm,
  } = useOutputVarList<CodeNodeType>({
    id,
    inputs,
    setInputs,
    outputKeyOrders,
    onOutputKeyOrdersChange: setOutputKeyOrders,
  })

  const filterVar = useCallback((varPayload: Var) => {
    return [VarType.string, VarType.number, VarType.secret, VarType.object, VarType.array, VarType.arrayNumber, VarType.arrayString, VarType.arrayObject, VarType.file, VarType.arrayFile].includes(varPayload.type)
  }, [])

  const handleCodeAndVarsChange = useCallback((code: string, inputVariables: Variable[], outputVariables: OutputVar) => {
    const newInputs = produce(inputs, (draft) => {
      draft.code = code
      draft.variables = inputVariables
      draft.outputs = outputVariables
    })
    setInputs(newInputs)
    syncOutputKeyOrders(outputVariables)
  }, [inputs, setInputs, syncOutputKeyOrders])
  // Streaming logs state
  const [logs, setLogs] = useState<StreamLogEvent[]>([])
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus>(StreamingStatus.IDLE)
  const [isLogsVisible, setIsLogsVisible] = useState(false)

  // Streaming configuration handlers
  const handleStreamingConfigChange = useCallback((config: StreamingConfig) => {
    const newInputs = produce(inputs, (draft) => {
      draft.streaming = config
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  const handleEnableStreamingChange = useCallback((enabled: boolean) => {
    const newInputs = produce(inputs, (draft) => {
      if (enabled) {
        draft.streaming = {
          enabled: true,
          buffer_timeout: 100,
          max_log_lines: 1000,
        }
      } else {
        draft.streaming = {
          enabled: false,
          buffer_timeout: 100,
          max_log_lines: 1000,
        }
      }
    })
    setInputs(newInputs)
  }, [inputs, setInputs])

  // Log management
  const handleClearLogs = useCallback(() => {
    setLogs([])
  }, [])

  const handleDownloadLogs = useCallback(() => {
    const logContent = logs.map(log => 
      `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.content}`
    ).join('\n')
    
    const blob = new Blob([logContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `code-logs-${id}-${Date.now()}.log`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [logs, id])

  const handleAddLog = useCallback((log: StreamLogEvent) => {
    setLogs(prev => {
      const maxLines = inputs.streaming?.max_log_lines || 1000
      const newLogs = [...prev, log]
      return newLogs.slice(-maxLines) // Keep max lines limit
    })
  }, [inputs.streaming?.max_log_lines])



  return {
    readOnly,
    inputs,
    outputKeyOrders,
    handleVarListChange,
    handleAddVariable,
    handleRemoveVariable,
    handleSyncFunctionSignature,
    handleCodeChange,
    handleCodeLanguageChange,
    handleVarsChange,
    filterVar,
    handleAddOutputVariable,
    isShowRemoveVarConfirm,
    hideRemoveVarConfirm,
    onRemoveVarConfirm,
    handleCodeAndVarsChange,
    // Streaming functionality
    logs,
    streamingStatus,
    isLogsVisible,
    setIsLogsVisible,
    setStreamingStatus,
    handleStreamingConfigChange,
    handleEnableStreamingChange,
    handleClearLogs,
    handleDownloadLogs,
    handleAddLog,
  }
}

export default useConfig
