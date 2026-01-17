// src/index.ts
export interface Env {
  DEEPSEEK_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 设置CORS头部
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://ai.amasswin.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // 根路径 - 返回JSON格式
    if (path === '/') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'AI.AMASSWIN.COM API 服务运行中',
          version: '1.0.0',
          endpoints: {
            health: '/health',
            chat: '/api/chat',
            models: '/api/models'
          }
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 健康检查 - 返回JSON格式
    if (path === '/health') {
      return new Response(
        JSON.stringify({
          status: 'OK',
          service: 'AI.AMASSWIN.COM API',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // AI聊天接口
    if (path === '/api/chat' && request.method === 'POST') {
      try {
        const { message, model = 'deepseek-chat' } = await request.json();
        
        if (!message) {
          return new Response(
            JSON.stringify({
              success: false,
              error: '消息内容不能为空',
            }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // 调用DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: '你是一个有帮助的AI助手。请用中文回答用户的问题，回答要详细、准确、友好。'
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 2000,
            temperature: 0.7,
            stream: false
          }),
        });

        if (!response.ok) {
          throw new Error(`DeepSeek API错误: ${response.status}`);
        }

        const data = await response.json();
        
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              response: data.choices[0].message.content,
              model: model,
              tokens: data.usage.total_tokens,
              timestamp: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        console.error('API错误:', error);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: error.message || '处理请求时发生错误',
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
}}: 
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // 返回模型列表
    if (path === '/api/models' && request.method === 'GET') {
      const models = [
        {
          id: 'deepseek-chat',
          name: 'DeepSeek Chat',
          provider: 'deepseek',
          description: '免费中文模型，支持128K上下文',
        },
        {
          id: 'deepseek-coder',
          name: 'DeepSeek Coder',
          provider: 'deepseek',
          description: '专为编程优化的模型',
        },
      ];
      
      return new Response(
        JSON.stringify({
          success: true,
          data: models,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // 未找到的路由
    return new Response(
      JSON.stringify({
        success: false,
        error: '未找到该路由',
        path: path,
      }),
      {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  },
};
