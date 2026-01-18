<template>
  <div class="app-container">
    <!-- 左侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo">🎯 AI.AMASSWIN.COM</div>
        <button @click="sidebarCollapsed = !sidebarCollapsed" class="toggle-btn">
          {{ sidebarCollapsed ? '▶' : '◀' }}
        </button>
      </div>

      <div v-if="!sidebarCollapsed" class="sidebar-content">
        <!-- 搜索框 -->
        <div class="search-box">
          <input v-model="searchQuery" type="text" placeholder="搜索" class="search-input" />
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <button class="action-item" @click="scrollToTop">
            <span>元宝</span>
          </button>
          <button class="action-item" @click="showFavorites = !showFavorites">
            <span>全部收藏</span>
          </button>
        </div>

        <!-- 选项分组 -->
        <div class="section">
          <div class="section-header">
            <span>选项</span>
            <button class="add-btn">+</button>
          </div>
          <div class="option-list">
            <button 
              v-for="option in analysisOptions" 
              :key="option.id"
              :class="['option-item', { active: selectedOption === option.id }]"
              @click="selectOption(option)"
            >
              <span>{{ option.name }}</span>
            </button>
          </div>
        </div>

        <!-- 历史记录 -->
        <div class="section">
          <div class="section-header">
            <span>聊天</span>
          </div>
          <div class="history-list">
            <button
              v-for="history in filteredHistory"
              :key="history.id"
              :class="['history-item', { active: currentChatId === history.id }]"
              @click="loadChat(history.id)"
            >
              <span>{{ history.title || formatHistoryTitle(history) }}</span>
              <button @click.stop="deleteHistory(history.id)" class="delete-btn">×</button>
            </button>
          </div>
        </div>

        <!-- 下载链接 -->
        <div class="section">
          <div class="section-header">
            <span>下载</span>
          </div>
          <div class="download-list">
            <button 
              v-for="download in downloads" 
              :key="download.id"
              class="download-item"
              @click="downloadFile(download)"
            >
              <span>{{ download.name }}</span>
              <span class="download-type">{{ download.type }}</span>
            </button>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="preview-section">
          <div class="section-header">预览</div>
          <div class="preview-actions">
            <button @click="exportToPDF" class="preview-btn">📄 PDF</button>
            <button @click="exportToExcel" class="preview-btn">📊 Excel</button>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 顶部栏 -->
      <header class="top-header">
        <div class="header-left">
          <select v-model="selectedModel" class="model-select">
            <option value="deepseek-chat">DeepSeek Chat</option>
            <option value="deepseek-coder">DeepSeek Coder</option>
          </select>
          <button @click="clearHistory" class="clear-btn">清空对话</button>
        </div>
        <div class="header-right">
          <button @click="showAnalysisTools = !showAnalysisTools" class="tool-btn">
            {{ showAnalysisTools ? '隐藏工具' : '分析工具' }}
          </button>
        </div>
      </header>

      <!-- 聊天区域 -->
      <div class="chat-area" ref="chatArea">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="welcome-message">
          <div class="welcome-icon">🤖</div>
          <h2>欢迎使用 AI.AMASSWIN.COM</h2>
          <p>我是您的AI助手，可以为您提供专业的分析和咨询服务。</p>
          <div class="quick-questions">
            <button v-for="(q, i) in quickQuestions" :key="i" @click="sendQuickQuestion(q)">
              {{ q }}
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="message in messages" :key="message.id" :class="['message', message.role]">
          <div class="message-avatar">
            {{ message.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div class="message-text" v-html="renderMarkdown(message.content)"></div>
            <!-- 图表容器 -->
            <div v-if="message.charts && message.charts.length" class="charts-container">
              <div 
                v-for="(chart, idx) in message.charts" 
                :key="'chart-' + message.id + '-' + idx"
                :ref="el => { if (el) setChartRef(el, message.id, idx) }"
                class="chart-wrapper"
              ></div>
            </div>
            <!-- Mermaid图表 -->
            <div v-if="message.mermaid" class="mermaid-container">
              <div class="mermaid" :id="'mermaid-' + message.id"></div>
            </div>
            <!-- 表格 -->
            <div v-if="message.tables && message.tables.length" class="tables-container">
              <table v-for="(table, idx) in message.tables" :key="idx" class="data-table">
                <thead>
                  <tr>
                    <th v-for="(header, hIdx) in table.headers" :key="hIdx">{{ header }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rIdx) in table.rows" :key="rIdx">
                    <td v-for="(cell, cIdx) in row" :key="cIdx">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
            <div class="message-actions">
              <button @click="copyMessage(message.content)" class="action-icon" title="复制">📋</button>
              <button @click="regenerateMessage(message.id)" class="action-icon" title="重新生成">🔄</button>
            </div>
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
        <div v-if="showAnalysisTools" class="analysis-tools">
          <button 
            v-for="tool in analysisTools" 
            :key="tool.id"
            @click="insertAnalysisTool(tool)"
            class="tool-tag"
          >
            {{ tool.name }}
          </button>
        </div>
        <div class="input-wrapper">
          <textarea
            v-model="inputMessage"
            @keydown.enter.prevent="handleEnter"
            placeholder="输入您的问题..."
            :disabled="loading"
            rows="1"
            ref="textarea"
            class="message-input"
          ></textarea>
          <div class="input-actions">
            <button @click="sendMessage" :disabled="!inputMessage.trim() || loading" class="send-btn">
              {{ loading ? '思考中...' : '发送' }}
            </button>
          </div>
        </div>
        <div class="footer-actions">
          <button class="footer-btn">深度思考</button>
          <button class="footer-btn">联网搜索</button>
          <button class="footer-btn">工具</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import hljs from 'highlight.js'
import * as echarts from 'echarts'
import mermaid from 'mermaid'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

export default {
  name: 'ChatApp',
  data() {
    return {
      messages: [],
      inputMessage: '',
      loading: false,
      selectedModel: 'deepseek-chat',
      sidebarCollapsed: false,
      searchQuery: '',
      showFavorites: false,
      showAnalysisTools: false,
      currentChatId: null,
      selectedOption: null,
      apiBaseUrl: 'https://api.ai.amasswin.com',
      chartInstances: new Map(),
      quickQuestions: [
        '市场调研分析',
        'SWOT分析',
        '对偶理论分析',
        '敏感性分析'
      ],
      analysisOptions: [
        { id: 'market-research', name: '市场调研' },
        { id: 'marketing-plan', name: '营销方案' },
        { id: 'policy-analysis', name: '政策分析' },
        { id: 'listing-finance', name: '上市金融' },
        { id: 'competitor-analysis', name: '市场竞品' },
        { id: 'product-planning', name: '产品规划' },
        { id: 'structure-design', name: '结构设计' },
        { id: 'electrical-design', name: '电气设计' },
        { id: 'electronic-design', name: '电子设计' },
        { id: 'software-design', name: '软件设计' },
        { id: 'engineering-design', name: '工程设计' }
      ],
      analysisTools: [
        { id: 'swot', name: 'SWOT分析' },
        { id: 'duality', name: '对偶理论' },
        { id: 'sensitivity', name: '敏感性分析' },
        { id: 'queuing', name: '排队论' },
        { id: 'storage', name: '存储论' },
        { id: 'game', name: '对策论' },
        { id: 'decision', name: '决策分析' }
      ],
      historyList: [],
      downloads: []
    }
  },
  computed: {
    filteredHistory() {
      if (!this.searchQuery) return this.historyList
      return this.historyList.filter(h => 
        h.title?.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
    }
  },
  mounted() {
    this.initMarked()
    this.initMermaid()
    this.loadHistory()
    this.focusTextarea()
  },
  beforeUnmount() {
    // 清理图表实例
    this.chartInstances.forEach(chart => chart.dispose())
    this.chartInstances.clear()
  },
  methods: {
    initMarked() {
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value
            } catch (err) {}
          }
          return hljs.highlightAuto(code).value
        },
        breaks: true,
        gfm: true
      })
    },
    initMermaid() {
      mermaid.initialize({ 
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose'
      })
    },
    renderMarkdown(content) {
      if (!content) return ''
      const html = marked.parse(content)
      this.$nextTick(() => {
        this.parseAndRenderCharts(content)
        this.parseMermaid(content)
      })
      return html
    },
    parseAndRenderCharts(html) {
      // 解析图表指令并渲染
      // 这里可以根据AI返回的特殊标记来渲染图表
    },
    parseMermaid(content) {
      // 解析Mermaid代码块
      if (!content) return
      const mermaidRegex = /```mermaid\n([\s\S]*?)```/g
      let match
      while ((match = mermaidRegex.exec(content)) !== null) {
        const id = 'mermaid-' + Date.now() + '-' + Math.random()
        this.$nextTick(() => {
          const element = document.getElementById(id)
          if (element) {
            mermaid.render(id, match[1]).then(result => {
              if (element) {
                element.innerHTML = result.svg
              }
            }).catch(err => {
              console.error('Mermaid渲染失败:', err)
            })
          }
        })
      }
    },
    setChartRef(el, messageId, chartIdx) {
      if (el && !this.chartInstances.has(`${messageId}-${chartIdx}`)) {
        // 初始化图表 - 这里可以从消息中获取图表配置
        const message = this.messages.find(m => m.id === messageId)
        if (message && message.charts && message.charts[chartIdx]) {
          const chart = echarts.init(el)
          chart.setOption(message.charts[chartIdx])
          this.chartInstances.set(`${messageId}-${chartIdx}`, chart)
        }
      }
    },
    async sendMessage() {
      if (!this.inputMessage.trim() || this.loading) return

      const userMessage = {
        id: Date.now(),
        role: 'user',
        content: this.inputMessage.trim(),
        timestamp: new Date()
      }

      this.messages.push(userMessage)
      this.saveHistory()

      const prompt = this.inputMessage
      this.inputMessage = ''
      this.loading = true
      this.scrollToBottom()

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            model: this.selectedModel
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          const aiMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: data.data.response,
            timestamp: new Date(),
            charts: this.extractCharts(data.data.response),
            tables: this.extractTables(data.data.response),
            mermaid: this.extractMermaid(data.data.response)
          }
          this.messages.push(aiMessage)
          this.$nextTick(() => {
            this.renderChartsForMessage(aiMessage)
          })
        } else {
          throw new Error(data.error || '请求失败')
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: `抱歉，发生错误：${error.message}`,
          timestamp: new Date()
        }
        this.messages.push(errorMessage)
      } finally {
        this.loading = false
        this.saveHistory()
        this.scrollToBottom()
        this.focusTextarea()
      }
    },
    extractCharts(content) {
      // 从内容中提取图表数据
      // 这里可以解析特殊格式的图表指令
      return []
    },
    extractTables(content) {
      // 从Markdown中提取表格
      const tableRegex = /\|(.+)\|\n\|[-:|\s]+\|\n((?:\|.+\|\n?)+)/g
      const tables = []
      let match
      while ((match = tableRegex.exec(content)) !== null) {
        const headers = match[1].split('|').map(h => h.trim()).filter(h => h)
        const rows = match[2].split('\n').map(row => {
          return row.split('|').map(c => c.trim()).filter(c => c)
        }).filter(row => row.length > 0)
        tables.push({ headers, rows })
      }
      return tables
    },
    extractMermaid(content) {
      // 提取Mermaid代码
      const mermaidRegex = /```mermaid\n([\s\S]*?)```/
      const match = content.match(mermaidRegex)
      return match ? match[1] : null
    },
    renderChartsForMessage(message) {
      // 图表通过setChartRef方法初始化
      // 这里确保mermaid图表正确渲染
      if (message.mermaid) {
        this.$nextTick(() => {
          const mermaidEl = document.getElementById('mermaid-' + message.id)
          if (mermaidEl && !mermaidEl.innerHTML) {
            mermaid.render('mermaid-' + message.id, message.mermaid).then(result => {
              mermaidEl.innerHTML = result.svg
            }).catch(err => {
              console.error('Mermaid渲染失败:', err)
            })
          }
        })
      }
    },
    sendQuickQuestion(question) {
      this.inputMessage = question
      this.sendMessage()
    },
    handleEnter(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },
    selectOption(option) {
      this.selectedOption = option.id
      this.inputMessage = `请帮我进行${option.name}分析`
    },
    insertAnalysisTool(tool) {
      this.inputMessage += `请使用${tool.name}方法进行分析。`
    },
    clearHistory() {
      if (confirm('确定要清空所有对话记录吗？')) {
        this.messages = []
        this.currentChatId = null
        localStorage.removeItem('chatHistory')
        localStorage.removeItem('chatList')
      }
    },
    saveHistory() {
      localStorage.setItem('chatHistory', JSON.stringify(this.messages.slice(-50)))
      // 保存聊天列表
      if (!this.currentChatId) {
        this.currentChatId = Date.now()
      }
      const chatList = JSON.parse(localStorage.getItem('chatList') || '[]')
      const existingIndex = chatList.findIndex(c => c.id === this.currentChatId)
      const chatItem = {
        id: this.currentChatId,
        title: this.messages[0]?.content?.substring(0, 30) || '新对话',
        timestamp: new Date()
      }
      if (existingIndex >= 0) {
        chatList[existingIndex] = chatItem
      } else {
        chatList.unshift(chatItem)
      }
      localStorage.setItem('chatList', JSON.stringify(chatList.slice(0, 50)))
      this.historyList = chatList.slice(0, 50)
    },
    loadHistory() {
      const saved = localStorage.getItem('chatHistory')
      if (saved) {
        try {
          this.messages = JSON.parse(saved)
        } catch (e) {
          console.error('加载历史记录失败:', e)
        }
      }
      const chatList = localStorage.getItem('chatList')
      if (chatList) {
        try {
          this.historyList = JSON.parse(chatList)
        } catch (e) {
          console.error('加载聊天列表失败:', e)
        }
      }
    },
    loadChat(chatId) {
      // 加载指定的聊天记录
      this.currentChatId = chatId
      // 这里可以从localStorage或其他存储加载具体聊天内容
      this.loadHistory()
    },
    deleteHistory(chatId) {
      if (confirm('确定要删除这条记录吗？')) {
        this.historyList = this.historyList.filter(h => h.id !== chatId)
        localStorage.setItem('chatList', JSON.stringify(this.historyList))
        if (this.currentChatId === chatId) {
          this.messages = []
          this.currentChatId = null
        }
      }
    },
    formatHistoryTitle(history) {
      return history.title || `对话 ${new Date(history.timestamp).toLocaleDateString()}`
    },
    formatTime(timestamp) {
      return new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.chatArea
        if (container) container.scrollTop = container.scrollHeight
      })
    },
    scrollToTop() {
      if (this.$refs.chatArea) {
        this.$refs.chatArea.scrollTop = 0
      }
    },
    focusTextarea() {
      this.$nextTick(() => {
        const textarea = this.$refs.textarea
        if (textarea) textarea.focus()
      })
    },
    copyMessage(content) {
      navigator.clipboard.writeText(content).then(() => {
        alert('已复制到剪贴板')
      })
    },
    regenerateMessage(messageId) {
      // 重新生成消息的逻辑
    },
    exportToPDF() {
      const doc = new jsPDF()
      let y = 20
      
      this.messages.forEach(msg => {
        const text = msg.content.replace(/\n/g, ' ')
        const lines = doc.splitTextToSize(`${msg.role === 'user' ? '用户' : 'AI'}: ${text}`, 180)
        lines.forEach(line => {
          if (y > 280) {
            doc.addPage()
            y = 20
          }
          doc.text(line, 10, y)
          y += 7
        })
        y += 5
      })
      
      doc.save(`对话记录_${new Date().toISOString().split('T')[0]}.pdf`)
    },
    exportToExcel() {
      const data = this.messages.map(msg => ({
        时间: this.formatTime(msg.timestamp),
        角色: msg.role === 'user' ? '用户' : 'AI',
        内容: msg.content
      }))
      
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '对话记录')
      
      XLSX.writeFile(wb, `对话记录_${new Date().toISOString().split('T')[0]}.xlsx`)
    },
    downloadFile(download) {
      if (download.type === 'PDF') {
        this.exportToPDF()
      } else if (download.type === 'Excel') {
        this.exportToExcel()
      }
    }
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-container {
  height: 100vh;
  display: flex;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
}

