import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

import ts from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import js from "react-syntax-highlighter/dist/esm/languages/prism/javascript"
import json from "react-syntax-highlighter/dist/esm/languages/prism/json"
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash"
import python from "react-syntax-highlighter/dist/esm/languages/prism/python"
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust"

SyntaxHighlighter.registerLanguage("typescript", ts)
SyntaxHighlighter.registerLanguage("ts", ts)
SyntaxHighlighter.registerLanguage("javascript", js)
SyntaxHighlighter.registerLanguage("js", js)
SyntaxHighlighter.registerLanguage("json", json)
SyntaxHighlighter.registerLanguage("bash", bash)
SyntaxHighlighter.registerLanguage("sh", bash)
SyntaxHighlighter.registerLanguage("python", python)
SyntaxHighlighter.registerLanguage("py", python)
SyntaxHighlighter.registerLanguage("rust", rust)
SyntaxHighlighter.registerLanguage("rs", rust)

interface ChatCodeBlockProps {
  language: string
  code: string
}

export function ChatCodeBlock({ language, code }: ChatCodeBlockProps) {
  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      className="rounded-lg text-[0.85rem] !my-3 border border-border/50 !bg-[#1e1e1e]"
    >
      {code}
    </SyntaxHighlighter>
  )
}
