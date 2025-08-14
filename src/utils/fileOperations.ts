/**
 * 文件操作工具类
 * 提供新建、打开、保存等基础文件操作功能
 */

export interface FileInfo {
  name: string;
  path?: string;
  content: string;
  lastModified?: Date;
  isModified: boolean;
}

export class FileOperations {
  private static instance: FileOperations;
  private currentFile: FileInfo | null = null;
  private recentFiles: string[] = [];

  static getInstance(): FileOperations {
    if (!FileOperations.instance) {
      FileOperations.instance = new FileOperations();
    }
    return FileOperations.instance;
  }

  /**
   * 创建新文件
   */
  createNewFile(): FileInfo {
    const newFile: FileInfo = {
      name: '未命名文档.md',
      content: '# 新文档\n\n开始编写...',
      isModified: false,
      lastModified: new Date()
    };
    
    this.currentFile = newFile;
    return newFile;
  }

  /**
   * 打开文件
   * 在浏览器环境中使用File API
   */
  async openFile(): Promise<FileInfo | null> {
    try {
      // 创建文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.markdown,.txt';
      
      return new Promise((resolve) => {
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            const content = await this.readFileContent(file);
            const fileInfo: FileInfo = {
              name: file.name,
              path: file.name, // 浏览器环境中无法获取完整路径
              content,
              isModified: false,
              lastModified: new Date(file.lastModified)
            };
            
            this.currentFile = fileInfo;
            this.addToRecentFiles(file.name);
            resolve(fileInfo);
          } else {
            resolve(null);
          }
        };
        
        input.click();
      });
    } catch (error) {
      console.error('打开文件失败:', error);
      return null;
    }
  }

  /**
   * 保存文件
   * 在浏览器环境中使用下载方式保存
   */
  saveFile(content: string, filename?: string): boolean {
    try {
      const fileName = filename || this.currentFile?.name || '未命名文档.md';
      
      // 创建Blob对象
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      
      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 清理URL对象
      URL.revokeObjectURL(url);
      
      // 更新当前文件信息
      if (this.currentFile) {
        this.currentFile.content = content;
        this.currentFile.isModified = false;
        this.currentFile.lastModified = new Date();
        if (filename) {
          this.currentFile.name = filename;
        }
      }
      
      return true;
    } catch (error) {
      console.error('保存文件失败:', error);
      return false;
    }
  }

  /**
   * 另存为
   */
  async saveAsFile(content: string): Promise<boolean> {
    try {
      // 创建一个隐藏的输入元素来获取文件名
      const fileName = prompt('请输入文件名:', this.currentFile?.name || '未命名文档.md');
      
      if (fileName) {
        return this.saveFile(content, fileName);
      }
      
      return false;
    } catch (error) {
      console.error('另存为失败:', error);
      return false;
    }
  }

  /**
   * 读取文件内容
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        resolve(content || '');
      };
      
      reader.onerror = () => {
        reject(new Error('读取文件失败'));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * 添加到最近文件列表
   */
  private addToRecentFiles(filePath: string): void {
    const index = this.recentFiles.indexOf(filePath);
    if (index > -1) {
      this.recentFiles.splice(index, 1);
    }
    
    this.recentFiles.unshift(filePath);
    
    // 限制最近文件数量
    if (this.recentFiles.length > 10) {
      this.recentFiles = this.recentFiles.slice(0, 10);
    }
    
    // 保存到localStorage
    try {
      localStorage.setItem('markdown-editor-recent-files', JSON.stringify(this.recentFiles));
    } catch (error) {
      console.warn('保存最近文件列表失败:', error);
    }
  }

  /**
   * 获取最近文件列表
   */
  getRecentFiles(): string[] {
    try {
      const stored = localStorage.getItem('markdown-editor-recent-files');
      if (stored) {
        this.recentFiles = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('读取最近文件列表失败:', error);
    }
    
    return this.recentFiles;
  }

  /**
   * 获取当前文件信息
   */
  getCurrentFile(): FileInfo | null {
    return this.currentFile;
  }

  /**
   * 设置当前文件
   */
  setCurrentFile(fileInfo: FileInfo): void {
    this.currentFile = fileInfo;
  }

  /**
   * 检查文件是否已修改
   */
  isFileModified(): boolean {
    return this.currentFile?.isModified || false;
  }

  /**
   * 标记文件为已修改
   */
  markFileAsModified(): void {
    if (this.currentFile) {
      this.currentFile.isModified = true;
    }
  }

  /**
   * 标记文件为已保存
   */
  markFileAsSaved(): void {
    if (this.currentFile) {
      this.currentFile.isModified = false;
      this.currentFile.lastModified = new Date();
    }
  }

  /**
   * 导出为不同格式
   */
  exportAs(content: string, format: 'html' | 'pdf' | 'docx', filename?: string): boolean {
    try {
      const fileName = filename || this.currentFile?.name?.replace(/\.md$/, '') || '未命名文档';
      
      switch (format) {
        case 'html':
          return this.exportAsHTML(content, `${fileName}.html`);
        case 'pdf':
          // PDF导出需要额外的库支持
          console.warn('PDF导出功能需要额外实现');
          return false;
        case 'docx':
          // DOCX导出需要额外的库支持
          console.warn('DOCX导出功能需要额外实现');
          return false;
        default:
          return false;
      }
    } catch (error) {
      console.error('导出文件失败:', error);
      return false;
    }
  }

  /**
   * 导出为HTML
   */
  private exportAsHTML(content: string, filename: string): boolean {
    try {
      // 这里应该使用Markdown渲染器将内容转换为HTML
      // 暂时使用简单的HTML模板
      const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${filename}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; }
        code { background-color: #f6f8fa; padding: 2px 4px; border-radius: 3px; }
        pre { background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
        blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; margin-left: 0; }
    </style>
</head>
<body>
    <pre>${content}</pre>
</body>
</html>`;
      
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('导出HTML失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const fileOperations = FileOperations.getInstance();