/* 左侧边栏 */
.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.logo {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
}

.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: #6b7280;
  padding: 4px 8px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.search-box {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
}

.quick-actions {
  margin-bottom: 16px;
}

.action-item {
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  margin-bottom: 4px;
}

.action-item:hover {
  background: #f3f4f6;
}

.section {
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.add-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #6b7280;
  padding: 0;
  width: 20px;
  height: 20px;
}

.option-list,
.history-list,
.download-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-item,
.history-item,
.download-item {
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.option-item:hover,
.history-item:hover,
.download-item:hover {
  background: #f3f4f6;
}

.option-item.active,
.history-item.active {
  background: #eff6ff;
  color: #2563eb;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #9ca3af;
  padding: 0;
  width: 20px;
  height: 20px;
  display: none;
}

.history-item:hover .delete-btn {
  display: block;
}

.download-type {
  font-size: 12px;
  color: #9ca3af;
}

.preview-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
  margin-top: auto;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.preview-btn {
  flex: 1;
  padding: 8px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.preview-btn:hover {
  background: #e5e7eb;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-header {
  background: #ffffff;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.header-left,
.header-right {
  display: flex;
  gap: 8px;
}

.model-select,
.clear-btn,
.tool-btn {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  font-size: 14px;
}

.model-select:hover,
.clear-btn:hover,
.tool-btn:hover {
  background: #f9fafb;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #f9fafb;
}

.welcome-message {
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-message h2 {
  font-size: 24px;
  margin-bottom: 12px;
  color: #1f2937;
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-top: 24px;
}

.quick-questions button {
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
}

.quick-questions button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.message {
  display: flex;
  margin-bottom: 20px;
  max-width: 85%;
}

.message.user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin: 0 12px;
  flex-shrink: 0;
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
  background: #ffffff;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex: 1;
  min-width: 0;
}

.message-text {
  line-height: 1.6;
  word-break: break-word;
  color: #1f2937;
  white-space: pre-wrap;
}

.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3) {
  margin-top: 16px;
  margin-bottom: 8px;
  font-weight: 600;
}

.message-text :deep(p) {
  margin-bottom: 8px;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin-left: 20px;
  margin-bottom: 8px;
}

.message-text :deep(li) {
  margin-bottom: 4px;
}

.message-text :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.message-text :deep(pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.message-text :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.message-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 8px;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  opacity: 0.6;
}

.action-icon:hover {
  opacity: 1;
}

.charts-container,
.tables-container {
  margin: 16px 0;
}

.chart-wrapper {
  width: 100%;
  height: 400px;
  margin: 16px 0;
}

.mermaid-container {
  margin: 16px 0;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 14px;
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  text-align: left;
  border: 1px solid #e5e7eb;
}

.data-table th {
  background: #f3f4f6;
  font-weight: 600;
}

.data-table tr:nth-child(even) {
  background: #f9fafb;
}

.typing-indicator {
  display: flex;
  gap: 6px;
  padding: 16px;
}

.typing-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
  animation: typing 1.4s infinite;
}

.typing-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.input-area {
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  padding: 12px 20px;
}

.analysis-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.tool-tag {
  padding: 4px 12px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  color: #2563eb;
}

.tool-tag:hover {
  background: #dbeafe;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px 12px;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  min-height: 40px;
  max-height: 200px;
}

.message-input:focus {
  outline: none;
  border-color: #4a6cf7;
}

.send-btn {
  background: #4a6cf7;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.send-btn:hover:not(:disabled) {
  background: #3b5bd9;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.footer-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.footer-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  padding: 4px 0;
}

.footer-btn:hover {
  color: #374151;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>