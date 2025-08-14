import React, { useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
}

export interface MarkdownRendererRef {
  scrollToPosition: (scrollTop: number) => void;
  getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
}

export const MarkdownRenderer = forwardRef<MarkdownRendererRef, MarkdownRendererProps>(({ 
  content,
  className = '',
  onScroll,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const htmlContent = useMemo(() => {
    try {
      const processor = unified()
        .use(remarkParse) // 解析Markdown
        .use(remarkGfm) // GitHub Flavored Markdown支持
        .use(remarkMath) // 数学公式支持
        .use(remarkRehype, { allowDangerousHtml: true }) // 转换为HTML
        .use(rehypeKatex) // 渲染数学公式
        .use(rehypeStringify, { allowDangerousHtml: true }); // 输出HTML字符串

      const result = processor.processSync(content);
      return String(result);
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return '<div class="error">渲染错误</div>';
    }
  }, [content]);

  // 滚动事件处理
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (onScroll && containerRef.current) {
      const target = e.target as HTMLDivElement;
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;
      onScroll(scrollTop, scrollHeight, clientHeight);
    }
  };

  // 暴露滚动控制方法
  useImperativeHandle(ref, () => ({
    scrollToPosition: (scrollTop: number) => {
      if (containerRef.current) {
        containerRef.current.scrollTop = scrollTop;
      }
    },
    getScrollInfo: () => {
      if (containerRef.current) {
        const container = containerRef.current;
        return {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight
        };
      }
      return { scrollTop: 0, scrollHeight: 0, clientHeight: 0 };
    }
  }), []);

  return (
    <div 
      ref={containerRef}
      className={`markdown-renderer prose prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
      onScroll={handleScroll}
      style={{
        // 自定义样式
        '--tw-prose-body': '#374151',
        '--tw-prose-headings': '#111827',
        '--tw-prose-lead': '#4b5563',
        '--tw-prose-links': '#2563eb',
        '--tw-prose-bold': '#111827',
        '--tw-prose-counters': '#6b7280',
        '--tw-prose-bullets': '#d1d5db',
        '--tw-prose-hr': '#e5e7eb',
        '--tw-prose-quotes': '#111827',
        '--tw-prose-quote-borders': '#e5e7eb',
        '--tw-prose-captions': '#6b7280',
        '--tw-prose-code': '#111827',
        '--tw-prose-pre-code': '#e5e7eb',
        '--tw-prose-pre-bg': '#1f2937',
        '--tw-prose-th-borders': '#d1d5db',
        '--tw-prose-td-borders': '#e5e7eb',
        overflow: 'auto',
        height: '100%'
      } as React.CSSProperties}
    />
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;

// 添加自定义CSS样式
const customStyles = `
.markdown-renderer {
  line-height: 1.7;
  font-size: 16px;
}

.markdown-renderer h1,
.markdown-renderer h2,
.markdown-renderer h3,
.markdown-renderer h4,
.markdown-renderer h5,
.markdown-renderer h6 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-renderer h1 {
  font-size: 2.25rem;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.markdown-renderer h2 {
  font-size: 1.875rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.25rem;
}

.markdown-renderer h3 {
  font-size: 1.5rem;
}

.markdown-renderer h4 {
  font-size: 1.25rem;
}

.markdown-renderer h5 {
  font-size: 1.125rem;
}

.markdown-renderer h6 {
  font-size: 1rem;
  color: #6b7280;
}

.markdown-renderer p {
  margin-bottom: 1rem;
}

.markdown-renderer blockquote {
  border-left: 4px solid #e5e7eb;
  padding-left: 1rem;
  margin: 1.5rem 0;
  color: #6b7280;
  font-style: italic;
}

.markdown-renderer ul,
.markdown-renderer ol {
  margin: 1rem 0;
  padding-left: 2rem;
  list-style-position: outside;
}

.markdown-renderer ul {
  list-style-type: disc;
}

.markdown-renderer ol {
  list-style-type: decimal;
}

.markdown-renderer ul ul {
  list-style-type: circle;
}

.markdown-renderer ul ul ul {
  list-style-type: square;
}

.markdown-renderer ol ol {
  list-style-type: lower-alpha;
}

.markdown-renderer ol ol ol {
  list-style-type: lower-roman;
}

.markdown-renderer li {
  margin: 0.5rem 0;
  display: list-item;
}

.markdown-renderer code {
  background-color: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Monaco, Menlo, 'Ubuntu Mono', monospace;
}

.markdown-renderer pre {
  background-color: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1.5rem 0;
}

.markdown-renderer pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.markdown-renderer table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
}

.markdown-renderer th,
.markdown-renderer td {
  border: 1px solid #e5e7eb;
  padding: 0.75rem;
  text-align: left;
}

.markdown-renderer th {
  background-color: #f9fafb;
  font-weight: 600;
}

.markdown-renderer tr:nth-child(even) {
  background-color: #f9fafb;
}

.markdown-renderer a {
  color: #2563eb;
  text-decoration: underline;
}

.markdown-renderer a:hover {
  color: #1d4ed8;
}

.markdown-renderer img {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

.markdown-renderer hr {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: 2rem 0;
}

.markdown-renderer .katex {
  font-size: 1.1em;
}

.markdown-renderer .katex-display {
  margin: 1.5rem 0;
}

.markdown-renderer .error {
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

/* 代码高亮样式增强 */
.markdown-renderer .code-highlight {
  position: relative;
}

.markdown-renderer .line-numbers {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3rem;
  background-color: #374151;
  color: #9ca3af;
  padding: 1rem 0.5rem;
  font-size: 0.75rem;
  line-height: 1.5;
  text-align: right;
  user-select: none;
}

.markdown-renderer .code-content {
  padding-left: 4rem;
}

/* 任务列表样式 */
.markdown-renderer input[type="checkbox"] {
  margin-right: 0.5rem;
}

.markdown-renderer .task-list-item {
  list-style: none !important;
  margin-left: -2rem;
  padding-left: 2rem;
}

.markdown-renderer .task-list-item input[type="checkbox"] {
  margin-right: 0.5rem;
  margin-left: 0;
}

/* 脚注样式 */
.markdown-renderer .footnote-ref {
  font-size: 0.75rem;
  vertical-align: super;
}

.markdown-renderer .footnotes {
  border-top: 1px solid #e5e7eb;
  margin-top: 2rem;
  padding-top: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}
`;

// 将样式注入到页面中
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = customStyles;
  document.head.appendChild(styleElement);
}