import type { FC } from 'react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RiEyeLine,
  RiEyeOffLine,
  RiPlayLine,
  RiTerminalLine,
} from '@remixicon/react'
import RemoveEffectVarConfirm from '../_base/components/remove-effect-var-confirm'
import useConfig from './use-config'
import type { CodeNodeType } from './types'
import { CodeLanguage, StreamingStatus } from './types'
import { extractFunctionParams, extractReturnType } from './code-parser'
import RealTimeLogs from './components/real-time-logs'
import VarList from '@/app/components/workflow/nodes/_base/components/variable/var-list'
import OutputVarList from '@/app/components/workflow/nodes/_base/components/variable/output-var-list'
import AddButton from '@/app/components/base/button/add-button'
import Field from '@/app/components/workflow/nodes/_base/components/field'
import Split from '@/app/components/workflow/nodes/_base/components/split'
import CodeEditor from '@/app/components/workflow/nodes/_base/components/editor/code-editor'
import TypeSelector from '@/app/components/workflow/nodes/_base/components/selector'
import type { NodePanelProps } from '@/app/components/workflow/types'
import SyncButton from '@/app/components/base/button/sync-button'
import Button from '@/app/components/base/button'
import Switch from '@/app/components/base/switch'
import Tooltip from '@/app/components/base/tooltip'
const i18nPrefix = 'workflow.nodes.code'

