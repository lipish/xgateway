import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  if (!dateString) return ""
  return dateString.split("T")[0]
}

export function formatDateTime(dateString: string, locale: string) {
  if (!dateString) return ""
  const date = new Date(dateString)
  if (locale === "zh") {
    const datePart = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    const timePart = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(date)
    return `${datePart} ${timePart}`
  }
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}
