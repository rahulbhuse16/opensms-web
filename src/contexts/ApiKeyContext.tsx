import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import {
  ApiRequestError,
  createApiKey as createApiKeyRequest,
  createContact as createContactRequest,
  getAnalyticsSummary as getAnalyticsSummaryRequest,
  getContact as getContactRequest,
  getDailyMessageVolume as getDailyMessageVolumeRequest,
  createMessage as createMessageRequest,
  createWebhook as createWebhookRequest,
  deleteWebhook as deleteWebhookRequest,
  getMessage as getMessageRequest,
  getMessageHistory as getMessageHistoryRequest,
  getTenant as getTenantRequest,
  getWebhook as getWebhookRequest,
  listApiKeys,
  listContacts as listContactsRequest,
  listMessages as listMessagesRequest,
  listWebhooks as listWebhooksRequest,
  revokeApiKey as revokeApiKeyRequest,
  deleteContact as deleteContactRequest,
  updateContact as updateContactRequest,
  updateWebhook as updateWebhookRequest,
  type ApiKeyRecord,
  type ContactPage,
  type ContactRecord,
  type ContactRequest,
  type CreateMessageRequest,
  type CreateWebhookRequest,
  type CreatedApiKey,
  type CreatedWebhookSubscription,
  type DailyMessageVolume,
  type MessageAnalyticsSummary,
  type MessagePage,
  type MessageRecord,
  type MessageStatus,
  type MessageStatusHistoryRecord,
  type TenantRecord,
  type UpdateWebhookRequest,
  type WebhookSubscription,
} from '../api/apiClient'

interface ApiKeyContextValue {
  connected: boolean
  connecting: boolean
  connectionError: string | null
  sessionRevision: number
  pendingMessageAttempt: PendingMessageAttempt | null
  setPendingMessageAttempt: (attempt: PendingMessageAttempt | null) => void
  keys: ApiKeyRecord[]
  loading: boolean
  listError: string | null
  connect: (apiKey: string) => Promise<void>
  disconnect: () => void
  refresh: () => Promise<void>
  createKey: (name: string) => Promise<CreatedApiKey>
  revokeKey: (id: string) => Promise<void>
  getTenant: () => Promise<TenantRecord>
  listMessages: (page: number, size: number, status?: MessageStatus) => Promise<MessagePage>
  createMessage: (request: CreateMessageRequest, idempotencyKey: string) => Promise<MessageRecord>
  getMessage: (id: string) => Promise<MessageRecord>
  getMessageHistory: (id: string) => Promise<MessageStatusHistoryRecord[]>
  listWebhooks: () => Promise<WebhookSubscription[]>
  getWebhook: (id: string) => Promise<WebhookSubscription>
  createWebhook: (request: CreateWebhookRequest) => Promise<CreatedWebhookSubscription>
  updateWebhook: (id: string, request: UpdateWebhookRequest) => Promise<WebhookSubscription>
  deleteWebhook: (id: string) => Promise<void>
  getAnalyticsSummary: (from?: string, to?: string) => Promise<MessageAnalyticsSummary>
  getDailyMessageVolume: (from?: string, to?: string) => Promise<DailyMessageVolume>
  listContacts: (page: number, size: number, search?: string) => Promise<ContactPage>
  getContact: (id: string) => Promise<ContactRecord>
  createContact: (request: ContactRequest) => Promise<ContactRecord>
  updateContact: (id: string, request: ContactRequest) => Promise<ContactRecord>
  deleteContact: (id: string) => Promise<void>
}

