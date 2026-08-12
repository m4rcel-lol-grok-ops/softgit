/** Lightweight safe-ish Markdown renderer for profile READMEs and descriptions. */
export function Markdown({ content }: { content: string }) {
  const html = renderMarkdown(content)
  return (
    <div
      className="markdown-body text-sm leading-relaxed prose-softgit"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inCode = false
  let codeLang = ''
  let codeBuf: string[] = []
  let inList = false

  const flushList = () => {
    if (inList) {
      out.push('</ul>')
      inList = false
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (!inCode) {
        flushList()
        inCode = true
        codeLang = line.slice(3).trim()
        codeBuf = []
      } else {
        out.push(
          `<pre class="md-code"><code class="language-${escapeHtml(codeLang)}">${escapeHtml(codeBuf.join('\n'))}</code></pre>`
        )
        inCode = false
        codeLang = ''
        codeBuf = []
      }
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      continue
    }

    if (/^#{1,6}\s/.test(line)) {
      flushList()
      const level = line.match(/^(#{1,6})/)![1].length
      const text = inline(line.replace(/^#{1,6}\s+/, ''))
      out.push(`<h${level} class="md-h">${text}</h${level}>`)
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      if (!inList) {
        out.push('<ul class="md-ul">')
        inList = true
      }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }

    if (line.trim() === '') {
      flushList()
      out.push('')
      continue
    }

    flushList()
    out.push(`<p class="md-p">${inline(line)}</p>`)
  }
  if (inCode) {
    out.push(`<pre class="md-code"><code>${escapeHtml(codeBuf.join('\n'))}</code></pre>`)
  }
  flushList()
  return out.join('\n')
}

function inline(s: string): string {
  let t = escapeHtml(s)
  t = t.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )
  return t
}
