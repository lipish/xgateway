import { t } from "@/lib/i18n"

export const getProviderIcon = (providerId: string): string | null => {
  const iconMap: Record<string, string> = {
    'aliyun': '/ali.svg',
    'volcengine': '/volcengine.svg',
    'moonshot': '/moonshot.svg',
    'deepseek': '/deepseek.png',
    'zhipu': '/zhipu.svg',
    'tencent': '/tencent.svg',
    'minimax': '/minimax.svg',
    'longcat': '/longcat.png',
  }
  return iconMap[providerId] || null
}

export const getLocalizedProviderName = (id: string, label: string) => {
  const language = localStorage.getItem('language') || 'en';
  if (language === 'zh') {
    switch (id) {
      case 'volcengine':
        return '火山引擎';
      case 'aliyun':
        return '阿里云';
      case 'tencent':
        return '腾讯云';
      case 'zhipu':
        return '智谱';
      default:
        return label;
    }
  }
  return label;
};

export const getLocalizedDriverType = (driverType?: string) => {
  if (!driverType) return "-"
  switch (driverType) {
    case "openai":
      return t("modelTypes.driverTypeOpenAI")
    case "openai_compatible":
      return t("modelTypes.driverTypeOpenAICompatible")
    case "anthropic":
      return t("modelTypes.driverTypeAnthropic")
    case "aliyun":
      return t("modelTypes.driverTypeAliyun")
    case "volcengine":
      return t("modelTypes.driverTypeVolcengine")
    case "tencent":
      return t("modelTypes.driverTypeTencent")
    case "ollama":
      return t("modelTypes.driverTypeOllama")
    default:
      return driverType
  }
}

export const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return "-"
  return `¥${price}`
}

export const generateIdFromLabel = (label: string): string => {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
}
