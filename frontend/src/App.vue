<template>
  <div class="container">
    <h1>🎯 AI.AMASSWIN.COM - 本地测试</h1>
    
    <div class="input-section">
      <input 
        v-model="prompt" 
        @keyup.enter="sendMessage"
        placeholder="输入您的问题..."
        class="input-field"
      >
      <button @click="sendMessage" :disabled="loading" class="send-btn">
        {{ loading ? '发送中...' : '发送' }}
      </button>
    </div>

    <div v-if="loading" class="loading">AI 思考中...</div>
    
    <div v-if="response" class="response">
      <h3>🤖 AI 响应:</h3>
      <p>{{ response }}</p>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div class="status">
      <p>前端: http://localhost:3000 ✅</p>
      <p>后端: http://localhost:3001 ✅</p>
      <p>API 状态: {{ apiStatus }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      prompt: '',
      response: '',
      loading: false,
      error: '',
      apiStatus: '检查中...'
    }
  },
  mounted() {
    this.checkAPIHealth()
  },
  methods: {
    async checkAPIHealth() {
      try {
        const response = await fetch('http://localhost:3001/health')
        const data = await response.json()
        this.apiStatus = data.status
      } catch (err) {
        this.apiStatus = '连接失败'
      }
    },
    
    async sendMessage() {
      if (!this.prompt.trim() || this.loading) return
      
      this.loading = true
      this.error = ''
      
      try {
        const response = await fetch('/api/ai-process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: this.prompt })
        })
        
        const data = await response.json()
        
        if (data.success) {
          this.response = data.data.response
          this.prompt = ''
        } else {
          this.error = data.error || '请求失败'
        }
      } catch (err) {
        this.error = '网络错误: ' + err.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.input-section {
  margin: 30px 0;
  display: flex;
  gap: 10px;
}

.input-field {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
}

.send-btn {
  padding: 12px 24px;
  background: #007acc;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.loading {
  color: #007acc;
  font-style: italic;
  margin: 20px 0;
}

.response {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 6px;
  margin: 20px 0;
}

.error {
  color: #d32f2f;
  background: #ffebee;
  padding: 15px;
  border-radius: 6px;
  margin: 20px 0;
}

.status {
  margin-top: 30px;
  padding: 15px;
  background: #e8f5e8;
  border-radius: 6px;
  color: #2e7d32;
}
</style>