/**
 * API Client for Contextual Support Assistant
 */

export class SupportApiError extends Error {
  constructor(message, { status = 0, code = 'network_error', retryable = true } = {}) {
    super(message);
    this.name = 'SupportApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

async function parseApiError(response, fallbackMessage) {
  const errorData = await response.json().catch(() => ({}));
  return new SupportApiError(
    errorData.detail || errorData.error || fallbackMessage,
    {
      status: response.status,
      code: errorData.code || 'request_failed',
      retryable: errorData.retryable !== false,
    }
  );
}

async function request(url, options = {}, fallbackMessage = 'Request failed.') {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw await parseApiError(res, fallbackMessage);
    }
    return await res.json();
  } catch (error) {
    if (error instanceof SupportApiError) throw error;
    throw new SupportApiError(
      'The backend could not be reached. Check that the support service is running and retry.',
      { code: 'network_error', retryable: true }
    );
  }
}

export function fetchSystemStatus() {
  return request('/api/status', {}, 'Status check failed.');
}

export function fetchCustomers() {
  return request('/api/customers', {}, 'Failed to fetch customer profiles.');
}

export async function fetchCustomerHistory(customerId) {
  if (!customerId) return { customer_id: '', history: [] };
  return request(
    `/api/history/${encodeURIComponent(customerId)}`,
    {},
    'Failed to fetch customer history.'
  );
}

export function sendChatMessage(
  customerId,
  message,
  { conversationId = null, memoryEnabled = true } = {}
) {
  return request(
    '/api/chat',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customerId,
        message,
        memory_enabled: memoryEnabled,
        conversation_id: conversationId,
      }),
    },
    'The support assistant could not process this message.'
  );
}
