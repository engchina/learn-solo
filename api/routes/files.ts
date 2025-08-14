import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '../..');

interface FileNode {
  key: string;
  title: string;
  isLeaf?: boolean;
  children?: FileNode[];
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string;
}

// 获取文件树结构
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const rootPath = req.query.path as string || '/';
    const absolutePath = path.join(PROJECT_ROOT, rootPath);
    
    // 安全检查：确保路径在项目根目录内
    if (!absolutePath.startsWith(PROJECT_ROOT)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Path outside project root'
      });
    }

    const fileTree = await buildFileTree(absolutePath, rootPath);
    
    res.json({
      success: true,
      data: fileTree
    });
  } catch (error) {
    console.error('Error getting file tree:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file tree'
    });
  }
});

// 获取文件内容
router.get('/*', async (req: Request, res: Response) => {
  try {
    const filePath = req.params[0];
    const absolutePath = path.join(PROJECT_ROOT, filePath);
    
    // 安全检查：确保路径在项目根目录内
    if (!absolutePath.startsWith(PROJECT_ROOT)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Path outside project root'
      });
    }

    // 检查文件是否存在
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }

    // 读取文件内容
    const content = await fs.readFile(absolutePath, 'utf-8');
    
    res.json({
      success: true,
      data: {
        content,
        path: filePath,
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      }
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read file'
    });
  }
});

// 构建文件树的辅助函数
async function buildFileTree(absolutePath: string, relativePath: string): Promise<FileNode[]> {
  const items: FileNode[] = [];
  
  try {
    const entries = await fs.readdir(absolutePath, { withFileTypes: true });
    
    // 过滤掉不需要显示的文件和文件夹
    const filteredEntries = entries.filter(entry => {
      const name = entry.name;
      // 跳过隐藏文件、node_modules、dist等
      if (name.startsWith('.') && name !== '.gitignore' && name !== '.env.example') {
        return false;
      }
      if (['node_modules', 'dist', 'dist-electron', 'build', 'release'].includes(name)) {
        return false;
      }
      return true;
    });

    for (const entry of filteredEntries) {
      const itemPath = path.join(absolutePath, entry.name);
      const itemRelativePath = path.posix.join(relativePath, entry.name);
      const stats = await fs.stat(itemPath);
      
      if (entry.isDirectory()) {
        // 对于文件夹，递归获取子项（限制深度避免性能问题）
        const depth = relativePath.split('/').length;
        let children: FileNode[] = [];
        
        if (depth < 3) { // 限制递归深度
          children = await buildFileTree(itemPath, itemRelativePath);
        }
        
        items.push({
          key: itemRelativePath,
          title: entry.name,
          path: itemRelativePath,
          type: 'folder',
          children: children.length > 0 ? children : undefined,
          lastModified: stats.mtime.toISOString()
        });
      } else {
        // 文件
        items.push({
          key: itemRelativePath,
          title: entry.name,
          path: itemRelativePath,
          type: 'file',
          isLeaf: true,
          size: stats.size,
          lastModified: stats.mtime.toISOString()
        });
      }
    }
    
    // 排序：文件夹在前，然后按名称排序
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.title.localeCompare(b.title);
    });
    
  } catch (error) {
    console.error('Error building file tree:', error);
  }
  
  return items;
}

export default router;