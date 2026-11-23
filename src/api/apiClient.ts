export type TenantStatus = 'ACTIVE' | 'SUSPENDED'
export interface TenantRecord {
  id: string
  name: string
  status: TenantStatus
  createdAt: string
  updatedAt: string
}

export type ApiKeyStatus = 'ACTIVE' | 'REVOKED'
export interface ApiKeyRecord {
  id: string
  name: string
  keyPrefix: string
  status: ApiKeyStatus
  createdAt: string
  revokedAt: string | null
}
export interface CreatedApiKey {
  id: string
  name: string
  keyPrefix: string
  apiKey: string
  createdAt: string
}
export interface CreateApiKeyRequest { name: string }

export type MessageStatus = 'QUEUED' | 'PROCESSING' | 'SENT' | 'DELIVERED' | 'SIMULATED' | 'FAILED'
export interface MessageRecord {
  id: string
  destinationPhoneNumber: string
  body: string
  status: MessageStatus
  createdAt: string
  updatedAt: string
}
export interface MessagePage {
  content: MessageRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}
export interface CreateMessageRequest {
  destinationPhoneNumber: string
  body: string
}

export interface ContactRecord {
  id: string
  name: string
  phoneNumber: string
  email: string | null
  description: string | null
  createdAt: string
  updatedAt: string
}
export interface ContactPage {
  content: ContactRecord[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}
export interface ContactRequest {
  name: string
  phoneNumber: string
  email: string | null
  description: string | null
}
export interface MessageStatusHistoryRecord {
  id: string
  messageId: string
  previousStatus: MessageStatus | null
  newStatus: MessageStatus
  changeSource: string
  timestamp: string
}

export interface MessageAnalyticsSummary {
  totalMessages: number
  messagesByStatus: Record<MessageStatus, number>
  periodStart: string
  periodEnd: string
  periodTotalMessages: number
  periodMessagesByStatus: Record<MessageStatus, number>
}

export interface DailyMessageVolumeDay {
  date: string
  totalMessages: number
  messagesByStatus: Record<MessageStatus, number>
}

export interface DailyMessageVolume {
  periodStart: string
  periodEnd: string
  days: DailyMessageVolumeDay[]
}

export type WebhookEventType = 'message.queued' | 'message.simulated' | 'message.sent' | 'message.failed'
export type WebhookStatus = 'ACTIVE' | 'SUSPENDED'
export interface WebhookSubscription {
  id: string
  url: string
  eventTypes: WebhookEventType[]
  status: WebhookStatus
  createdAt: string
  updatedAt: string
}
export interface CreatedWebhookSubscription extends WebhookSubscription {
  signingSecret: string
}
export interface CreateWebhookRequest {
  url: string
  eventTypes: WebhookEventType[]
}
export interface UpdateWebhookRequest extends CreateWebhookRequest {
  status: WebhookStatus
}

export type ApiField = 'name' | 'phoneNumber' | 'email' | 'description' | 'destinationPhoneNumber' | 'body' | 'url' | 'eventTypes' | 'status'

export class ApiRequestError extends Error {
  readonly status: number | null
  readonly fieldErrors: Partial<Record<ApiField, string>>

