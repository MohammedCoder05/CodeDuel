import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/editor'
import 'monaco-editor/languages/definitions/javascript/register'
import 'monaco-editor/language/typescript/monaco.contribution'
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker'
import TypeScriptWorker from 'monaco-editor/language/typescript/ts.worker.js?worker'

// Bundle the editor and workers locally instead of loading code from a CDN.
self.MonacoEnvironment = {
  getWorker(_, label) {
    return label === 'typescript' || label === 'javascript'
      ? new TypeScriptWorker()
      : new EditorWorker()
  },
}
loader.config({ monaco })

function defineTheme(editor) {
  editor.editor.defineTheme('codeduel', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '747E92' },
      { token: 'keyword', foreground: '00D3DE' },
      { token: 'number', foreground: 'B9EE36' },
    ],
    colors: {
      'editor.background': '#05080F',
      'editor.foreground': '#E4E8F0',
      'editorLineNumber.foreground': '#637087',
      'editorCursor.foreground': '#B9EE36',
      'editor.lineHighlightBackground': '#0D1420',
    },
  })
}

export default function CodeEditor({ code, onChange, readOnly }) {
  return <Editor
    height="100%"
    language="javascript"
    theme="codeduel"
    beforeMount={defineTheme}
    value={code}
    onChange={value => onChange(value ?? '')}
    loading={<span className="font-mono text-xs text-slate-400">Loading editor…</span>}
    options={{
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineHeight: 24,
      fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
      padding: { top: 16, bottom: 16 },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 2,
      ariaLabel: 'JavaScript solution editor',
    }}
  />
}
