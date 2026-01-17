// src/index.ts - 修复版
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
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    // 根路径返回JSON
    if (path === '/') {
      return new Response(JSON.stringify({
        success: true,
        message: 'AI.AMASSWIN.COM API 服务运行中',
        version: '1.0.0',
        endpoints: ['/health', '/api/chat', '/api/models']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // 健康检查
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'OK',
        service: 'AI.AMASSWIN.COM API',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // AI聊天接口
    if (path === '/api/chat' && request.method === 'POST') {
      try {
        const { message, model = 'deepseek-chat' } = await request.json();
        
        if (!message) {
          return new Response(JSON.stringify({
            success: false,
            error: '消息内容不能为空'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        // 调用DeepSeek API
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: '你是AI.AMASSWIN.COM的智能助手，请用中文回答用户问题'
              },
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 2000,
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`DeepSeek API错误: ${response.status}`);
        }

        const data = await response.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: {
            response: data.choices[0].message.content,
            model: model,
            tokens: data.usage.total_tokens
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (error: any) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message || '处理请求时发生错误'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // 模型列表
    if (path === '/api/models') {
      return new Response(JSON.stringify({
        success: true,
        data: [
          { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'deepseek' }
        ]
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // 默认响应
    return new Response(JSON.stringify({
      success: false,
      error: '未找到该路由',
      path: path
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 404
    });
  }
};
