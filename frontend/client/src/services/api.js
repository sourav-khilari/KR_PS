const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginRequest(credentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  return parseResponse(response);
}

export async function forgotPasswordRequest(email) {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  return parseResponse(response);
}

export async function verifyForgotPasswordOtp(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function resetForgotPassword(payload) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function previewMasterImport({ file, gstRate, transportCompanyId, clientCompanyId, plantId, token }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('gstRate', gstRate);
  if (transportCompanyId) formData.append('transportCompanyId', transportCompanyId);
  if (clientCompanyId) formData.append('clientCompanyId', clientCompanyId);
  if (plantId) formData.append('plantId', plantId);

  const response = await fetch(`${API_BASE_URL}/api/master-imports/preview`, {
    method: 'POST',
    headers: authHeaders(token),
    body: formData
  });

  return parseResponse(response);
}

export async function listTransportCompanies(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/api/transport-companies${query ? `?${query}` : ''}`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function listClientCompanies(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/api/client-companies${query ? `?${query}` : ''}`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function listPlants(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/api/plants${query ? `?${query}` : ''}`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function listImportSessions(token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports`, {
    headers: authHeaders(token)
  });

  return parseResponse(response);
}

export async function getImportSession(sessionId, token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports/${sessionId}`, {
    headers: authHeaders(token)
  });

  return parseResponse(response);
}

export async function updateImportRow(sessionId, rowId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports/${sessionId}/rows/${rowId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function approveImportRow(sessionId, rowId, token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports/${sessionId}/rows/${rowId}/approve`, {
    method: 'POST',
    headers: authHeaders(token)
  });

  return parseResponse(response);
}

export async function rejectImportRow(sessionId, rowId, token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports/${sessionId}/rows/${rowId}/reject`, {
    method: 'POST',
    headers: authHeaders(token)
  });

  return parseResponse(response);
}

export async function deleteImportRow(sessionId, rowId, token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports/${sessionId}/rows/${rowId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function cancelImportSession(sessionId, token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports/${sessionId}/cancel`, {
    method: 'POST',
    headers: authHeaders(token)
  });

  return parseResponse(response);
}

export async function saveMasterImport(sessionId, token) {
  const response = await fetch(`${API_BASE_URL}/api/master-imports/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify({ sessionId })
  });

  return parseResponse(response);
}

export async function getPaymentPreviewApi({ startDate, endDate, ownerId, transportCompanyId, clientCompanyId, plantId, token }) {
  let url = `${API_BASE_URL}/api/payments/preview?startDate=${startDate}&endDate=${endDate}`;
  if (ownerId) url += `&ownerId=${ownerId}`;
  if (transportCompanyId) url += `&transportCompanyId=${transportCompanyId}`;
  if (clientCompanyId) url += `&clientCompanyId=${clientCompanyId}`;
  if (plantId) url += `&plantId=${plantId}`;
  const response = await fetch(url, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function savePaymentRunApi(payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/payments/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function listPaymentRunsApi(token) {
  const response = await fetch(`${API_BASE_URL}/api/payments/history`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function deletePaymentRunApi(runId, token) {
  const response = await fetch(`${API_BASE_URL}/api/payments/history/${runId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function getPaymentRunDetailsApi(runId, token) {
  const response = await fetch(`${API_BASE_URL}/api/payments/runs/${runId}`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function getGlobalSettingsApi(token) {
  const response = await fetch(`${API_BASE_URL}/api/payments/settings`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function updateGlobalSettingsApi(settings, token) {
  const response = await fetch(`${API_BASE_URL}/api/payments/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(settings)
  });
  return parseResponse(response);
}

export async function listOwnersApi(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/owners${query ? `?${query}` : ''}`;
  const response = await fetch(url, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function updateOwnerApi(ownerId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/owners/${ownerId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export function getExcelExportUrl(runId, token) {
  return `${API_BASE_URL}/api/payments/runs/${runId}/export-excel?token=${encodeURIComponent(token || '')}`;
}

export async function getOwnerApi(ownerId, token) {
  const response = await fetch(`${API_BASE_URL}/api/owners/${ownerId}`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function createOwnerApi(payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/owners`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function deleteOwnerApi(ownerId, token) {
  const response = await fetch(`${API_BASE_URL}/api/owners/${ownerId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function listTrucksApi(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/trucks${query ? `?${query}` : ''}`;
  const response = await fetch(url, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function getTruckApi(truckId, token) {
  const response = await fetch(`${API_BASE_URL}/api/trucks/${truckId}`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function createTruckApi(payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/trucks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateTruckApi(truckId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/trucks/${truckId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function deleteTruckApi(truckId, token) {
  const response = await fetch(`${API_BASE_URL}/api/trucks/${truckId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function getMasterPrepSummaryApi(token) {
  const response = await fetch(`${API_BASE_URL}/api/payments/master-prep-summary`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function listCommissionRulesApi(token, params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/api/commission-rules${query ? `?${query}` : ''}`, {
    headers: authHeaders(token)
  });
  return parseResponse(response);
}

export async function createCommissionRuleApi(payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/commission-rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateCommissionRuleApi(ruleId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/commission-rules/${ruleId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token)
    },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function deleteCommissionRuleApi(ruleId, token) {
  const response = await fetch(`${API_BASE_URL}/api/commission-rules/${ruleId}`, {
    method: 'DELETE',
    headers: authHeaders(token)
  });
  return parseResponse(response);
}


