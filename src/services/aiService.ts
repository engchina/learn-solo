interface AISettings {
  apiUrl: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

class AIService {
  private settings: AISettings | null = null;

  // 初始化AI服务
  initialize(settings: AISettings) {
    this.settings = settings;
  }

  // 检查AI服务是否可用
  isAvailable(): boolean {
    return !!this.settings && this.settings.enabled && !!this.settings.apiKey && !!this.settings.apiUrl;
  }

  // 获取设置
  getSettings(): AISettings | null {
    return this.settings;
  }

  // 基础API调用方法
  private async callAPI(messages: ChatMessage[], options: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
  } = {}): Promise<AIResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'AI服务未配置或未启用'
      };
    }

    try {
      const response = await fetch(`${this.settings!.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings!.apiKey}`
        },
        body: JSON.stringify({
          model: this.settings!.model,
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 1000,
          stream: options.stream || false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `API请求失败: ${response.status}`
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return {
          success: false,
          error: 'AI响应格式错误'
        };
      }

      return {
        success: true,
        content: content.trim()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败'
      };
    }
  }

  // 文本续写功能
  async continueText(text: string, context?: string): Promise<AIResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的写作助手。请根据用户提供的文本内容，自然地续写下去。保持原文的风格和语调。${context ? `\n\n上下文：${context}` : ''}`
      },
      {
        role: 'user',
        content: `请续写以下文本：\n\n${text}`
      }
    ];

    return this.callAPI(messages, { temperature: 0.8, maxTokens: 500 });
  }

  // 内容优化功能
  async optimizeContent(text: string): Promise<AIResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的文本编辑助手。请帮助用户优化文本内容，改善语法、表达和结构，使其更加清晰、流畅和专业。保持原意不变。'
      },
      {
        role: 'user',
        content: `请优化以下文本：\n\n${text}`
      }
    ];

    return this.callAPI(messages, { temperature: 0.3, maxTokens: 800 });
  }

  // 语法检查功能
  async checkGrammar(text: string): Promise<AIResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的语法检查助手。请检查文本中的语法错误、拼写错误和表达问题，并提供修正建议。如果没有错误，请说明文本语法正确。'
      },
      {
        role: 'user',
        content: `请检查以下文本的语法：\n\n${text}`
      }
    ];

    return this.callAPI(messages, { temperature: 0.2, maxTokens: 600 });
  }

  // 翻译功能
  async translateText(text: string, targetLanguage: string = '英文'): Promise<AIResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的翻译助手。请将用户提供的文本翻译成${targetLanguage}，保持原意和语调。`
      },
      {
        role: 'user',
        content: `请将以下文本翻译成${targetLanguage}：\n\n${text}`
      }
    ];

    return this.callAPI(messages, { temperature: 0.3, maxTokens: 800 });
  }

  // 摘要生成功能
  async generateSummary(text: string, length: 'short' | 'medium' | 'long' = 'medium'): Promise<AIResponse> {
    const lengthMap = {
      short: '简短',
      medium: '中等长度',
      long: '详细'
    };

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的摘要生成助手。请为用户提供的文本生成${lengthMap[length]}的摘要，突出关键信息和要点。`
      },
      {
        role: 'user',
        content: `请为以下文本生成摘要：\n\n${text}`
      }
    ];

    const maxTokens = {
      short: 200,
      medium: 400,
      long: 600
    };

    return this.callAPI(messages, { temperature: 0.3, maxTokens: maxTokens[length] });
  }

  // 标题生成功能
  async generateTitle(text: string): Promise<AIResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一个专业的标题生成助手。请为用户提供的文本内容生成3-5个吸引人且准确的标题选项。'
      },
      {
        role: 'user',
        content: `请为以下文本生成标题：\n\n${text}`
      }
    ];

    return this.callAPI(messages, { temperature: 0.6, maxTokens: 200 });
  }

  // 自定义提示功能
  async customPrompt(text: string, prompt: string): Promise<AIResponse> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: prompt
      },
      {
        role: 'user',
        content: text
      }
    ];

    return this.callAPI(messages, { temperature: 0.7, maxTokens: 800 });
  }

  // 测试连接
  async testConnection(): Promise<AIResponse> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'AI服务未配置或未启用'
      };
    }

    try {
      const response = await fetch(`${this.settings!.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.settings!.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          content: 'AI API连接成功'
        };
      } else {
        return {
          success: false,
          error: 'AI API连接失败，请检查配置'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: '网络连接失败'
      };
    }
  }
}

// 创建单例实例
const aiService = new AIService();

export default aiService;
export type { AISettings, AIResponse };