export interface PendingMessageAttempt {
  idempotencyKey: string
  request: CreateMessageRequest
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null)

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'OpenSMS could not complete the request. Please try again.'
}

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [credential, setCredential] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [sessionRevision, setSessionRevision] = useState(0)
  const [pendingMessageAttempt, setPendingMessageAttempt] = useState<PendingMessageAttempt | null>(null)
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const clearSession = useCallback((error: string | null = null) => {
    setCredential(null)
    setPendingMessageAttempt(null)
    setKeys([])
    setConnectionError(error)
    setListError(null)
    setConnecting(false)
    setLoading(false)
    setSessionRevision((value) => value + 1)
  }, [])

  const disconnect = useCallback(() => clearSession(), [clearSession])

  const run = useCallback(async <T,>(action: (apiKey: string) => Promise<T>): Promise<T> => {
    if (!credential) throw new ApiRequestError(401)
    try {
      return await action(credential)
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) clearSession(error.message)
      throw error
    }
  }, [clearSession, credential])

  const connect = useCallback(async (apiKey: string) => {
    setConnecting(true)
    setConnectionError(null)
    try {
      const result = await listApiKeys(apiKey)
      setCredential(apiKey)
      setKeys(result)
      setListError(null)
    } catch (error) {
      setCredential(null)
      setKeys([])
      setConnectionError(errorMessage(error))
    } finally {
      setConnecting(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!credential) return
    setLoading(true)
    setListError(null)
    try {
      setKeys(await run(listApiKeys))
    } catch (error) {
      setListError(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [credential, run])

  const createKey = useCallback(async (name: string) => {
    const created = await run((apiKey) => createApiKeyRequest(apiKey, { name }))
    await refresh()
    return created
  }, [refresh, run])

  const revokeKey = useCallback(async (id: string) => {
    const updated = await run((apiKey) => revokeApiKeyRequest(apiKey, id))
    setKeys((current) => current.map((key) => key.id === updated.id ? updated : key))
  }, [run])

  const getTenant = useCallback(() => run(getTenantRequest), [run])
  const listMessages = useCallback((page: number, size: number, status?: MessageStatus) =>
    run((apiKey) => listMessagesRequest(apiKey, page, size, status)), [run])
  const createMessage = useCallback((request: CreateMessageRequest, idempotencyKey: string) =>
    run((apiKey) => createMessageRequest(apiKey, request, idempotencyKey)), [run])
  const getMessage = useCallback((id: string) => run((apiKey) => getMessageRequest(apiKey, id)), [run])
  const getMessageHistory = useCallback((id: string) => run((apiKey) => getMessageHistoryRequest(apiKey, id)), [run])
  const listWebhooks = useCallback(() => run(listWebhooksRequest), [run])
  const getWebhook = useCallback((id: string) => run((apiKey) => getWebhookRequest(apiKey, id)), [run])
  const createWebhook = useCallback((request: CreateWebhookRequest) =>
    run((apiKey) => createWebhookRequest(apiKey, request)), [run])
  const updateWebhook = useCallback((id: string, request: UpdateWebhookRequest) =>
    run((apiKey) => updateWebhookRequest(apiKey, id, request)), [run])
  const deleteWebhook = useCallback((id: string) => run((apiKey) => deleteWebhookRequest(apiKey, id)), [run])
  const getAnalyticsSummary = useCallback((from?: string, to?: string) =>
    run((apiKey) => getAnalyticsSummaryRequest(apiKey, from, to)), [run])
  const getDailyMessageVolume = useCallback((from?: string, to?: string) =>
    run((apiKey) => getDailyMessageVolumeRequest(apiKey, from, to)), [run])
  const listContacts = useCallback((page: number, size: number, search?: string) =>
    run((apiKey) => listContactsRequest(apiKey, page, size, search)), [run])
  const getContact = useCallback((id: string) => run((apiKey) => getContactRequest(apiKey, id)), [run])
  const createContact = useCallback((request: ContactRequest) =>
    run((apiKey) => createContactRequest(apiKey, request)), [run])
  const updateContact = useCallback((id: string, request: ContactRequest) =>
    run((apiKey) => updateContactRequest(apiKey, id, request)), [run])
  const deleteContact = useCallback((id: string) => run((apiKey) => deleteContactRequest(apiKey, id)), [run])

  return (
    <ApiKeyContext.Provider value={{
      connected: credential !== null,
      connecting,
      connectionError,
      sessionRevision,
      pendingMessageAttempt,
      setPendingMessageAttempt,
      keys,
      loading,
      listError,
      connect,
      disconnect,
      refresh,
      createKey,
      revokeKey,
      getTenant,
      listMessages,
      createMessage,
      getMessage,
      getMessageHistory,
      listWebhooks,
      getWebhook,
      createWebhook,
      updateWebhook,
      deleteWebhook,
      getAnalyticsSummary,
      getDailyMessageVolume,
      listContacts,
      getContact,
      createContact,
      updateContact,
      deleteContact,
    }}>
      {children}
    </ApiKeyContext.Provider>
  )
}

export function useApiKeys(): ApiKeyContextValue {
  const context = useContext(ApiKeyContext)
  if (!context) throw new Error('useApiKeys must be used within ApiKeyProvider')
  return context
}