const codeLanguages = [
  {
    label: 'Python3',
    value: CodeLanguage.python3,
  },
  {
    label: 'JavaScript',
    value: CodeLanguage.javascript,
  },
]
const Panel: FC<NodePanelProps<CodeNodeType>> = ({
  id,
  data,
}) => {
  const { t } = useTranslation()

  const {
    readOnly,
    inputs,
    outputKeyOrders,
    handleCodeAndVarsChange,
    handleVarListChange,
    handleAddVariable,
    handleRemoveVariable,
    handleSyncFunctionSignature,
    handleCodeChange,
    handleCodeLanguageChange,
    handleVarsChange,
    handleAddOutputVariable,
    filterVar,
    isShowRemoveVarConfirm,
    hideRemoveVarConfirm,
    onRemoveVarConfirm,
    // Streaming functionality
    logs,
    streamingStatus,
    isLogsVisible,
    setIsLogsVisible,
    handleStreamingConfigChange,
    handleEnableStreamingChange,
    handleClearLogs,
    handleDownloadLogs,
  } = useConfig(id, data)

  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)

  const handleGeneratedCode = (value: string) => {
    const params = extractFunctionParams(value, inputs.code_language)
    const codeNewInput = params.map((p) => {
      return {
        variable: p,
        value_selector: [],
      }
    })
    const returnTypes = extractReturnType(value, inputs.code_language)
    handleCodeAndVarsChange(value, codeNewInput, returnTypes)
  }

  const handleStreamingConfigUpdate = (key: string, value: any) => {
    const newConfig = {
      ...inputs.streaming,
      [key]: value,
    }
    handleStreamingConfigChange(newConfig)
  }



  return (
    <div className='mt-2'>
      <div className='space-y-4 px-4 pb-4'>
        {/* Streaming Configuration */}
        <Field
          title={t(`${i18nPrefix}.streamingConfig`)}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  defaultValue={inputs.streaming?.enabled || false}
                  onChange={handleEnableStreamingChange}
                  disabled={readOnly}
                />
                <span className="text-sm text-gray-700">
                  {t(`${i18nPrefix}.enableStreaming`)}
                </span>
              </div>
              
              {inputs.streaming?.enabled && (
                <div className="flex items-center gap-2">

                  {/* View logs button */}
                  <Tooltip content={isLogsVisible ? t(`${i18nPrefix}.hideLogs`) : t(`${i18nPrefix}.showLogs`)}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => setIsLogsVisible(!isLogsVisible)}
                    >
                      {isLogsVisible ? (
                        <RiEyeOffLine className="w-3 h-3" />
                      ) : (
                        <RiTerminalLine className="w-3 h-3" />
                      )}
                    </Button>
                  </Tooltip>
                </div>
              )}
            </div>
            
            {inputs.streaming?.enabled && (
              <>
                {/* Advanced configuration */}
                <div className="border-t pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showAdvancedConfig ? t('common.hideAdvanced') : t('common.showAdvanced')}
                  </button>
                  
                  {showAdvancedConfig && (
                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-700 w-32">
                          {t(`${i18nPrefix}.bufferTimeout`)}
                        </label>
                        <input
                          type="number"
                          value={inputs.streaming?.buffer_timeout || 100}
                          onChange={(e) => handleStreamingConfigUpdate('buffer_timeout', parseInt(e.target.value))}
                          className="text-sm border rounded px-2 py-1 w-20"
                          min="50"
                          max="5000"
                          step="50"
                          disabled={readOnly}
                        />
                        <span className="text-xs text-gray-500">ms</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <label className="text-sm text-gray-700 w-32">
                          {t(`${i18nPrefix}.maxLogLines`)}
                        </label>
                        <input
                          type="number"
                          value={inputs.streaming?.max_log_lines || 1000}
                          onChange={(e) => handleStreamingConfigUpdate('max_log_lines', parseInt(e.target.value))}
                          className="text-sm border rounded px-2 py-1 w-20"
                          min="100"
                          max="10000"
                          step="100"
                          disabled={readOnly}
                        />
                        <span className="text-xs text-gray-500">{t('common.lines')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Field>
        
        <Split />
        
        <Field
          title={t(`${i18nPrefix}.inputVars`)}
          operations={
            !readOnly ? (
              <div className="flex gap-2">
                <SyncButton popupContent={t(`${i18nPrefix}.syncFunctionSignature`)} onClick={handleSyncFunctionSignature} />
                <AddButton onClick={handleAddVariable} />
              </div>
            ) : undefined
          }
        >
          <VarList
            readonly={readOnly}
            nodeId={id}
            list={inputs.variables}
            onChange={handleVarListChange}
            filterVar={filterVar}
            isSupportFileVar={false}
          />
        </Field>
        <Split />
        <CodeEditor
          isInNode
          readOnly={readOnly}
          title={
            <TypeSelector
              options={codeLanguages}
              value={inputs.code_language}
              onChange={handleCodeLanguageChange}
            />
          }
          language={inputs.code_language}
          value={inputs.code}
          onChange={handleCodeChange}
          onGenerated={handleGeneratedCode}
          showCodeGenerator={true}
        />
      </div>
      <Split />
      <div className='px-4 pb-2 pt-4'>
        <Field
          title={t(`${i18nPrefix}.outputVars`)}
          operations={
            <AddButton onClick={handleAddOutputVariable} />
          }
          required
        >
          <OutputVarList
            readonly={readOnly}
            outputs={inputs.outputs}
            outputKeyOrders={outputKeyOrders}
            onChange={handleVarsChange}
            onRemove={handleRemoveVariable}
          />
        </Field>
      </div>
      
      {/* Real-time Logs Component */}
      {inputs.streaming?.enabled && (
        <div className="px-4 pb-4">
          <Field
            title="Real-time Logs"
            operations={
              <div className="flex gap-2">

                <Button
                  variant="tertiary"
                  size="small"
                  onClick={() => setIsLogsVisible(!isLogsVisible)}
                >
                  {isLogsVisible ? 'Hide Logs' : 'Show Logs'}
                </Button>
              </div>
            }
          />
          <RealTimeLogs
            isOpen={isLogsVisible}
            onClose={() => setIsLogsVisible(false)}
            logs={logs}
            status={streamingStatus}
            maxLines={inputs.streaming?.max_log_lines || 1000}
            onClear={handleClearLogs}
            onDownload={handleDownloadLogs}
            className="mt-2"
          />
        </div>
      )}
      
      <RemoveEffectVarConfirm
        isShow={isShowRemoveVarConfirm}
        onCancel={hideRemoveVarConfirm}
        onConfirm={onRemoveVarConfirm}
      />
    </div >
  )
}

export default React.memo(Panel)
