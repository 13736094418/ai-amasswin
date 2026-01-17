// src/index.ts - 修复版
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理OPTIONS预检请求
    if (method === 'OPTIONS') {
      return new Response(null, { 
        headers: corsHeaders, 
        status: 204 
      });
    }

    // 根路径
    if (path === '/') {
      return new Response(JSON.stringify({
        success: true,
        message: 'AI.AMASSWIN.COM API 服务运行中',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // 健康检查
    if (path === '/health') {
      return new Response(JSON.stringify({
        success: true,
        status: 'OK',
        service: 'AI.AMASSWIN.COM API',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // AI聊天接口
    if (path === '/api/chat') {
      // 检查请求方法
      if (method !== 'POST') {
        return new Response(JSON.stringify({
          success: false,
          error: '只支持POST请求',
          method: method,
          path: path
        }), {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        // 解析请求体
        let body: any;
        try {
          body = await request.json();
        } catch (parseError) {
          return new Response(JSON.stringify({
            success: false,
            error: '请求体必须是有效的JSON格式'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { message, model = 'deepseek-chat' } = body;
        
        // 验证消息内容
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: '消息内容不能为空'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 检查API密钥
        if (!env.DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY.trim().length === 0) {
          console.error('DeepSeek API密钥未配置');
          return new Response(JSON.stringify({
            success: false,
            error: 'API密钥未配置，请联系管理员',
            code: 'API_KEY_MISSING'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 调用DeepSeek API
        console.log('调用DeepSeek API，模型:', model, '消息长度:', message.length);
        
        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY.trim()}`
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
          })
        });

        // 记录响应状态
        console.log('DeepSeek API响应状态:', deepseekResponse.status);
        
        if (!deepseekResponse.ok) {
          let errorText = '';
          try {
            errorText = await deepseekResponse.text();
          } catch (e) {
            errorText = '无法读取错误响应';
          }
          
          console.error('DeepSeek API错误:', deepseekResponse.status, errorText);
          
          return new Response(JSON.stringify({
            success: false,
            error: `DeepSeek API错误: ${deepseekResponse.status}`,
            details: errorText.substring(0, 200),
            code: 'DEEPSEEK_API_ERROR'
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 解析响应
        let deepseekData;
        try {
          deepseekData = await deepseekResponse.json();
        } catch (jsonError) {
          console.error('解析DeepSeek响应失败:', jsonError);
          return new Response(JSON.stringify({
            success: false,
            error: '解析AI响应失败',
            code: 'RESPONSE_PARSE_ERROR'
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 检查响应格式
        if (!deepseekData.choices || !Array.isArray(deepseekData.choices) || deepseekData.choices.length === 0) {
          console.error('DeepSeek响应格式异常:', deepseekData);
          return new Response(JSON.stringify({
            success: false,
            error: 'AI响应格式异常',
            code: 'INVALID_RESPONSE_FORMAT'
          }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 成功响应
        return new Response(JSON.stringify({
          success: true,
          data: {
            response: deepseekData.choices[0].message.content,
            model: model,
            tokens: deepseekData.usage?.total_tokens || 0,
            timestamp: new Date().toISOString()
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error: any) {
        console.error('处理请求时发生未捕获错误:', error);
        
        return new Response(JSON.stringify({
          success: false,
          error: '服务器内部错误',
          details: error.message || '未知错误',
          code: 'INTERNAL_SERVER_ERROR'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 默认404响应
    return new Response(JSON.stringify({
      success: false,
      error: '未找到该路由',
      path: path,
      method: method
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
