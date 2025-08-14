import React from 'react';
import { ConfigProvider } from 'antd';
import MarkdownEditor from './components/MarkdownEditor';
import './App.css';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <div className="App">
        <MarkdownEditor />
      </div>
    </ConfigProvider>
  );
}

export default App;
