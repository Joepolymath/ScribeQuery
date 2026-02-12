import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    if (match) {
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match[1]}
          PreTag="div"
          customStyle={{ borderRadius: '0.5rem', fontSize: '0.8rem', margin: '0.5rem 0' }}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )
    }
    return (
      <code className="bg-gray-700 text-indigo-300 rounded px-1 py-0.5 text-xs font-mono" {...props}>
        {children}
      </code>
    )
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0">{children}</p>
  },
  ul({ children }) {
    return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
  },
  li({ children }) {
    return <li className="ml-2">{children}</li>
  },
  h1({ children }) {
    return <h1 className="text-lg font-bold mb-2">{children}</h1>
  },
  h2({ children }) {
    return <h2 className="text-base font-bold mb-2">{children}</h2>
  },
  h3({ children }) {
    return <h3 className="text-sm font-bold mb-1">{children}</h3>
  },
  blockquote({ children }) {
    return <blockquote className="border-l-2 border-indigo-400 pl-3 text-gray-400 italic my-2">{children}</blockquote>
  },
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatStreamDelta {
  content: string
  done: boolean
  finish_reason?: string
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<(() => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const updateLastMessage = (updater: (prev: string) => string) => {
    setMessages(prev => {
      const updated = [...prev]
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: updater(updated[updated.length - 1].content),
      }
      return updated
    })
  }

  const handleSend = async () => {
    if (!prompt.trim() || isStreaming) return

    const content = prompt.trim()
    setPrompt('')
    setMessages(prev => [
      ...prev,
      { role: 'user', content },
      { role: 'assistant', content: '' },
    ])
    setIsStreaming(true)

    let res: Response
    try {
      res = await fetch('http://localhost:8094/api/chats/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', content }),
      })
    } catch {
      updateLastMessage(() => 'Error: Could not reach the server.')
      setIsStreaming(false)
      return
    }

    if (!res.ok || !res.body) {
      updateLastMessage(() => `Error: ${res.status} ${res.statusText}`)
      setIsStreaming(false)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let streamDone = false

    abortRef.current = () => reader.cancel()

    try {
      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            streamDone = true
            break
          }
          try {
            const delta: ChatStreamDelta = JSON.parse(data)
            if (delta.content) {
              updateLastMessage(prev => prev + delta.content)
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }

  const handleStop = () => {
    abortRef.current?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 border-b border-gray-800 bg-gray-950">
        <h1 className="text-xl font-bold">
          Da<span className="text-indigo-400">Vinci</span>
        </h1>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 mt-24 text-xl select-none">
              Start a conversation with DaVinci
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[75%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-3 items-start">
                <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white mt-0.5">
                  D
                </div>
                <div className="max-w-[75%] bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
                  <ReactMarkdown components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                  {isStreaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            )
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="shrink-0 border-t border-gray-800 bg-gray-950 px-4 py-4">
        <div className="max-w-3xl mx-auto flex flex-col gap-2 bg-gray-900 rounded-xl border border-gray-800 px-4 py-3">
          <textarea
            className="w-full bg-transparent text-sm text-gray-100 placeholder-gray-600 resize-none outline-none min-h-[52px] max-h-40"
            placeholder="Message DaVinci..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />

          <div className="flex items-center justify-between">
            {/* File upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              <span className="truncate max-w-36">{file ? file.name : 'Attach'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />

            <div className="flex items-center gap-2">
              {file && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Remove
                </button>
              )}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Stop generating"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!prompt.trim()}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                  title="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
