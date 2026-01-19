<template>
  <div class="app-container">
    <!-- 左侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo-container">
          <div class="logo-icon">🎯</div>
          <span v-if="!sidebarCollapsed" class="logo-text">AI.AMASSWIN.COM</span>
        </div>
        <button @click="sidebarCollapsed = !sidebarCollapsed" class="toggle-btn">
          {{ sidebarCollapsed ? '▶' : '◀' }}
        </button>
      </div>

      <div v-if="!sidebarCollapsed" class="sidebar-content">
        <!-- 搜索框 -->
        <div class="search-box">
          <input v-model="searchQuery" type="text" placeholder="搜索" class="search-input" />
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
            <div
              v-for="history in filteredHistory"
              :key="history.id"
              :class="['history-item', { active: currentChatId === history.id }]"
              @click="loadChat(history.id)"
            >
              <span>{{ history.title || formatHistoryTitle(history) }}</span>
              <span @click.stop="deleteHistory(history.id)" class="delete-btn">×</span>
            </div>
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
          <button @click="clearHistory" class="clear-btn">清空对话</button>
        </div>
        <div class="header-right">
          <button @click="showContextLinks = !showContextLinks" class="tool-btn">
            {{ showContextLinks ? '隐藏关联' : '显示关联' }}
          </button>
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
        </div>

        <!-- 消息列表 -->
        <div v-for="message in messages" :key="message.id" :class="['message', message.role]" :data-message-id="message.id">
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
              <div class="mermaid-header">
                <div class="mermaid-title">
                  <span class="chart-icon">{{ getChartIcon(message.mermaid) }}</span>
                  {{ getChartTitle(message.mermaid) }}
                </div>
                <div class="mermaid-actions">
                  <button @click="zoomIn(message.id)" class="mermaid-action-btn" title="放大">🔍+</button>
                  <button @click="zoomOut(message.id)" class="mermaid-action-btn" title="缩小">🔍-</button>
                  <button @click="resetZoom(message.id)" class="mermaid-action-btn" title="重置缩放">🔄</button>
                  <button @click="fullscreenMermaid(message.id)" class="mermaid-action-btn" title="全屏">⛶</button>
                  <button @click="downloadMermaidAsImage(message.id)" class="mermaid-action-btn" title="下载图片">📥</button>
                </div>
              </div>
              <div class="mermaid-wrapper" :id="'mermaid-wrapper-' + message.id">
                <div class="mermaid" :id="'mermaid-' + message.id"></div>
              </div>
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
            <!-- 上下文关联 -->
            <div v-if="showContextLinks && getRelatedMessages(message.id).length" class="context-links">
              <div class="context-header">
                <span class="context-icon">🔗</span>
                <span class="context-title">相关上下文</span>
              </div>
              <div class="related-messages">
                <button
                  v-for="relatedMsg in getRelatedMessages(message.id)"
                  :key="relatedMsg.id"
                  @click="scrollToMessage(relatedMsg.id)"
                  class="related-message-btn"
                  :title="relatedMsg.content.substring(0, 100) + '...'"
                >
                  <span class="related-role">{{ relatedMsg.role === 'user' ? '用户' : 'AI' }}</span>
                  <span class="related-content">{{ relatedMsg.content.substring(0, 50) }}...</span>
                  <span class="related-time">{{ formatTime(relatedMsg.timestamp) }}</span>
                </button>
              </div>
            </div>
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
          <!-- 模型选择器 -->
          <div class="model-selector">
            <label class="model-label">模型：</label>
            <select v-model="selectedModel" class="model-select-inline">
              <option value="deepseek-chat">DeepSeek Chat</option>
              <option value="deepseek-coder">DeepSeek Coder</option>
            </select>
          </div>
          <!-- 分析工具按钮 -->
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
import html2canvas from 'html2canvas'

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
      showAnalysisTools: false,
      currentChatId: null,
      selectedOption: null,
      apiBaseUrl: 'https://api.ai.amasswin.com',
      chartInstances: new Map(),
      analysisOptions: [
        { id: 'market-research', name: '市场调研', methods: ['PEST分析', '波特五力模型', '市场细分分析', '用户画像分析', '竞品分析矩阵'] },
        { id: 'marketing-plan', name: '营销方案', methods: ['4P营销理论', 'STP战略', 'AARRR模型', '营销漏斗分析', '品牌定位分析'] },
        { id: 'policy-analysis', name: '政策分析', methods: ['政策环境分析', '政策影响评估', '政策趋势预测', '政策对比分析', '政策风险评估'] },
        { id: 'listing-finance', name: '上市金融', methods: ['财务模型分析', '估值分析', '资本结构分析', '现金流分析', '投资回报分析'] },
        { id: 'competitor-analysis', name: '市场竞品', methods: ['竞品对比矩阵', '功能对比分析', '价格策略分析', '市场份额分析', '竞争优势分析'] },
        { id: 'product-planning', name: '产品规划', methods: ['产品路线图', '功能优先级分析', '用户需求分析', '产品生命周期', 'MVP设计'] },
        { id: 'structure-design', name: '结构设计', methods: ['结构力学分析', '有限元分析', '载荷分析', '材料选型分析', '结构优化设计'] },
        { id: 'electrical-design', name: '电气设计', methods: ['电气系统设计', '配电系统分析', '电气安全分析', '能效分析', '自动化控制设计'] },
        { id: 'electronic-design', name: '电子设计', methods: ['电路设计分析', 'PCB布局设计', '信号完整性分析', 'EMC分析', '可靠性分析'] },
        { id: 'software-design', name: '软件设计', methods: ['架构设计', 'UML建模', '系统设计模式', '性能分析', '安全分析'] },
        { id: 'engineering-design', name: '工程设计', methods: ['工程设计规范', '工艺流程分析', '质量体系分析', '成本效益分析', '风险评估'] },
        { id: 'strategy-analysis', name: '战略分析', methods: ['SWOT分析', '战略地图', '价值链分析', 'BCG矩阵', 'GE矩阵'] },
        { id: 'financial-analysis', name: '财务分析', methods: ['财务比率分析', '杜邦分析', '财务预测模型', '敏感性分析', '盈亏平衡分析'] },
        { id: 'risk-analysis', name: '风险管理', methods: ['风险识别', '风险矩阵', '风险量化分析', '风险应对策略', '风险监控体系'] },
        { id: 'quality-management', name: '质量管理', methods: ['PDCA循环', '六西格玛', '质量成本分析', 'SPC统计过程控制', 'FMEA失效模式分析'] },
        { id: 'supply-chain', name: '供应链管理', methods: ['供应链优化', '库存管理分析', '供应商评估', '物流成本分析', '供应链风险评估'] },
        { id: 'project-management', name: '项目管理', methods: ['项目计划分析', '关键路径法', '资源分配分析', '项目风险评估', '进度控制分析'] },
        { id: 'innovation-research', name: '创新研究', methods: ['技术路线图', '创新模式分析', '专利分析', '技术成熟度评估', '创新生态分析'] }
      ],
      analysisTools: [
        { id: 'swot', name: 'SWOT分析', type: 'matrix' },
        { id: 'duality', name: '对偶理论', type: 'theory' },
        { id: 'sensitivity', name: '敏感性分析', type: 'analysis' },
        { id: 'queuing', name: '排队论', type: 'theory' },
        { id: 'storage', name: '存储论', type: 'theory' },
        { id: 'game', name: '对策论', type: 'theory' },
        { id: 'decision', name: '决策分析', type: 'analysis' },
        { id: 'logic-diagram', name: '逻辑图', type: 'diagram' },
        { id: 'flowchart', name: '流程图', type: 'diagram' },
        { id: 'fishbone', name: '鱼骨图', type: 'diagram' },
        { id: 'mindmap', name: '思维导图', type: 'diagram' },
        { id: 'matrix-table', name: '阵列表', type: 'table' },
        { id: 'bar-chart', name: '柱状图', type: 'chart' },
        { id: 'radar-chart', name: '雷达图', type: 'chart' },
        { id: 'network-diagram', name: '网络图', type: 'diagram' },
        { id: 'pest', name: 'PEST分析', type: 'matrix' },
        { id: 'porter-five', name: '波特五力', type: 'diagram' },
        { id: 'value-chain', name: '价值链', type: 'diagram' }
      ],
      historyList: [],
      downloads: [],
      mermaidZoomLevels: new Map(), // 存储每个Mermaid图表的缩放级别
      fullscreenMermaidId: null, // 当前全屏的Mermaid图表ID
      messageVectors: new Map(), // 存储消息的向量特征
      contextLinks: new Map(), // 存储消息间的关联关系
      showContextLinks: true // 是否显示上下文关联
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
        theme: 'base',
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#2563eb',
          lineColor: '#6b7280',
          sectionBkgColor: '#f8fafc',
          altSectionBkgColor: '#ffffff',
          sectionBorderColor: '#e5e7eb',
          gridColor: '#f1f5f9',
          tertiaryColor: '#f1f5f9',
          fontFamily: '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
          fontSize: '14px'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          nodeSpacing: 50,
          rankSpacing: 50,
          diagramPadding: 20,
          padding: 15
        },
        securityLevel: 'loose',
        fontFamily: '"Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
      })
    },
    renderMarkdown(content) {
      if (!content) return ''
      const html = marked.parse(content)
      this.$nextTick(() => {
        this.parseAndRenderCharts(content)
        this.parseMermaid(content)
        this.addCodeCopyButtons()
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
        const chartType = this.detectChartType(match[1])
        const id = 'mermaid-' + Date.now() + '-' + Math.random()
        this.$nextTick(() => {
          const element = document.getElementById(id)
          if (element) {
            // 根据图表类型应用不同的配置
            let config = {}
            if (chartType === 'mindmap') {
              config = {
                theme: 'base',
                themeVariables: {
                  primaryColor: '#10b981',
                  primaryTextColor: '#ffffff',
                  primaryBorderColor: '#059669',
                  lineColor: '#6b7280',
                  sectionBkgColor: '#f0fdf4',
                  altSectionBkgColor: '#ffffff',
                  gridColor: '#f0fdf4'
                }
              }
            } else if (chartType === 'flowchart') {
              config = {
                theme: 'base',
                themeVariables: {
                  primaryColor: '#3b82f6',
                  primaryTextColor: '#ffffff',
                  primaryBorderColor: '#2563eb',
                  lineColor: '#6b7280',
                  sectionBkgColor: '#eff6ff',
                  altSectionBkgColor: '#ffffff',
                  gridColor: '#eff6ff'
                }
              }
            }
            
            mermaid.render(id, match[1], config).then(result => {
              if (element) {
                element.innerHTML = result.svg
                // 为SVG添加样式类
                const svg = element.querySelector('svg')
                if (svg) {
                  svg.classList.add('mermaid-svg', `mermaid-${chartType}`)
                }
              }
            }).catch(err => {
              console.error('Mermaid渲染失败:', err)
            })
          }
        })
      }
    },
    // 检测图表类型
    detectChartType(mermaidCode) {
      const code = mermaidCode.toLowerCase().trim()
      if (code.startsWith('mindmap') || code.includes('mindmap')) {
        return 'mindmap'
      } else if (code.startsWith('flowchart') || code.includes('flowchart') || code.startsWith('graph')) {
        return 'flowchart'
      } else if (code.startsWith('sequence')) {
        return 'sequence'
      } else if (code.startsWith('gantt')) {
        return 'gantt'
      } else if (code.startsWith('pie') || code.startsWith('piechart')) {
        return 'pie'
      }
      return 'flowchart' // 默认类型
    },
    // 获取图表图标
    getChartIcon(mermaidCode) {
      const chartType = this.detectChartType(mermaidCode)
      switch (chartType) {
        case 'mindmap': return '🧠'
        case 'flowchart': return '📊'
        case 'sequence': return '📈'
        case 'gantt': return '📅'
        case 'pie': return '🥧'
        default: return '📊'
      }
    },
    // 获取图表标题
    getChartTitle(mermaidCode) {
      const chartType = this.detectChartType(mermaidCode)
      switch (chartType) {
        case 'mindmap': return '思维导图'
        case 'flowchart': return '流程图'
        case 'sequence': return '时序图'
        case 'gantt': return '甘特图'
        case 'pie': return '饼图'
        default: return '图表'
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
            this.buildContextLinks() // 重新构建上下文关联
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
            const chartType = this.detectChartType(message.mermaid)
            let config = {}
            if (chartType === 'mindmap') {
              config = {
                theme: 'base',
                themeVariables: {
                  primaryColor: '#10b981',
                  primaryTextColor: '#ffffff',
                  primaryBorderColor: '#059669',
                  lineColor: '#6b7280',
                  sectionBkgColor: '#f0fdf4',
                  altSectionBkgColor: '#ffffff',
                  gridColor: '#f0fdf4'
                }
              }
            } else if (chartType === 'flowchart') {
              config = {
                theme: 'base',
                themeVariables: {
                  primaryColor: '#3b82f6',
                  primaryTextColor: '#ffffff',
                  primaryBorderColor: '#2563eb',
                  lineColor: '#6b7280',
                  sectionBkgColor: '#eff6ff',
                  altSectionBkgColor: '#ffffff',
                  gridColor: '#eff6ff'
                }
              }
            }
            
            mermaid.render('mermaid-' + message.id, message.mermaid, config).then(result => {
              mermaidEl.innerHTML = result.svg
              // 为SVG添加样式类
              const svg = mermaidEl.querySelector('svg')
              if (svg) {
                svg.classList.add('mermaid-svg', `mermaid-${chartType}`)
              }
            }).catch(err => {
              console.error('Mermaid渲染失败:', err)
            })
          }
        })
      }
    },
    handleEnter(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    },
    selectOption(option) {
      this.selectedOption = option.id
      // 生成包含专业分析方法的提示词
      const methods = option.methods ? option.methods.join('、') : ''
      let prompt = `请帮我进行${option.name}分析。`
      if (methods) {
        prompt += `建议使用以下专业分析方法：${methods}。请根据分析内容自动生成相应的可视化图表，如逻辑图、流程图、鱼骨图、思维导图、阵列表、柱状图、雷达图或网络图等，以更好地展示分析结果。`
      }
      this.inputMessage = prompt
    },
    insertAnalysisTool(tool) {
      // 根据工具类型生成相应的提示词
      let prompt = ''
      switch(tool.type) {
        case 'diagram':
          if (tool.id === 'logic-diagram') {
            prompt = `请使用逻辑图方法进行分析，并生成逻辑图可视化展示。`
          } else if (tool.id === 'flowchart') {
            prompt = `请使用流程图方法进行分析，并生成流程图可视化展示。`
          } else if (tool.id === 'fishbone') {
            prompt = `请使用鱼骨图（因果分析图）方法进行分析，并生成鱼骨图可视化展示。`
          } else if (tool.id === 'mindmap') {
            prompt = `请使用思维导图方法进行分析，并生成思维导图可视化展示。`
          } else if (tool.id === 'network-diagram') {
            prompt = `请使用网络图方法进行分析，并生成网络图可视化展示。`
          } else if (tool.id === 'porter-five') {
            prompt = `请使用波特五力模型进行分析，并生成波特五力图可视化展示。`
          } else if (tool.id === 'value-chain') {
            prompt = `请使用价值链分析，并生成价值链图可视化展示。`
          } else {
            prompt = `请使用${tool.name}方法进行分析，并生成相应的图表可视化展示。`
          }
          break
        case 'chart':
          if (tool.id === 'bar-chart') {
            prompt = `请使用柱状图进行数据可视化分析，并提供相应的数据表格。`
          } else if (tool.id === 'radar-chart') {
            prompt = `请使用雷达图进行多维度对比分析，并提供相应的数据表格。`
          } else {
            prompt = `请使用${tool.name}进行数据可视化分析。`
          }
          break
        case 'table':
          prompt = `请使用阵列表方法进行分析，并以表格形式展示分析结果。`
          break
        case 'matrix':
          prompt = `请使用${tool.name}方法进行分析，并以矩阵表格形式展示分析结果。`
          break
        default:
          prompt = `请使用${tool.name}方法进行分析，并根据分析内容自动生成合适的可视化图表。`
      }
      if (this.inputMessage.trim()) {
        this.inputMessage += ' ' + prompt
      } else {
        this.inputMessage = prompt
      }
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
      // 保存当前聊天的消息
      if (this.currentChatId) {
        localStorage.setItem(`chatHistory_${this.currentChatId}`, JSON.stringify(this.messages))
      }
      // 同时保存为当前聊天记录（向后兼容）
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
          this.$nextTick(() => {
            this.buildContextLinks() // 加载历史记录后构建上下文关联
          })
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
      // 从localStorage加载特定聊天的消息
      const chatHistory = localStorage.getItem(`chatHistory_${chatId}`)
      if (chatHistory) {
        try {
          this.messages = JSON.parse(chatHistory)
        } catch (e) {
          console.error('加载聊天记录失败:', e)
          this.messages = []
        }
      } else {
        // 如果没有特定聊天记录，加载当前聊天
        this.loadHistory()
      }
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
      const message = this.messages.find(m => m.id === messageId)
      if (message && message.role === 'assistant') {
        // 找到用户的上一条消息
        const messageIndex = this.messages.findIndex(m => m.id === messageId)
        if (messageIndex > 0) {
          const userMessage = this.messages[messageIndex - 1]
          if (userMessage && userMessage.role === 'user') {
            // 删除当前AI消息
            this.messages.splice(messageIndex, 1)
            // 重新发送用户消息
            this.inputMessage = userMessage.content
            this.sendMessage()
          }
        }
      }
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
    },
    // Mermaid图表控制方法
    zoomIn(messageId) {
      const wrapper = document.getElementById(`mermaid-wrapper-${messageId}`)
      if (wrapper) {
        const currentZoom = this.mermaidZoomLevels.get(messageId) || 1
        const newZoom = Math.min(currentZoom * 1.2, 3) // 最大放大3倍
        this.mermaidZoomLevels.set(messageId, newZoom)
        wrapper.style.transform = `scale(${newZoom})`
        wrapper.style.transformOrigin = 'top left'
      }
    },
    zoomOut(messageId) {
      const wrapper = document.getElementById(`mermaid-wrapper-${messageId}`)
      if (wrapper) {
        const currentZoom = this.mermaidZoomLevels.get(messageId) || 1
        const newZoom = Math.max(currentZoom / 1.2, 0.5) // 最小缩小到0.5倍
        this.mermaidZoomLevels.set(messageId, newZoom)
        wrapper.style.transform = `scale(${newZoom})`
        wrapper.style.transformOrigin = 'top left'
      }
    },
    resetZoom(messageId) {
      const wrapper = document.getElementById(`mermaid-wrapper-${messageId}`)
      if (wrapper) {
        this.mermaidZoomLevels.set(messageId, 1)
        wrapper.style.transform = 'scale(1)'
        wrapper.style.transformOrigin = 'top left'
      }
    },
    fullscreenMermaid(messageId) {
      const wrapper = document.getElementById(`mermaid-wrapper-${messageId}`)
      if (wrapper) {
        if (this.fullscreenMermaidId === messageId) {
          // 退出全屏
          document.exitFullscreen().catch(err => console.error('退出全屏失败:', err))
          this.fullscreenMermaidId = null
        } else {
          // 进入全屏
          wrapper.requestFullscreen().then(() => {
            this.fullscreenMermaidId = messageId
          }).catch(err => console.error('进入全屏失败:', err))
        }
      }
    },
    async downloadMermaidAsImage(messageId) {
      const mermaidEl = document.getElementById(`mermaid-${messageId}`)
      if (mermaidEl) {
        try {
          // 显示加载提示
          const loadingToast = document.createElement('div')
          loadingToast.className = 'copy-notification'
          loadingToast.textContent = '正在生成图片...'
          document.body.appendChild(loadingToast)

          // 使用html2canvas将SVG转换为canvas，然后转换为PNG
          const canvas = await html2canvas(mermaidEl, {
            backgroundColor: '#ffffff',
            scale: 2, // 提高分辨率
            useCORS: true,
            allowTaint: true,
            width: mermaidEl.offsetWidth,
            height: mermaidEl.offsetHeight
          })

          // 将canvas转换为blob
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `chart_${messageId}_${new Date().toISOString().split('T')[0]}.png`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(url)

              // 更新提示信息
              loadingToast.textContent = '图片已下载！'
              setTimeout(() => {
                document.body.removeChild(loadingToast)
              }, 2000)
            } else {
              document.body.removeChild(loadingToast)
              alert('生成图片失败，请稍后重试')
            }
          }, 'image/png', 0.9)

        } catch (error) {
          console.error('下载图片失败:', error)
          // 移除加载提示
          const loadingToast = document.querySelector('.copy-notification')
          if (loadingToast) {
            document.body.removeChild(loadingToast)
          }
          alert('下载失败，请稍后重试')
        }
      } else {
        alert('未找到图表内容')
      }
    },
    // 向量特征和上下文关联方法
    // 生成消息的向量特征（简化版，使用关键词提取）
    generateMessageVector(content) {
      const words = content.toLowerCase().split(/\s+/).filter(word => word.length > 1)
      const vector = {}
      
      // 统计词频
      words.forEach(word => {
        vector[word] = (vector[word] || 0) + 1
      })
      
      return vector
    },
    
    // 计算两个向量的余弦相似度
    calculateSimilarity(vector1, vector2) {
      const words = new Set([...Object.keys(vector1), ...Object.keys(vector2)])
      let dotProduct = 0
      let norm1 = 0
      let norm2 = 0
      
      words.forEach(word => {
        const v1 = vector1[word] || 0
        const v2 = vector2[word] || 0
        dotProduct += v1 * v2
        norm1 += v1 * v1
        norm2 += v2 * v2
      })
      
      if (norm1 === 0 || norm2 === 0) return 0
      return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
    },
    
    // 建立消息间的关联
    buildContextLinks() {
      this.contextLinks.clear()
      
      this.messages.forEach((message, index) => {
        const currentVector = this.generateMessageVector(message.content)
        this.messageVectors.set(message.id, currentVector)
        
        const relatedMessages = []
        
        // 查找前面的相关消息
        for (let i = index - 1; i >= Math.max(0, index - 5); i--) {
          const prevMessage = this.messages[i]
          const prevVector = this.messageVectors.get(prevMessage.id) || this.generateMessageVector(prevMessage.content)
          
          const similarity = this.calculateSimilarity(currentVector, prevVector)
          
          if (similarity > 0.1) { // 相似度阈值
            relatedMessages.push({
              ...prevMessage,
              similarity: similarity
            })
          }
        }
        
        // 按相似度排序
        relatedMessages.sort((a, b) => b.similarity - a.similarity)
        
        if (relatedMessages.length > 0) {
          this.contextLinks.set(message.id, relatedMessages.slice(0, 3)) // 最多显示3个相关消息
        }
      })
    },
    
    // 获取相关消息
    getRelatedMessages(messageId) {
      return this.contextLinks.get(messageId) || []
    },
    
    // 滚动到指定消息
    scrollToMessage(messageId) {
      const messageEl = document.querySelector(`[data-message-id="${messageId}"]`)
      if (messageEl) {
        messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 添加高亮效果
        messageEl.classList.add('highlight-message')
        setTimeout(() => {
          messageEl.classList.remove('highlight-message')
        }, 2000)
      }
    },
    // 复制代码到剪贴板
    async copyCodeToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text)
        // 显示临时提示
        const notification = document.createElement('div')
        notification.className = 'copy-notification'
        notification.textContent = '代码已复制！'
        document.body.appendChild(notification)
        setTimeout(() => {
          document.body.removeChild(notification)
        }, 2000)
      } catch (error) {
        console.error('复制失败:', error)
        // 降级方案
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        const notification = document.createElement('div')
        notification.className = 'copy-notification'
        notification.textContent = '代码已复制！'
        document.body.appendChild(notification)
        setTimeout(() => {
          document.body.removeChild(notification)
        }, 2000)
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

.logo-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 20px;
  line-height: 1;
}

.logo-text {
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

.clear-btn,
.tool-btn {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  font-size: 14px;
}

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
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.mermaid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-bottom: 1px solid #cbd5e1;
}

.mermaid-title {
  font-size: 16px;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
}

.mermaid-title::before {
  content: '📊';
  font-size: 18px;
}

.mermaid-actions {
  display: flex;
  gap: 6px;
}

.mermaid-action-btn {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #cbd5e1;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 14px;
  color: #475569;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
}

.mermaid-action-btn:hover {
  background: #ffffff;
  color: #1e293b;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.mermaid-wrapper {
  padding: 24px;
  overflow: auto;
  background: #ffffff;
  transition: transform 0.3s ease;
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mermaid {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 200px;
}

.mermaid svg {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.06));
}

/* 不同图表类型的样式 */
.mermaid-mindmap {
  /* 思维导图的特殊样式 */
}

.mermaid-flowchart {
  /* 流程图的特殊样式 */
}

.mermaid-sequence {
  /* 时序图的特殊样式 */
}

.chart-icon {
  font-size: 18px;
  margin-right: 8px;
}

/* 代码复制按钮样式 */
pre {
  position: relative;
  background: #1f2937;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  overflow-x: auto;
}

.code-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #ffffff;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 12px;
  transition: background-color 0.2s;
  z-index: 10;
}

.code-copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 复制成功提示样式 */
.copy-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  font-size: 14px;
  animation: slideIn 0.3s ease-out;
}

/* 上下文关联样式 */
.context-links {
  margin-top: 12px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 8px;
}

.context-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.context-icon {
  font-size: 14px;
}

.context-title {
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.related-messages {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.related-message-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 13px;
}

.related-message-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.5);
  transform: translateX(2px);
}

.related-role {
  font-weight: 600;
  color: #374151;
  min-width: 32px;
}

.related-content {
  flex: 1;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.related-time {
  font-size: 11px;
  color: #9ca3af;
  margin-left: auto;
}

/* 消息高亮效果 */
.message.highlight-message {
  animation: highlightPulse 2s ease-in-out;
}

@keyframes highlightPulse {
  0% {
    background-color: rgba(59, 130, 246, 0.1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
  50% {
    background-color: rgba(59, 130, 246, 0.2);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  100% {
    background-color: transparent;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
  }
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
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
}

.model-label {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.model-select-inline {
  background: transparent;
  border: none;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  padding: 2px 4px;
  outline: none;
}

.model-select-inline:focus {
  outline: none;
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