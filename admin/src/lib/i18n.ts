// i18n configuration and utilities
import { create } from 'zustand'

export type Language = 'zh' | 'en'

interface I18nStore {
  language: Language
  setLanguage: (lang: Language) => void
}

// Create a simple i18n store
export const useI18n = create<I18nStore>((set) => ({
  language: (localStorage.getItem('language') as Language) || 'zh',
  setLanguage: (lang: Language) => {
    localStorage.setItem('language', lang)
    set({ language: lang })
  },
}))

// Translation dictionaries
export const translations = {
  zh: {
    // Navigation
    nav: {
      dashboard: '工作台',
      providers: '模型服务商',
      modelTypes: '模型列表',
      chat: '对话测试',
      logs: '请求日志',
      settings: '设置',
      apiKeys: 'API 密钥',
      monitoring: '监控',
      help: '帮助',
    },
    // Dashboard
    dashboard: {
      title: '工作台',
      description: 'XGateway 多模型服务商 AI 网关概览',
      totalProviders: '总模型服务商',
      totalProvidersDesc: '已配置的模型服务商数量',
      enabledProviders: '在线模型服务商',
      enabledProvidersDesc: '当前启用的模型服务商',
      todayRequests: '今日请求',
      todayRequestsDesc: '统计功能开发中',
      avgLatency: '平均延迟',
      avgLatencyDesc: '统计功能开发中',
      addProvider: '添加模型服务商',
      testAllProviders: '测试所有模型服务商',
      batchEdit: '批量编辑配置',
      viewReport: '查看性能报告',
      cleanupProviders: '清理无效模型服务商',
      quickActions: '快速操作',
    },
    // Providers
    providers: {
      title: '模型服务商',
      description: '管理和配置 AI 模型服务商',
      allProviders: '所有模型服务商',
      search: '搜索...',
      add: '添加模型服务商',
      edit: '编辑',
      delete: '删除',
      name: '名称',
      type: '类型',
      model: '模型',
      status: '状态',
      priority: '优先级',
      actions: '操作',
      enabled: '启用',
      disabled: '禁用',
    },
    // Chat
    chat: {
      title: '对话测试',
      description: '测试模型服务商的对话功能',
      selectProvider: '选择模型服务商',
      message: '输入消息',
      send: '发送',
      clear: '清空',
      history: '历史对话',
      noHistory: '暂无历史对话',
    },
    // Logs
    logs: {
      title: '请求日志',
      description: '查看 API 请求历史记录',
      search: '搜索模型服务商或模型...',
      allStatus: '全部状态',
      export: '导出',
      provider: '模型服务商',
      model: '模型',
      status: '状态',
      timestamp: '时间',
    },
    // API Keys
    apiKeys: {
      title: 'API 密钥',
      description: '管理 XGateway 网关的访问密钥',
      create: '创建 API Key',
      refresh: '刷新',
      list: 'API 密钥列表',
      listDesc: '用于访问 XGateway 网关的认证密钥',
      name: '名称',
      key: '密钥',
      status: '状态',
      rateLimit: '速率限制',
      createdAt: '创建时间',
      lastUsed: '最后使用',
      actions: '操作',
      noKeys: '暂无 API Key，点击上方按钮创建',
    },
    // Monitoring
    monitoring: {
      title: '系统监控',
      description: '实时监控 Provider 池状态和健康状况',
      refresh: '刷新',
      autoRefresh: '自动刷新 (5s)',
      stopAutoRefresh: '停止自动刷新',
      healthyProviders: '健康 Providers',
      degradedProviders: '降级 Providers',
      unhealthyProviders: '不健康 Providers',
      totalRequests: '总请求数',
      avgLatency: '平均延迟',
      circuitClosed: '闭合',
      circuitOpen: '断开',
      circuitHalfOpen: '半开',
      circuitUnknown: '未知',
      healthy: '健康',
      degraded: '降级',
      unhealthy: '不健康',
      unknown: '未知',
    },
    // Settings
    settings: {
      title: '系统设置',
      description: '配置负载均衡、健康检查和故障转移策略',
      save: '保存设置',
      saving: '保存中...',
      reset: '恢复默认',
      loadBalance: '负载均衡',
      loadBalanceDesc: '选择请求分发策略',
      strategy: '负载均衡策略',
      healthCheck: '健康检查',
      healthCheckDesc: '配置健康检查参数',
      interval: '检查间隔（秒）',
      circuitBreaker: '熔断器',
      circuitBreakerDesc: '配置熔断器参数',
      threshold: '失败阈值',
      timeout: '熔断超时（秒）',
      retry: '重试策略',
      retryDesc: '配置重试参数',
      maxRetries: '最大重试次数',
      retryDelay: '重试延迟（毫秒）',
    },
    // Model Types
    modelTypes: {
      title: '模型列表',
      description: '管理可用的 AI 模型列表',
      allTypes: '所有模型列表',
      models: '可用模型',
      modelsCount: '模型数量',
      addModel: '添加模型',
      editModel: '编辑模型',
      deleteModel: '删除模型',
      modelId: '模型 ID',
      modelName: '模型名称',
      modelDescription: '模型描述',
      supportsTools: '支持工具调用',
      contextLength: '上下文长度',
      baseUrl: '默认 API 地址',
      defaultModel: '默认模型',
      noModels: '暂无模型',
      confirmDeleteModel: '确定要删除这个模型吗？',
    },
    // Help
    help: {
      title: '帮助中心',
      description: 'XGateway 使用指南和文档',
      quickStart: '快速开始',
      quickStartDesc: '了解如何配置和使用 XGateway',
      apiKeys: '生成 API Key',
      apiKeysDesc: '生成 API Key 用于客户端访问 XGateway 网关',
      providers: '模型服务商',
      providersDesc: 'XGateway 支持的 AI 服务提供商',
      contact: '联系与支持',
      github: 'GitHub 仓库',
      issues: '提交问题',
    },
    // Common
    common: {
      loading: '加载中...',
      error: '错误',
      success: '成功',
      timeout: '超时',
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      edit: '编辑',
      save: '保存',
      admin: '管理员',
      email: 'admin@xgateway.local',
    },
  },
  en: {
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      providers: 'Model Providers',
      modelTypes: 'Model Types',
      chat: 'Chat Test',
      logs: 'Request Logs',
      settings: 'Settings',
      apiKeys: 'API Keys',
      monitoring: 'Monitoring',
      help: 'Help',
    },
    // Dashboard
    dashboard: {
      title: 'Dashboard',
      description: 'XGateway Multi-Provider AI Gateway Overview',
      totalProviders: 'Total Providers',
      totalProvidersDesc: 'Number of configured model providers',
      enabledProviders: 'Online Providers',
      enabledProvidersDesc: 'Currently enabled model providers',
      todayRequests: 'Today Requests',
      todayRequestsDesc: 'Statistics feature in development',
      avgLatency: 'Average Latency',
      avgLatencyDesc: 'Statistics feature in development',
      addProvider: 'Add Model Provider',
      testAllProviders: 'Test All Providers',
      batchEdit: 'Batch Edit Configuration',
      viewReport: 'View Performance Report',
      cleanupProviders: 'Clean Up Invalid Providers',
      quickActions: 'Quick Actions',
    },
    // Providers
    providers: {
      title: 'Model Providers',
      description: 'Manage and configure AI model providers',
      allProviders: 'All Model Providers',
      search: 'Search...',
      add: 'Add Model Provider',
      edit: 'Edit',
      delete: 'Delete',
      name: 'Name',
      type: 'Type',
      model: 'Model',
      status: 'Status',
      priority: 'Priority',
      actions: 'Actions',
      enabled: 'Enabled',
      disabled: 'Disabled',
    },
    // Chat
    chat: {
      title: 'Chat Test',
      description: 'Test the chat functionality of model providers',
      selectProvider: 'Select Model Provider',
      message: 'Enter message',
      send: 'Send',
      clear: 'Clear',
      history: 'Chat History',
      noHistory: 'No chat history',
    },
    // Logs
    logs: {
      title: 'Request Logs',
      description: 'View API request history',
      search: 'Search provider or model...',
      allStatus: 'All Status',
      export: 'Export',
      provider: 'Model Provider',
      model: 'Model',
      status: 'Status',
      timestamp: 'Timestamp',
    },
    // API Keys
    apiKeys: {
      title: 'API Keys',
      description: 'Manage access keys for XGateway',
      create: 'Create API Key',
      refresh: 'Refresh',
      list: 'API Keys List',
      listDesc: 'Authentication keys for accessing XGateway',
      name: 'Name',
      key: 'Key',
      status: 'Status',
      rateLimit: 'Rate Limit',
      createdAt: 'Created At',
      lastUsed: 'Last Used',
      actions: 'Actions',
      noKeys: 'No API Keys yet, click the button above to create one',
    },
    // Monitoring
    monitoring: {
      title: 'System Monitoring',
      description: 'Real-time monitoring of Provider pool status and health',
      refresh: 'Refresh',
      autoRefresh: 'Auto Refresh (5s)',
      stopAutoRefresh: 'Stop Auto Refresh',
      healthyProviders: 'Healthy Providers',
      degradedProviders: 'Degraded Providers',
      unhealthyProviders: 'Unhealthy Providers',
      totalRequests: 'Total Requests',
      avgLatency: 'Average Latency',
      circuitClosed: 'Closed',
      circuitOpen: 'Open',
      circuitHalfOpen: 'Half Open',
      circuitUnknown: 'Unknown',
      healthy: 'Healthy',
      degraded: 'Degraded',
      unhealthy: 'Unhealthy',
      unknown: 'Unknown',
    },
    // Settings
    settings: {
      title: 'System Settings',
      description: 'Configure load balancing, health checks, and failover strategies',
      save: 'Save Settings',
      saving: 'Saving...',
      reset: 'Reset to Defaults',
      loadBalance: 'Load Balancing',
      loadBalanceDesc: 'Select request distribution strategy',
      strategy: 'Load Balance Strategy',
      healthCheck: 'Health Check',
      healthCheckDesc: 'Configure health check parameters',
      interval: 'Check Interval (seconds)',
      circuitBreaker: 'Circuit Breaker',
      circuitBreakerDesc: 'Configure circuit breaker parameters',
      threshold: 'Failure Threshold',
      timeout: 'Circuit Breaker Timeout (seconds)',
      retry: 'Retry Strategy',
      retryDesc: 'Configure retry parameters',
      maxRetries: 'Max Retries',
      retryDelay: 'Retry Delay (milliseconds)',
    },
    // Model Types
    modelTypes: {
      title: 'Model Types',
      description: 'Manage available AI model types and model lists',
      allTypes: 'All Model Types',
      models: 'Available Models',
      modelsCount: 'Model Count',
      addModel: 'Add Model',
      editModel: 'Edit Model',
      deleteModel: 'Delete Model',
      modelId: 'Model ID',
      modelName: 'Model Name',
      modelDescription: 'Model Description',
      supportsTools: 'Supports Tools',
      contextLength: 'Context Length',
      baseUrl: 'Default API URL',
      defaultModel: 'Default Model',
      noModels: 'No models yet',
      confirmDeleteModel: 'Are you sure you want to delete this model?',
    },
    // Help
    help: {
      title: 'Help Center',
      description: 'XGateway Usage Guide and Documentation',
      quickStart: 'Quick Start',
      quickStartDesc: 'Learn how to configure and use XGateway',
      apiKeys: 'Generate API Key',
      apiKeysDesc: 'Generate API Key for client access to XGateway',
      providers: 'Model Providers',
      providersDesc: 'AI service providers supported by XGateway',
      contact: 'Contact & Support',
      github: 'GitHub Repository',
      issues: 'Submit Issues',
    },
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      timeout: 'Timeout',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      save: 'Save',
      admin: 'Admin',
      email: 'admin@xgateway.local',
    },
  },
}

// Helper function to get translation
export function t(key: string, lang?: Language): string {
  const currentLang = lang || useI18n.getState().language
  const dict = translations[currentLang]
  
  const keys = key.split('.')
  let value: any = dict
  
  for (const k of keys) {
    value = value?.[k]
  }
  
  return value || key
}

