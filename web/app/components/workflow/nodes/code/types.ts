import type { CommonNodeType, VarType, Variable } from '@/app/components/workflow/types'

export enum CodeLanguage {
  python3 = 'python3',
  javascript = 'javascript',
  json = 'json',
}

export type OutputVar = Record<string, {
  type: VarType
  children: null // support nest in the future,
}>

// Streaming configuration type
export interface StreamingConfig {
  enabled: boolean
  buffer_timeout: number // milliseconds
  max_log_lines: number
}

// Stream log event type
export interface StreamLogEvent {
  type: 'stdout' | 'stderr' | 'info' | 'error'
  content: string
  timestamp: string
  source?: string
}

// Streaming execution status
export enum StreamingStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export type CodeNodeType = CommonNodeType & {
  variables: Variable[]
  code_language: CodeLanguage
  code: string
  outputs: OutputVar
  // Streaming configuration (optional)
  streaming?: StreamingConfig
}