  constructor(status: number | null, fieldErrors: Partial<Record<ApiField, string>> = {}) {
    super(messageForStatus(status))
    this.name = 'ApiRequestError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
const apiBaseUrl = import.meta.env.DEV ? '/api/v1' : (configuredBaseUrl || '/api/v1')

async function request<T>(path: string, apiKey: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'X-API-Key': apiKey,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    throw new ApiRequestError(null)
  }

  if (!response.ok) {
    const fieldErrors = response.status === 400 ? await readFieldErrors(response) : {}
    throw new ApiRequestError(response.status, fieldErrors)
  }
  if (response.status === 204) return undefined as T
  try {
    return await response.json() as T
  } catch {
    throw new ApiRequestError(response.status)
  }
}

async function readFieldErrors(response: Response): Promise<Partial<Record<ApiField, string>>> {
  try {
    const payload: unknown = await response.json()
    if (!isRecord(payload) || typeof payload.message !== 'string') return {}
    const fieldErrors: Partial<Record<ApiField, string>> = {}
    const messageMap: Record<ApiField, string> = {
      name: 'Enter a name of up to 100 characters.',
      phoneNumber: 'Use E.164 format: + followed by 8 to 15 digits.',
      email: 'Enter a valid email address of up to 254 characters.',
      description: 'Description must not exceed 1000 characters.',
      destinationPhoneNumber: 'Use E.164 format: + followed by 8 to 15 digits.',
      body: 'Enter a message body.',
      url: 'Enter a valid HTTPS URL without credentials or a fragment (maximum 2048 characters).',
      eventTypes: 'Select at least one supported event type.',
      status: 'Choose a valid subscription status.',
    }
    for (const entry of payload.message.split(';')) {
      const field = entry.slice(0, entry.indexOf(':')).trim()
      if (Object.prototype.hasOwnProperty.call(messageMap, field)) {
        const apiField = field as ApiField
        fieldErrors[apiField] = apiField === 'name' && /contact name/i.test(entry)
          ? 'Enter a contact name of up to 150 characters.'
          : messageMap[apiField]
      }
      if (field === 'isValidHttpsUrl') fieldErrors.url = messageMap.url
    }
    if (/https|url/i.test(payload.message)) fieldErrors.url = messageMap.url
    if (/event type/i.test(payload.message)) fieldErrors.eventTypes = messageMap.eventTypes
    if (/phone number|e\.164/i.test(payload.message)) fieldErrors.destinationPhoneNumber = messageMap.destinationPhoneNumber
    if (/message body/i.test(payload.message)) fieldErrors.body = messageMap.body
    return fieldErrors
  } catch {
    return {}
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function messageForStatus(status: number | null): string {
  switch (status) {
    case 400: return 'Some fields need attention. Review the form and try again.'
    case 401: return 'Your API key is no longer authorized. Connect again with an active tenant key.'
    case 404: return 'The requested OpenSMS record could not be found.'
    case 409: return 'This change conflicts with the record’s current state.'
    case 500: return 'OpenSMS could not complete the request. Please try again later.'
    case null: return 'Could not reach the OpenSMS API. Check the connection and try again.'
    default: return 'OpenSMS could not complete the request. Please try again.'
  }
}

export function getTenant(apiKey: string): Promise<TenantRecord> {
  return request<TenantRecord>('/tenants/me', apiKey)
}

export function listApiKeys(apiKey: string): Promise<ApiKeyRecord[]> {
  return request<ApiKeyRecord[]>('/api-keys', apiKey)
}

export function createApiKey(apiKey: string, data: CreateApiKeyRequest): Promise<CreatedApiKey> {
  return request<CreatedApiKey>('/api-keys', apiKey, { method: 'POST', body: JSON.stringify(data) })
}

export function revokeApiKey(apiKey: string, id: string): Promise<ApiKeyRecord> {
  return request<ApiKeyRecord>(`/api-keys/${encodeURIComponent(id)}`, apiKey, { method: 'DELETE' })
}

export function listMessages(apiKey: string, page: number, size: number, status?: MessageStatus): Promise<MessagePage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) params.set('status', status)
  return request<MessagePage>(`/messages?${params.toString()}`, apiKey)
}

export function createMessage(apiKey: string, data: CreateMessageRequest, idempotencyKey: string): Promise<MessageRecord> {
  return request<MessageRecord>('/messages', apiKey, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function getMessage(apiKey: string, id: string): Promise<MessageRecord> {
  return request<MessageRecord>(`/messages/${encodeURIComponent(id)}`, apiKey)
}

export function getMessageHistory(apiKey: string, id: string): Promise<MessageStatusHistoryRecord[]> {
  return request<MessageStatusHistoryRecord[]>(`/messages/${encodeURIComponent(id)}/history`, apiKey)
}

export function listContacts(apiKey: string, page: number, size: number, search?: string): Promise<ContactPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  const normalizedSearch = search?.trim()
  if (normalizedSearch) params.set('search', normalizedSearch)
  return request<ContactPage>(`/contacts?${params.toString()}`, apiKey)
}

export function getContact(apiKey: string, id: string): Promise<ContactRecord> {
  return request<ContactRecord>(`/contacts/${encodeURIComponent(id)}`, apiKey)
}

export function createContact(apiKey: string, data: ContactRequest): Promise<ContactRecord> {
  return request<ContactRecord>('/contacts', apiKey, { method: 'POST', body: JSON.stringify(data) })
}

export function updateContact(apiKey: string, id: string, data: ContactRequest): Promise<ContactRecord> {
  return request<ContactRecord>(`/contacts/${encodeURIComponent(id)}`, apiKey, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteContact(apiKey: string, id: string): Promise<void> {
  return request<void>(`/contacts/${encodeURIComponent(id)}`, apiKey, { method: 'DELETE' })
}

function analyticsQuery(from?: string, to?: string): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function getAnalyticsSummary(apiKey: string, from?: string, to?: string): Promise<MessageAnalyticsSummary> {
  return request<MessageAnalyticsSummary>(`/analytics/summary${analyticsQuery(from, to)}`, apiKey)
}

export function getDailyMessageVolume(apiKey: string, from?: string, to?: string): Promise<DailyMessageVolume> {
  return request<DailyMessageVolume>(`/analytics/messages/daily${analyticsQuery(from, to)}`, apiKey)
}

export function listWebhooks(apiKey: string): Promise<WebhookSubscription[]> {
  return request<WebhookSubscription[]>('/webhooks', apiKey)
}

export function getWebhook(apiKey: string, id: string): Promise<WebhookSubscription> {
  return request<WebhookSubscription>(`/webhooks/${encodeURIComponent(id)}`, apiKey)
}

export function createWebhook(apiKey: string, data: CreateWebhookRequest): Promise<CreatedWebhookSubscription> {
  return request<CreatedWebhookSubscription>('/webhooks', apiKey, { method: 'POST', body: JSON.stringify(data) })
}

export function updateWebhook(apiKey: string, id: string, data: UpdateWebhookRequest): Promise<WebhookSubscription> {
  return request<WebhookSubscription>(`/webhooks/${encodeURIComponent(id)}`, apiKey, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteWebhook(apiKey: string, id: string): Promise<void> {
  return request<void>(`/webhooks/${encodeURIComponent(id)}`, apiKey, { method: 'DELETE' })
}
