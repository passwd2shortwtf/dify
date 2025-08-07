'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RiRefreshLine, RiSettings3Line } from '@remixicon/react'

const ExternalPage = () => {
  const { t } = useTranslation()
  const [markdownContent, setMarkdownContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30) // 30秒

  const fetchMarkdownContent = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // 从public目录读取markdown文件，添加时间戳防止缓存
      const timestamp = new Date().getTime()
      const response = await fetch(`/external-content.md?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const content = await response.text()
      setMarkdownContent(content)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load markdown content:', err)
      setError(err instanceof Error ? err.message : '加载内容失败')
      
      // 如果加载失败，显示默认内容
      const fallbackContent = `# 外部链接

欢迎来到外部链接页面！

## 功能说明

这个页面用于展示各种外部资源和链接。

### 常用链接

- [Dify 官方文档](https://docs.dify.ai)
- [GitHub 仓库](https://github.com/langgenius/dify)
- [社区论坛](https://community.dify.ai)

> **注意**: 无法加载外部内容文件，显示默认内容。

---

*最后更新时间: ${new Date().toLocaleDateString('zh-CN')}*
`
      setMarkdownContent(fallbackContent)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarkdownContent()
  }, [fetchMarkdownContent])

  // 自动刷新功能
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchMarkdownContent()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchMarkdownContent])

  const handleRefresh = () => {
    fetchMarkdownContent()
  }

  const handleLinkClick = (href: string) => {
    // 处理外部链接，在新窗口打开
    if (href.startsWith('http')) {
      window.open(href, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-divider-subtle">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {t('common.menus.external')}
              </h1>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="px-6 py-4">
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">加载中...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-divider-subtle">
          <div className="flex items-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {t('common.menus.external')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="text-xs text-gray-500">
                最后更新: {lastUpdated.toLocaleString('zh-CN')}
              </div>
            )}
            
            {/* 自动刷新设置 */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-3 h-3"
                />
                自动刷新
              </label>
              {autoRefresh && (
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="text-xs border rounded px-1 py-0.5"
                >
                  <option value={10}>10秒</option>
                  <option value={30}>30秒</option>
                  <option value={60}>1分钟</option>
                  <option value={300}>5分钟</option>
                </select>
              )}
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              title="刷新内容"
            >
              <RiRefreshLine className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
                加载失败: {error}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-4">
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children, ...props }) => (
                    <a
                      href={href}
                      onClick={(e) => {
                        if (href?.startsWith('http')) {
                          e.preventDefault()
                          handleLinkClick(href)
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    )
                  },
                  table: ({ children, ...props }) => (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse border border-gray-300" {...props}>
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children, ...props }) => (
                    <th className="border border-gray-300 px-4 py-2 bg-gray-50 font-semibold" {...props}>
                      {children}
                    </th>
                  ),
                  td: ({ children, ...props }) => (
                    <td className="border border-gray-300 px-4 py-2" {...props}>
                      {children}
                    </td>
                  ),
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExternalPage 