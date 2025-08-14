import React, { useState, useEffect } from 'react';
import { Button, Tree, Tooltip } from 'antd';
import { 
  FolderOpen, 
  Folder, 
  FileText, 
  File,
  ChevronRight,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

interface FileNode {
  key: string;
  title: string;
  isLeaf?: boolean;
  children?: FileNode[];
  path: string;
  type: 'file' | 'folder';
}

interface FileExplorerProps {
  onFileSelect?: (filePath: string, fileName: string) => void;
  className?: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ 
  onFileSelect, 
  className 
}) => {
  const [treeData, setTreeData] = useState<FileNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 从后端API获取文件系统数据
  const fetchFileTree = async (): Promise<FileNode[]> => {
    try {
      const response = await fetch('/api/files/tree');
      if (response.ok) {
        const result = await response.json();
        return result.success ? result.data : [];
      } else {
        console.error('Failed to fetch file tree:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Error fetching file tree:', error);
      return [];
    }
  };

  useEffect(() => {
    loadFileTree();
  }, []);

  const loadFileTree = async () => {
    setLoading(true);
    try {
      const fileTree = await fetchFileTree();
      setTreeData(fileTree);
      // 默认展开src文件夹
      const srcFolder = fileTree.find(item => item.title === 'src');
      if (srcFolder) {
        setExpandedKeys([srcFolder.key]);
      }
    } catch (error) {
      console.error('Failed to load file tree:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const selectedNode = info.node;
      if (selectedNode.isLeaf && selectedNode.type === 'file') {
        onFileSelect?.(selectedNode.path, selectedNode.title);
      }
    }
  };

  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
  };

  const renderTreeIcon = (props: any) => {
    const { expanded, isLeaf, data } = props;
    
    if (isLeaf) {
      // 根据文件扩展名显示不同图标
      const fileName = data.title;
      if (fileName.endsWith('.md')) {
        return <FileText size={14} className="text-blue-500" />;
      } else if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) {
        return <File size={14} className="text-blue-600" />;
      } else if (fileName.endsWith('.json')) {
        return <File size={14} className="text-yellow-600" />;
      } else {
        return <File size={14} className="text-gray-500" />;
      }
    }
    
    return expanded ? 
      <FolderOpen size={14} className="text-blue-500" /> : 
      <Folder size={14} className="text-blue-500" />;
  };

  const renderSwitcherIcon = (props: any) => {
    const { expanded, isLeaf } = props;
    if (isLeaf) {
      return null;
    }
    return expanded ? 
      <ChevronDown size={12} className="text-gray-400" /> : 
      <ChevronRight size={12} className="text-gray-400" />;
  };

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* 文件浏览器头部 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">File Explorer</h3>
        <Tooltip title="Refresh">
          <Button
            type="text"
            size="small"
            icon={<RefreshCw size={14} />}
            onClick={loadFileTree}
            loading={loading}
            className="hover:bg-gray-200"
          />
        </Tooltip>
      </div>

      {/* 文件树 */}
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="text-xs text-gray-500 p-2 text-center">
            Loading files...
          </div>
        ) : (
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={handleExpand}
            onSelect={handleSelect}
            showIcon
            icon={renderTreeIcon}
            switcherIcon={renderSwitcherIcon}
            className="file-explorer-tree"
            blockNode
          />
        )}
      </div>

      {/* 文件浏览器底部信息 */}
      <div className="p-2 border-t border-gray-200 text-xs text-gray-500">
        {treeData.length > 0 ? (
          <span>{treeData.length} items</span>
        ) : (
          <span>No files</span>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;