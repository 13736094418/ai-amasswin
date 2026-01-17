// src/index.ts - 完整修复版
export interface Env {
  DEEPSEEK_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    
    // 设置CORS头部
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理OPTIONS预检请求
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
        status: 204,
      });
    }

    // 1. 根路径
    if (path === '/') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'AI.AMASSWIN.COM API 服务运行中',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 2. 健康检查
    if (path === '/health') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'OK',
          service: 'AI.AMASSWIN.COM API',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. API聊天接口 (必须是POST请求)
    if (path === '/api/chat') {
      if (method !== 'POST') {
        return new Response(
          JSON.stringify({
            success: false,
            error: '只支持POST请求',
            method: method,
            path: path,
          }),
          {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      try {
        // 解析请求体
        const { message, model = 'deepseek-chat' } = await request.json();
        
        if (!message || message.trim() === '') {
          return new Response(
            JSON.stringify({
              success: false,
              error: '消息内容不能为空',
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // 检查API密钥
        if (!env.DEEPSEEK_API_KEY) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'DeepSeek API密钥未配置',
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        // 调用DeepSeek API
        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
                content: '你是一个有帮助的AI助手。请用中文回答用户的问题，回答要详细、准确、友好。',
              },
              {
                role: 'user',
                content: message,
              },
            ],
            max_tokens: 2000,
            temperature: 0.7,
            stream: false,
          }),
        });

        if (!deepseekResponse.ok) {
          const errorText = await deepseekResponse.text();
          console.error('DeepSeek API错误:', deepseekResponse.status, errorText);
          return new Response(
            JSON.stringify({
              success: false,
              error: `DeepSeek API错误: ${deepseekResponse.status}`,
              details: errorText.substring(0, 200),
            }),
            {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        const deepseekData = await deepseekResponse.json();
        
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              response: deepseekData.choices[0].message.content,
              model: model,
              tokens: deepseekData.usage.total_tokens,
              timestamp: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (error) {
        console.error('处理请求时发生错误:', error);
        return new Response(
          JSON.stringify({
            success: false,
            error: '处理请求时发生错误',
            details: error.message,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 4. 获取模型列表
    if (path === '/api/models') {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
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
          ],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 5. 未找到的路由
    return new Response(
      JSON.stringify({
        success: false,
        error: '未找到该路由',
        path: path,
        method: method,
        available_routes: ['/', '/health', '/api/chat', '/api/models'],
      }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  },
};
