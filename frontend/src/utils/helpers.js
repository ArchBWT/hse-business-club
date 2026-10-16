import { formatDistanceToNow, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'

export function timeAgo(dateStr) {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ru })
  } catch {
    return dateStr
  }
}

export function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function parseTags(tagString) {
  if (!tagString) return []
  return tagString
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export const POST_TYPE_LABELS = {
  startup: 'Стартап',
  vacancy: 'Вакансия',
}

export const POST_STATUS_LABELS = {
  active: 'Активно',
  closed: 'Закрыто',
  draft: 'Черновик',
}

export const APPLICATION_STATUS_LABELS = {
  pending: 'На рассмотрении',
  accepted: 'Принято',
  rejected: 'Отклонено',
  withdrawn: 'Отозвано',
}

export const STAGE_LABELS = {
  idea: 'Идея',
  mvp: 'MVP',
  growth: 'Рост',
}

export const INDUSTRY_OPTIONS = [
  'EdTech', 'FinTech', 'HealthTech', 'GreenTech', 'LegalTech',
  'PropTech', 'AgriTech', 'Retail/eCommerce', 'SaaS', 'B2B',
  'Маркетинг', 'Медиа', 'HR Tech', 'Logistics', 'Другое',
]
