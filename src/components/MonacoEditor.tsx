import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCursorPositionChange?: (line: number, column: number) => void;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  className?: string;
  readOnly?: boolean;
}

export interface MonacoEditorRef {
  formatSelection: (prefix: string, suffix?: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
  undo: () => void;
  redo: () => void;
  scrollToPosition: (scrollTop: number) => void;
  getScrollInfo: () => { scrollTop: number; scrollHeight: number; clientHeight: number };
  getSelection: () => string;
  replaceSelection: (text: string) => void;
}

const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(({ 
  value,
  onChange,
  onCursorPositionChange,
  onScroll,
  className,
  readOnly = false,
}, ref) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // 配置Markdown语言支持
    monaco.languages.register({ id: 'markdown' });

    // 配置Markdown语法高亮
    monaco.languages.setMonarchTokensProvider('markdown', {
      tokenizer: {
        root: [
          // 标题
          [/^#{1,6}\s.*$/, 'markup.heading'],
          
          // 粗体
          [/\*\*([^*]|\*(?!\*))*\*\*/, 'markup.bold'],
          [/__([^_]|_(?!_))*__/, 'markup.bold'],
          
          // 斜体
          [/\*([^*])*\*/, 'markup.italic'],
          [/_([^_])*_/, 'markup.italic'],
          
          // 删除线
          [/~~[^~]*~~/, 'markup.strikethrough'],
          
          // 行内代码
          [/`[^`]*`/, 'markup.inline.raw'],
          
          // 代码块
          [/```[\s\S]*?```/, 'markup.raw'],
          
          // 链接
          [/\[([^\]]+)\]\(([^)]+)\)/, 'markup.underline.link'],
          
          // 图片
          [/!\[([^\]]*)\]\(([^)]+)\)/, 'markup.inserted'],
          
          // 引用
          [/^>.*$/, 'markup.quote'],
          
          // 列表
          [/^\s*[*+-]\s/, 'markup.list'],
          [/^\s*\d+\.\s/, 'markup.list'],
          
          // 分割线
          [/^\s*[-*_]{3,}\s*$/, 'markup.heading'],
          
          // 表格
          [/\|/, 'markup.table'],
        ],
      },
    });

    // 配置编辑器主题
    monaco.editor.defineTheme('markdown-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'markup.heading', foreground: '2563eb', fontStyle: 'bold' },
        { token: 'markup.bold', fontStyle: 'bold' },
        { token: 'markup.italic', fontStyle: 'italic' },
        { token: 'markup.strikethrough', fontStyle: 'strikethrough' },
        { token: 'markup.inline.raw', foreground: 'dc2626', background: 'f3f4f6' },
        { token: 'markup.raw', foreground: 'dc2626', background: 'f9fafb' },
        { token: 'markup.underline.link', foreground: '2563eb', fontStyle: 'underline' },
        { token: 'markup.inserted', foreground: '059669' },
        { token: 'markup.quote', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'markup.list', foreground: '7c3aed' },
        { token: 'markup.table', foreground: '0891b2' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#374151',
        'editor.lineHighlightBackground': '#f9fafb',
        'editor.selectionBackground': '#dbeafe',
        'editorLineNumber.foreground': '#9ca3af',
        'editorLineNumber.activeForeground': '#374151',
      },
    });

    // 应用主题
    monaco.editor.setTheme('markdown-theme');

    // 监听光标位置变化
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorPositionChange) {
        onCursorPositionChange(e.position.lineNumber, e.position.column);
      }
    });

    // 监听滚动事件
    editor.onDidScrollChange((e) => {
      if (onScroll) {
        const scrollTop = e.scrollTop;
        const scrollHeight = e.scrollHeight;
        const clientHeight = editor.getLayoutInfo().height;
        onScroll(scrollTop, scrollHeight, clientHeight);
      }
    });

    // 配置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 1.6,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Monaco, Menlo, 'Ubuntu Mono', monospace",
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      renderWhitespace: 'selection',
      renderLineHighlight: 'line',
      cursorBlinking: 'smooth',
      smoothScrolling: true,
      mouseWheelZoom: true,
      contextmenu: true,
      quickSuggestions: false,
      parameterHints: { enabled: false },
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: 'off',
      tabCompletion: 'off',
      wordBasedSuggestions: 'off',
      occurrencesHighlight: 'off',
      selectionHighlight: false,
      codeLens: false,
      folding: true,
      foldingHighlight: false,
      unfoldOnClickAfterEndOfLine: false,
      showUnused: false,
    });

    // 添加剪贴板图片粘贴功能
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            try {
              // 创建FormData上传图片
              const formData = new FormData();
              formData.append('image', file);
              
              // 上传图片到服务器
              const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
              });
              
              if (response.ok) {
                const result = await response.json();
                const imageUrl = result.url;
                const imageName = file.name || 'image';
                const markdownImage = `![${imageName}](${imageUrl})`;
                
                // 在光标位置插入图片Markdown语法
                const position = editor.getPosition();
                if (position) {
                  editor.executeEdits('paste-image', [{
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: markdownImage
                  }]);
                  
                  // 移动光标到插入文本的末尾
                  const newPosition = new monaco.Position(
                    position.lineNumber,
                    position.column + markdownImage.length
                  );
                  editor.setPosition(newPosition);
                }
              } else {
                console.error('图片上传失败:', response.statusText);
                // 如果上传失败，可以考虑使用base64编码
                const reader = new FileReader();
                reader.onload = (event) => {
                  const base64 = event.target?.result as string;
                  const imageName = file.name || 'image';
                  const markdownImage = `![${imageName}](${base64})`;
                  
                  const position = editor.getPosition();
                  if (position) {
                    editor.executeEdits('paste-image', [{
                      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                      text: markdownImage
                    }]);
                    
                    const newPosition = new monaco.Position(
                      position.lineNumber,
                      position.column + markdownImage.length
                    );
                    editor.setPosition(newPosition);
                  }
                };
                reader.readAsDataURL(file);
              }
            } catch (error) {
              console.error('处理图片粘贴时出错:', error);
              // 降级到base64处理
              const reader = new FileReader();
              reader.onload = (event) => {
                const base64 = event.target?.result as string;
                const imageName = file.name || 'image';
                const markdownImage = `![${imageName}](${base64})`;
                
                const position = editor.getPosition();
                if (position) {
                  editor.executeEdits('paste-image', [{
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                    text: markdownImage
                  }]);
                  
                  const newPosition = new monaco.Position(
                    position.lineNumber,
                    position.column + markdownImage.length
                  );
                  editor.setPosition(newPosition);
                }
              };
              reader.readAsDataURL(file);
            }
          }
          break;
        }
      }
    };

    // 监听粘贴事件
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener('paste', handlePaste);
    }

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // 触发保存事件
      console.log('Save triggered');
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      // 粗体格式化
      const selection = editor.getSelection();
      if (selection) {
        const selectedText = editor.getModel()?.getValueInRange(selection) || '';
        const boldText = `**${selectedText}**`;
        editor.executeEdits('bold', [{
          range: selection,
          text: boldText,
        }]);
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      // 斜体格式化
      const selection = editor.getSelection();
      if (selection) {
        const selectedText = editor.getModel()?.getValueInRange(selection) || '';
        const italicText = `*${selectedText}*`;
        editor.executeEdits('italic', [{
          range: selection,
          text: italicText,
        }]);
      }
    });
  };

  const handleEditorChange: OnChange = (value) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  // 公开编辑器方法
  const insertText = (text: string) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection) {
        editorRef.current.executeEdits('insert', [{
          range: selection,
          text: text,
        }]);
        editorRef.current.focus();
      }
    }
  };

  const formatSelection = (prefix: string, suffix: string = prefix) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection) {
        const selectedText = editorRef.current.getModel()?.getValueInRange(selection) || '';
        const formattedText = `${prefix}${selectedText}${suffix}`;
        editorRef.current.executeEdits('format', [{
          range: selection,
          text: formattedText,
        }]);
        editorRef.current.focus();
      }
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    formatSelection: (prefix: string, suffix: string = prefix) => {
      if (editorRef.current) {
        const editor = editorRef.current;
        const selection = editor.getSelection();
        if (selection) {
          const selectedText = editor.getModel()?.getValueInRange(selection) || '';
          const newText = `${prefix}${selectedText}${suffix}`;
          editor.executeEdits('format', [{
            range: selection,
            text: newText
          }]);
          // 重新选择格式化后的文本
          const newSelection = new monaco.Selection(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.startColumn + newText.length
          );
          editor.setSelection(newSelection);
        }
      }
    },
    insertText: (text: string) => {
      if (editorRef.current) {
        const editor = editorRef.current;
        const position = editor.getPosition();
        if (position) {
          editor.executeEdits('insert', [{
            range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            text: text
          }]);
          // 移动光标到插入文本的末尾
          const lines = text.split('\n');
          const newPosition = new monaco.Position(
            position.lineNumber + lines.length - 1,
            lines.length === 1 ? position.column + text.length : lines[lines.length - 1].length + 1
          );
          editor.setPosition(newPosition);
        }
      }
    },
    focus: () => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    },
    undo: () => {
      if (editorRef.current) {
        editorRef.current.trigger('keyboard', 'undo', null);
      }
    },
    redo: () => {
      if (editorRef.current) {
        editorRef.current.trigger('keyboard', 'redo', null);
      }
    },
    scrollToPosition: (scrollTop: number) => {
      if (editorRef.current) {
        editorRef.current.setScrollTop(scrollTop);
      }
    },
    getScrollInfo: () => {
      if (editorRef.current) {
        const editor = editorRef.current;
        return {
          scrollTop: editor.getScrollTop(),
          scrollHeight: editor.getScrollHeight(),
          clientHeight: editor.getLayoutInfo().height
        };
      }
      return { scrollTop: 0, scrollHeight: 0, clientHeight: 0 };
    },
    getSelection: () => {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection) {
          return editorRef.current.getModel()?.getValueInRange(selection) || '';
        }
      }
      return '';
    },
    replaceSelection: (text: string) => {
      if (editorRef.current) {
        const editor = editorRef.current;
        const selection = editor.getSelection();
        if (selection) {
          editor.executeEdits('replace-selection', [{
            range: selection,
            text: text
          }]);
          // 移动光标到替换文本的末尾
          const lines = text.split('\n');
          const newPosition = new monaco.Position(
            selection.startLineNumber + lines.length - 1,
            lines.length === 1 
              ? selection.startColumn + text.length 
              : lines[lines.length - 1].length + 1
          );
          editor.setPosition(newPosition);
          editor.focus();
        }
      }
    }
  }), []);

  return (
    <div className={className}>
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          automaticLayout: true,
        }}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading Editor...</div>
          </div>
        }
      />
    </div>
  );
});

MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;