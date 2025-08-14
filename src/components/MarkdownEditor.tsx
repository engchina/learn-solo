import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Layout, Button, Tooltip, Divider } from 'antd';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Image,
  List,
  ListOrdered,
  Quote,
  Table,
  Save,
  FolderOpen,
  FileText,
  Eye,
  EyeOff,
  Settings,
  Menu,
  X,
  Heading1,
  Heading2,
  Heading3,
  Minus,
  Code2,
  CheckSquare,
  Undo,
  Redo,
  Sparkles,
  Wand2,
  Languages,
  FileText as SummaryIcon,
  Lightbulb
} from 'lucide-react';
import { cn } from '../lib/utils';
import MonacoEditor, { MonacoEditorRef } from './MonacoEditor';
import MarkdownRenderer, { MarkdownRendererRef } from './MarkdownRenderer';
import FileExplorer from './FileExplorer';
import SettingsPanel from './SettingsPanel';
import { fileOperations, FileInfo } from '../utils/fileOperations';
import aiService from '../services/aiService';

const { Header, Content, Sider } = Layout;

interface MarkdownEditorProps {
  className?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ className }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [currentFile, setCurrentFile] = useState<string>('Untitled.md');
  const [isModified, setIsModified] = useState(false);
  const [content, setContent] = useState<string>('# Welcome to Markdown Editor\n\nStart writing your document...');
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [wordCount, setWordCount] = useState({ words: 0, characters: 0 });
  const [currentFileInfo, setCurrentFileInfo] = useState<FileInfo | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const editorRef = useRef<MonacoEditorRef>(null);
  const rendererRef = useRef<MarkdownRendererRef>(null);
  const [isScrollSyncing, setIsScrollSyncing] = useState(false);
  const [aiServiceInstance, setAiServiceInstance] = useState<typeof aiService | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // 处理内容变化
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsModified(true);
    
    // 标记文件为已修改
    fileOperations.markFileAsModified();
    
    // 计算字数和字符数
    const words = newContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    const characters = newContent.length;
    setWordCount({ words, characters });
  }, []);

  // 处理光标位置变化
  const handleCursorPositionChange = useCallback((line: number, column: number) => {
    setCursorPosition({ line, column });
  }, []);

  // 滚动同步处理函数
  const handleEditorScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (isScrollSyncing || !rendererRef.current) return;
    
    setIsScrollSyncing(true);
    
    // 计算滚动比例
    const scrollRatio = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
    
    // 获取预览面板的滚动信息
    const rendererScrollInfo = rendererRef.current.getScrollInfo();
    const targetScrollTop = scrollRatio * Math.max(0, rendererScrollInfo.scrollHeight - rendererScrollInfo.clientHeight);
    
    // 同步滚动到预览面板
    rendererRef.current.scrollToPosition(targetScrollTop);
    
    // 防抖重置
    setTimeout(() => setIsScrollSyncing(false), 100);
  }, [isScrollSyncing]);

  const handleRendererScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (isScrollSyncing || !editorRef.current) return;
    
    setIsScrollSyncing(true);
    
    // 计算滚动比例
    const scrollRatio = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
    
    // 获取编辑器的滚动信息
    const editorScrollInfo = editorRef.current.getScrollInfo();
    const targetScrollTop = scrollRatio * Math.max(0, editorScrollInfo.scrollHeight - editorScrollInfo.clientHeight);
    
    // 同步滚动到编辑器
    editorRef.current.scrollToPosition(targetScrollTop);
    
    // 防抖重置
    setTimeout(() => setIsScrollSyncing(false), 100);
  }, [isScrollSyncing]);

  // 格式化操作
  const formatText = useCallback((prefix: string, suffix: string = prefix) => {
    if (editorRef.current) {
      editorRef.current.formatSelection(prefix, suffix);
    }
  }, []);

  // 插入文本
  const insertText = useCallback((text: string) => {
    if (editorRef.current) {
      editorRef.current.insertText(text);
    }
  }, []);

  // 插入标题
  const insertHeading = useCallback((level: number) => {
    const prefix = '#'.repeat(level) + ' ';
    insertText('\n' + prefix + 'Heading Text\n');
  }, [insertText]);

  // 插入代码块
  const insertCodeBlock = useCallback(() => {
    insertText('\n```javascript\n// Code content\nconsole.log("Hello World");\n```\n');
  }, [insertText]);

  // 插入任务列表
  const insertTaskList = useCallback(() => {
    insertText('\n- [ ] Todo task\n- [x] Completed task\n');
  }, [insertText]);

  // 插入水平分割线
  const insertHorizontalRule = useCallback(() => {
    insertText('\n---\n');
  }, [insertText]);

  // 初始化AI服务
  useEffect(() => {
    const initAI = async () => {
      try {
        const settings = JSON.parse(localStorage.getItem('markdownEditorSettings') || '{}');
        if (settings.aiEnabled && settings.aiApiUrl && settings.aiApiKey) {
          aiService.initialize({
            apiUrl: settings.aiApiUrl,
            apiKey: settings.aiApiKey,
            model: settings.aiModel || 'gpt-4o',
            enabled: settings.aiEnabled
          });
          setAiServiceInstance(aiService);
        } else {
          setAiServiceInstance(null);
        }
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
      }
    };
    initAI();
  }, []);

  // AI功能处理函数
  const handleAiCompletion = useCallback(async () => {
    if (!aiServiceInstance || !editorRef.current || isAiProcessing) return;
    
    setIsAiProcessing(true);
    try {
      const selection = editorRef.current.getSelection();
      const textToComplete = selection || content.slice(-500); // 使用选中文本或最后500字符
      
      const result = await aiServiceInstance.continueText(textToComplete);
      if (result.success && result.content) {
         editorRef.current.insertText(result.content);
      }
    } catch (error) {
      console.error('AI completion failed:', error);
    } finally {
      setIsAiProcessing(false);
    }
  }, [aiServiceInstance, content, isAiProcessing]);

  const handleAiOptimize = useCallback(async () => {
    if (!aiServiceInstance || !editorRef.current || isAiProcessing) return;
    
    setIsAiProcessing(true);
    try {
      const selection = editorRef.current.getSelection();
      const textToOptimize = selection || content;
      
      const result = await aiServiceInstance.optimizeContent(textToOptimize);
      if (result.success && result.content) {
         if (selection) {
           editorRef.current.replaceSelection(result.content);
         } else {
           setContent(result.content);
        }
      }
    } catch (error) {
      console.error('AI optimization failed:', error);
    } finally {
      setIsAiProcessing(false);
    }
  }, [aiServiceInstance, content, isAiProcessing]);

  const handleAiTranslate = useCallback(async () => {
    if (!aiServiceInstance || !editorRef.current || isAiProcessing) return;
    
    setIsAiProcessing(true);
    try {
      const selection = editorRef.current.getSelection();
      const textToTranslate = selection || content;
      
      const result = await aiServiceInstance.translateText(textToTranslate, 'en'); // 默认翻译为英文
      if (result.success && result.content) {
         if (selection) {
           editorRef.current.replaceSelection(result.content);
         } else {
           setContent(result.content);
        }
      }
    } catch (error) {
      console.error('AI translation failed:', error);
    } finally {
      setIsAiProcessing(false);
    }
  }, [aiServiceInstance, content, isAiProcessing]);

  const handleAiSummarize = useCallback(async () => {
    if (!aiServiceInstance || !editorRef.current || isAiProcessing) return;
    
    setIsAiProcessing(true);
    try {
      const selection = editorRef.current.getSelection();
      const textToSummarize = selection || content;
      
      const result = await aiServiceInstance.generateSummary(textToSummarize);
      if (result.success && result.content) {
         editorRef.current.insertText(`\n\n## Summary\n\n${result.content}\n\n`);
      }
    } catch (error) {
      console.error('AI summarization failed:', error);
    } finally {
      setIsAiProcessing(false);
    }
  }, [aiServiceInstance, content, isAiProcessing]);

  const toolbarButtons = [
    // 撤销重做
    { icon: Undo, tooltip: 'Undo (Ctrl+Z)', action: () => editorRef.current?.undo() },
    { icon: Redo, tooltip: 'Redo (Ctrl+Y)', action: () => editorRef.current?.redo() },
    'divider',
    // 标题
    { icon: Heading1, tooltip: 'Heading 1', action: () => insertHeading(1) },
    { icon: Heading2, tooltip: 'Heading 2', action: () => insertHeading(2) },
    { icon: Heading3, tooltip: 'Heading 3', action: () => insertHeading(3) },
    'divider',
    // 文本格式
    { icon: Bold, tooltip: 'Bold (Ctrl+B)', action: () => formatText('**') },
    { icon: Italic, tooltip: 'Italic (Ctrl+I)', action: () => formatText('*') },
    { icon: Underline, tooltip: 'Underline', action: () => formatText('<u>', '</u>') },
    { icon: Strikethrough, tooltip: 'Strikethrough', action: () => formatText('~~') },
    'divider',
    // 代码
    { icon: Code, tooltip: 'Inline Code', action: () => formatText('`') },
    { icon: Code2, tooltip: 'Code Block', action: insertCodeBlock },
    'divider',
    // 链接和图片
    { icon: Link, tooltip: 'Link', action: () => insertText('[Link Text](URL)') },
    { icon: Image, tooltip: 'Image', action: () => insertText('![Image Description](Image URL)') },
    'divider',
    // 列表
    { icon: List, tooltip: 'Unordered List', action: () => insertText('\n- List Item\n') },
    { icon: ListOrdered, tooltip: 'Ordered List', action: () => insertText('\n1. List Item\n') },
    { icon: CheckSquare, tooltip: 'Task List', action: insertTaskList },
    'divider',
    // 其他
    { icon: Quote, tooltip: 'Quote', action: () => insertText('\n> Quote content\n') },
    { icon: Table, tooltip: 'Table', action: () => insertText('\n| Col1 | Col2 | Col3 |\n|------|------|------|\n| Content | Content | Content |\n') },
    { icon: Minus, tooltip: 'Horizontal Rule', action: insertHorizontalRule },
  ];

  // AI工具按钮
  const aiButtons = [
    { 
      icon: Sparkles, 
      tooltip: 'AI Text Completion', 
      action: handleAiCompletion,
      disabled: !aiServiceInstance || isAiProcessing
    },
    { 
      icon: Wand2, 
      tooltip: 'AI Content Optimization', 
      action: handleAiOptimize,
      disabled: !aiService || isAiProcessing
    },
    { 
      icon: Languages, 
      tooltip: 'AI Translation', 
      action: handleAiTranslate,
      disabled: !aiService || isAiProcessing
    },
    { 
      icon: SummaryIcon, 
      tooltip: 'AI Summary Generation', 
      action: handleAiSummarize,
      disabled: !aiService || isAiProcessing
    },
  ];

  // 文件操作处理函数
  const handleNewFile = useCallback(() => {
    const newFile = fileOperations.createNewFile();
    setContent(newFile.content);
    setCurrentFile(newFile.name);
    setCurrentFileInfo(newFile);
    setIsModified(false);
  }, []);

  const handleOpenFile = useCallback(async () => {
    try {
      const fileInfo = await fileOperations.openFile();
      if (fileInfo) {
        setContent(fileInfo.content);
        setCurrentFile(fileInfo.name);
        setCurrentFileInfo(fileInfo);
        setIsModified(false);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, []);

  const handleSaveFile = useCallback(() => {
    try {
      const success = fileOperations.saveFile(content, currentFileInfo?.name);
      if (success) {
        setIsModified(false);
        fileOperations.markFileAsSaved();
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  }, [content, currentFileInfo]);

  const handleSaveAsFile = useCallback(async () => {
    try {
      const success = await fileOperations.saveAsFile(content);
      if (success) {
        setIsModified(false);
        const updatedFile = fileOperations.getCurrentFile();
        if (updatedFile) {
          setCurrentFile(updatedFile.name);
          setCurrentFileInfo(updatedFile);
        }
      }
    } catch (error) {
      console.error('Failed to save as:', error);
    }
  }, [content]);

  // 处理文件选择
  const handleFileSelect = useCallback(async (filePath: string, fileName: string) => {
    try {
      // 从服务器加载文件内容
      const response = await fetch(`/api/files${filePath}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const { content: fileContent, lastModified } = result.data;
          setContent(fileContent);
          setCurrentFile(fileName);
          setIsModified(false);
          
          // 创建文件信息对象
          const fileInfo: FileInfo = {
            name: fileName,
            path: filePath,
            content: fileContent,
            isModified: false,
            lastModified: new Date(lastModified)
          };
          setCurrentFileInfo(fileInfo);
        } else {
          console.error('Invalid response format:', result);
        }
      } else {
        console.error('Failed to load file:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to load file:', error);
      // 如果是示例文件，提供默认内容
      if (fileName.endsWith('.md')) {
        const defaultContent = `# ${fileName.replace('.md', '')}

This is a sample markdown file.`;
        setContent(defaultContent);
        setCurrentFile(fileName);
        setIsModified(false);
      }
    }
  }, []);

  const fileOperationButtons = [
    { 
      icon: FileText, 
      tooltip: 'New (Ctrl+N)', 
      action: handleNewFile
    },
    { 
      icon: FolderOpen, 
      tooltip: 'Open (Ctrl+O)', 
      action: handleOpenFile
    },
    { 
      icon: Save, 
      tooltip: 'Save (Ctrl+S)', 
      action: handleSaveFile
    },
  ];

  const viewModes = [
    { mode: 'edit' as const, icon: EyeOff, tooltip: 'Edit Mode' },
    { mode: 'split' as const, icon: Eye, tooltip: 'Split Mode' },
    { mode: 'preview' as const, icon: Eye, tooltip: 'Preview Mode' },
  ];

  return (
    <Layout className={cn('h-screen bg-white', className)}>
      {/* 顶部工具栏 */}
      <Header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* 文件操作 */}
          <div className="flex items-center space-x-2">
            {fileOperationButtons.map((op, index) => (
              <Tooltip key={index} title={op.tooltip}>
                <Button
                  type="text"
                  size="small"
                  icon={<op.icon size={16} />}
                  onClick={op.action}
                  className="hover:bg-gray-100"
                />
              </Tooltip>
            ))}
            
            {/* 另存为按钮 */}
            <Tooltip title="Save As">
              <Button
                type="text"
                size="small"
                onClick={handleSaveAsFile}
                className="hover:bg-gray-100 text-xs px-2"
              >
                Save As
              </Button>
            </Tooltip>
          </div>

          <Divider type="vertical" className="h-6" />

          {/* 格式化工具 */}
          <div className="flex items-center space-x-1">
            {toolbarButtons.map((button, index) => {
              if (button === 'divider') {
                return <Divider key={index} type="vertical" className="h-6" />;
              }
              if (typeof button === 'string') {
                return null;
              }
              return (
                <Tooltip key={index} title={button.tooltip}>
                  <Button
                    type="text"
                    size="small"
                    icon={<button.icon size={16} />}
                    onClick={button.action}
                    className="hover:bg-gray-100"
                  />
                </Tooltip>
              );
            })}
          </div>

          {/* AI工具 */}
          {aiServiceInstance && (
            <>
              <Divider type="vertical" className="h-6" />
              <div className="flex items-center space-x-1">
                {aiButtons.map((button, index) => (
                  <Tooltip key={index} title={button.tooltip}>
                    <Button
                      type="text"
                      size="small"
                      icon={<button.icon size={16} />}
                      onClick={button.action}
                      disabled={button.disabled}
                      className={`hover:bg-gray-100 ${button.disabled ? 'opacity-50' : ''}`}
                      loading={isAiProcessing && button.action === handleAiCompletion}
                    />
                  </Tooltip>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* 视图模式切换 */}
          <div className="flex items-center space-x-1">
            {viewModes.map((mode) => (
              <Tooltip key={mode.mode} title={mode.tooltip}>
                <Button
                  type={previewMode === mode.mode ? 'primary' : 'text'}
                  size="small"
                  icon={<mode.icon size={16} />}
                  onClick={() => setPreviewMode(mode.mode)}
                  className={previewMode !== mode.mode ? 'hover:bg-gray-100' : ''}
                />
              </Tooltip>
            ))}
          </div>

          <Divider type="vertical" className="h-6" />

          {/* 设置 */}
          <Tooltip title="Settings">
            <Button
              type="text"
              size="small"
              icon={<Settings size={16} />}
              onClick={() => setSettingsVisible(true)}
              className="hover:bg-gray-100"
            />
          </Tooltip>
        </div>
      </Header>

      <Layout>
        {/* 侧边栏 */}
        <Sider
          width={250}
          collapsed={sidebarCollapsed}
          collapsedWidth={0}
          trigger={null}
          className="bg-gray-50 border-r border-gray-200"
        >
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">File Explorer</h3>
              <Button
                type="text"
                size="small"
                icon={<X size={14} />}
                onClick={() => setSidebarCollapsed(true)}
                className="hover:bg-gray-200"
              />
            </div>
            <div className="flex-1">
              <FileExplorer
                onFileSelect={handleFileSelect}
                className="h-full"
              />
            </div>
          </div>
        </Sider>

        {/* 主编辑区域 */}
        <Layout>
          <Content className="flex flex-col">
            {/* 文件标签栏 */}
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {!sidebarCollapsed && (
                  <Button
                    type="text"
                    size="small"
                    icon={<Menu size={16} />}
                    onClick={() => setSidebarCollapsed(false)}
                    className="hover:bg-gray-200"
                  />
                )}
                {sidebarCollapsed && (
                  <Button
                    type="text"
                    size="small"
                    icon={<Menu size={16} />}
                    onClick={() => setSidebarCollapsed(false)}
                    className="hover:bg-gray-200"
                  />
                )}
                <span className="text-sm text-gray-700">
                  {currentFile}
                  {isModified && <span className="text-orange-500 ml-1">●</span>}
                </span>
              </div>
            </div>

            {/* 编辑器内容区域 */}
            <div className="flex-1 flex">
              {/* 编辑器面板 */}
              {(previewMode === 'edit' || previewMode === 'split') && (
                <div className={cn(
                  'bg-white border-r border-gray-200 flex flex-col overflow-hidden',
                  previewMode === 'split' ? 'w-1/2' : 'w-full'
                )}>
                  <div className="flex-1 overflow-hidden">
                    <MonacoEditor
                      ref={editorRef}
                      value={content}
                      onChange={handleContentChange}
                      onCursorPositionChange={handleCursorPositionChange}
                      onScroll={handleEditorScroll}
                      className="h-full"
                    />
                  </div>
                </div>
              )}

              {/* 预览面板 */}
              {(previewMode === 'preview' || previewMode === 'split') && (
                <div className={cn(
                  'bg-white flex flex-col overflow-hidden',
                  previewMode === 'split' ? 'w-1/2' : 'w-full'
                )}>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-6" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    <MarkdownRenderer 
                      ref={rendererRef}
                      content={content}
                      onScroll={handleRendererScroll}
                      className="max-w-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </Content>

          {/* 状态栏 */}
          <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Line {cursorPosition.line}, Col {cursorPosition.column}</span>
              <span>UTF-8</span>
              <span>Markdown</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Words: {wordCount.words}</span>
          <span>Characters: {wordCount.characters}</span>
              <span className={isModified ? 'text-orange-600' : 'text-green-600'}>
                {isModified ? 'Modified' : 'Saved'}
              </span>
            </div>
          </div>
        </Layout>
      </Layout>
      
      {/* Settings Panel */}
      <SettingsPanel
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </Layout>
  );
};

export default MarkdownEditor;