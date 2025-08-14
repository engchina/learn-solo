import React, { useState, useEffect } from 'react';
import { Modal, Switch, Slider, Select, Button, Divider, Space, Input, message } from 'antd';
import { SettingOutlined, MoonOutlined, SunOutlined, FontSizeOutlined, RobotOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  autoSave: boolean;
  wordWrap: boolean;
  // AI配置
  aiApiUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiEnabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ visible, onClose }) => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineHeight: 1.5,
    autoSave: true,
    wordWrap: true,
    // AI配置默认值
    aiApiUrl: 'https://api.openai.com/v1',
    aiApiKey: '',
    aiModel: 'gpt-4o',
    aiEnabled: false
  });

  // 从localStorage加载设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('markdown-editor-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // 保存设置到localStorage
  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem('markdown-editor-settings', JSON.stringify(newSettings));
    
    // 应用主题设置
    document.documentElement.setAttribute('data-theme', newSettings.theme);
    
    // 触发自定义事件，通知其他组件设置已更改
    window.dispatchEvent(new CustomEvent('settings-changed', { detail: newSettings }));
  };

  const handleThemeChange = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    saveSettings({ ...settings, theme: newTheme });
  };

  const handleFontSizeChange = (value: number) => {
    saveSettings({ ...settings, fontSize: value });
  };

  const handleFontFamilyChange = (value: string) => {
    saveSettings({ ...settings, fontFamily: value });
  };

  const handleLineHeightChange = (value: number) => {
    saveSettings({ ...settings, lineHeight: value });
  };

  const handleAutoSaveChange = (checked: boolean) => {
    saveSettings({ ...settings, autoSave: checked });
  };

  const handleWordWrapChange = (checked: boolean) => {
    saveSettings({ ...settings, wordWrap: checked });
  };

  const resetToDefaults = () => {
    const defaultSettings: Settings = {
      theme: 'light',
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      lineHeight: 1.5,
      autoSave: true,
      wordWrap: true,
      aiApiUrl: 'https://api.openai.com/v1',
      aiApiKey: '',
      aiModel: 'gpt-4o',
      aiEnabled: false
    };
    saveSettings(defaultSettings);
  };

  // AI配置处理函数
  const handleAiEnabledChange = (checked: boolean) => {
    saveSettings({ ...settings, aiEnabled: checked });
  };

  const handleAiApiUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    saveSettings({ ...settings, aiApiUrl: e.target.value });
  };

  const handleAiApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    saveSettings({ ...settings, aiApiKey: e.target.value });
  };

  const handleAiModelChange = (value: string) => {
    saveSettings({ ...settings, aiModel: value });
  };

  const testAiConnection = async () => {
    if (!settings.aiApiKey || !settings.aiApiUrl) {
      message.error('请先配置API URL和API Key');
      return;
    }

    try {
      const response = await fetch(`${settings.aiApiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${settings.aiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        message.success('AI API连接测试成功！');
      } else {
        message.error('AI API连接测试失败，请检查配置');
      }
    } catch (error) {
      message.error('AI API连接测试失败，请检查网络和配置');
    }
  };

  const fontFamilyOptions = [
    { label: 'Monaco (默认)', value: 'Monaco, Menlo, "Ubuntu Mono", monospace' },
    { label: 'Consolas', value: 'Consolas, "Courier New", monospace' },
    { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
    { label: 'Fira Code', value: '"Fira Code", monospace' },
    { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' }
  ];

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          设置
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="reset" onClick={resetToDefaults}>
          重置为默认
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          确定
        </Button>
      ]}
      width={500}
    >
      <div className="space-y-6">
        {/* 主题设置 */}
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            {settings.theme === 'dark' ? <MoonOutlined className="mr-2" /> : <SunOutlined className="mr-2" />}
            主题
          </h3>
          <div className="flex items-center justify-between">
            <span>深色模式</span>
            <Switch
              checked={settings.theme === 'dark'}
              onChange={handleThemeChange}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
          </div>
        </div>

        <Divider />

        {/* 字体设置 */}
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <FontSizeOutlined className="mr-2" />
            字体
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">字体大小: {settings.fontSize}px</label>
              <Slider
                min={10}
                max={24}
                value={settings.fontSize}
                onChange={handleFontSizeChange}
                marks={{
                  10: '10px',
                  14: '14px',
                  18: '18px',
                  24: '24px'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">字体族</label>
              <Select
                value={settings.fontFamily}
                onChange={handleFontFamilyChange}
                options={fontFamilyOptions}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">行高: {settings.lineHeight}</label>
              <Slider
                min={1.0}
                max={2.5}
                step={0.1}
                value={settings.lineHeight}
                onChange={handleLineHeightChange}
                marks={{
                  1.0: '1.0',
                  1.5: '1.5',
                  2.0: '2.0',
                  2.5: '2.5'
                }}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* 编辑器设置 */}
        <div>
          <h3 className="text-lg font-medium mb-3">编辑器</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>自动保存</span>
              <Switch
                checked={settings.autoSave}
                onChange={handleAutoSaveChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <span>自动换行</span>
              <Switch
                checked={settings.wordWrap}
                onChange={handleWordWrapChange}
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* AI助手设置 */}
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center">
            <RobotOutlined className="mr-2" />
            AI助手
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>启用AI助手</span>
              <Switch
                checked={settings.aiEnabled}
                onChange={handleAiEnabledChange}
              />
            </div>

            {settings.aiEnabled && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">API URL</label>
                  <Input
                    value={settings.aiApiUrl}
                    onChange={handleAiApiUrlChange}
                    placeholder="https://api.openai.com/v1"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">API Key</label>
                  <Input.Password
                    value={settings.aiApiKey}
                    onChange={handleAiApiKeyChange}
                    placeholder="请输入您的API Key"
                    className="w-full"
                    iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">模型</label>
                  <Select
                    value={settings.aiModel}
                    onChange={handleAiModelChange}
                    className="w-full"
                    options={[
                      { label: 'GPT-4o', value: 'gpt-4o' }
                    ]}
                  />
                </div>

                <div>
                  <Button 
                    onClick={testAiConnection}
                    className="w-full"
                    type="dashed"
                  >
                    测试连接
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsPanel;