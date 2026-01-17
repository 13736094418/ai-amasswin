import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 模拟 AI 处理端点
app.post('/api/ai-process', (req, res) => {
  const { prompt } = req.body;
  
  // 模拟 AI 响应
  const response = {
    success: true,
    data: {
      response: `AI 响应: ${prompt} - 处理完成`,
      tokens: 150,
      timestamp: new Date().toISOString()
    }
  };
  
  // 模拟处理延迟
  setTimeout(() => {
    res.json(response);
  }, 1000);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'AI Backend' });
});

// 获取历史记录
app.get('/api/history', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, prompt: "你好", response: "你好！我是AI助手", timestamp: new Date().toISOString() }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});