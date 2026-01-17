<template>
  <div class="chat-container">
    <!-- 顶部栏 -->
    <header class="chat-header">
      <div class="logo">🎯 AI.AMASSWIN.COM</div>
      <div class="header-actions">
        <select v-model="selectedModel" class="model-select">
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="deepseek-coder">DeepSeek Coder</option>
        </select>
        <button @click="clearHistory" class="clear-btn">清空对话</button>
      </div>
    </header>

    <!-- 聊天区域 -->
    <div class="chat-area" ref="chatArea">
      <!-- 欢迎消息 -->
      <div v-if="messages.length === 0" class="welcome-message">
        <div class="welcome-icon">🤖</div>
        <h2>欢迎使用 AI.AMASSWIN.COM</h2>
        <p>我是您的AI助手，基于DeepSeek模型，可以为您提供智能对话服务。</p>
        <div class="quick-questions">
          <button v-for="(q, i) in quickQuestions" :key="i" @click="sendQuickQuestion(q)">
            {{ q }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-for="message in messages" :key="message.id" 
           :class="['message', message.role]">
        <div class="message-avatar">
          {{ message.role === 'user' ? '👤' : '🤖' }}
        </div>
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <!-- 加载指示器 -->
      <div v-if="loading" class="typing-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <textarea v-model="inputMessage" 
                @keydown.enter.prevent="handleEnter"
                placeholder="输入您的问题..."
                :disabled="loading"
                rows="1"
                ref="textarea"></textarea>
      <button @click="sendMessage" 
              :disabled="!inputMessage.trim() || loading"
              class="send-btn">
        {{ loading ? '思考中...' : '发送' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatApp',
  data() {
    return {
      messages: [],
      inputMessage: '',
      loading: false,
      selectedModel: 'deepseek-chat',
      quickQuestions: [
        '你好，请介绍一下你自己',
        '如何学习编程？',
        '帮我写一个Python快速排序',
        '解释一下什么是机器学习'
      ],
      apiBaseUrl: 'https://api.ai.amasswin.com'
    }
  },
  mounted() {
    this.loadHistory();
    this.focusTextarea();
  },
  methods: {
    async sendMessage() {
      if (!this.inputMessage.trim() || this.loading) return;
      
      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: this.inputMessage.trim(),
        timestamp: new Date()
      };
      
      this.messages.push(userMessage);
      this.saveHistory();
      
      const prompt = this.inputMessage;
      this.inputMessage = '';
      this.loading = true;
      this.scrollToBottom();
      
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            model: this.selectedModel
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          const aiMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: data.data.response,
            timestamp: new Date()
          };
          this.messages.push(aiMessage);
        } else {
          throw new Error(data.error || '请求失败');
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `抱歉，发生错误：${error.message}`,
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
      } finally {
        this.loading = false;
        this.saveHistory();
        this.scrollToBottom();
        this.focusTextarea();
      }
    },
    
    sendQuickQuestion(question) {
      this.inputMessage = question;
      this.sendMessage();
    },
    
    handleEnter(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    },
    
    clearHistory() {
      this.messages = [];
      localStorage.removeItem('chatHistory');
    },
    
    saveHistory() {
      localStorage.setItem('chatHistory', JSON.stringify(this.messages.slice(-50)));
    },
    
    loadHistory() {
      const saved = localStorage.getItem('chatHistory');
      if (saved) {
        try {
          this.messages = JSON.parse(saved);
        } catch (e) {
          console.error('加载历史记录失败:', e);
        }
      }
    },
    
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.chatArea;
        if (container) container.scrollTop = container.scrollHeight;
      });
    },
    
    focusTextarea() {
      this.$nextTick(() => {
        const textarea = this.$refs.textarea;
        if (textarea) textarea.focus();
      });
    }
  }
}
</script>

<style>
/* 样式代码类似元宝风格 */
.chat-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  background: white;
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e5e5;
}

.logo {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
}

.model-select, .clear-btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #ddd;
  margin-left: 0.5rem;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.welcome-message {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.message {
  display: flex;
  margin-bottom: 1rem;
  max-width: 80%;
}

.message.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin: 0 0.5rem;
}

.user .message-avatar {
  background: #4a6cf7;
  color: white;
}

.assistant .message-avatar {
  background: #10b981;
  color: white;
}

.message-content {
  background: white;
  padding: 0.8rem 1rem;
  border-radius: 1rem;
  max-width: 100%;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.message-text {
  line-height: 1.5;
  word-break: break-word;
}

.input-area {
  background: white;
  padding: 1rem;
  border-top: 1px solid #e5e5e5;
  display: flex;
  gap: 0.5rem;
}

textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 1rem;
  padding: 0.8rem;
  resize: none;
  font-family: inherit;
}

.send-btn {
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 1rem;
  padding: 0 1.5rem;
  cursor: pointer;
}

.typing-indicator {
  display: flex;
  gap: 0.3rem;
  padding: 1rem;
}

.typing-indicator .dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #999;
  animation: typing 1.4s infinite;
}

@keyframes typing {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
</style>
