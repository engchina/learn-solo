import { contextBridge, ipcRenderer } from 'electron';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

// 暴露文件操作API
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件对话框
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  
  // 文件读写
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),
  
  // 菜单事件监听
  onMenuNewFile: (callback: () => void) => {
    ipcRenderer.on('menu-new-file', callback);
  },
  onMenuOpenFile: (callback: () => void) => {
    ipcRenderer.on('menu-open-file', callback);
  },
  onMenuSaveFile: (callback: () => void) => {
    ipcRenderer.on('menu-save-file', callback);
  },
  onMenuSaveAsFile: (callback: () => void) => {
    ipcRenderer.on('menu-save-as-file', callback);
  },
  
  // 移除监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// 类型声明
declare global {
  interface Window {
    ipcRenderer: {
      on: typeof ipcRenderer.on;
      off: typeof ipcRenderer.off;
      send: typeof ipcRenderer.send;
      invoke: typeof ipcRenderer.invoke;
    };
    electronAPI: {
      showSaveDialog: () => Promise<Electron.SaveDialogReturnValue>;
      showOpenDialog: () => Promise<Electron.OpenDialogReturnValue>;
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      onMenuNewFile: (callback: () => void) => void;
      onMenuOpenFile: (callback: () => void) => void;
      onMenuSaveFile: (callback: () => void) => void;
      onMenuSaveAsFile: (callback: () => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}