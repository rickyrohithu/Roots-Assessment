// Normalize BASE_URL so that full backend URLs (e.g. from Render/Vercel)
// with or without trailing slash or /api work seamlessly.
let rawBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
if (rawBase && !rawBase.endsWith('/api')) {
  rawBase = `${rawBase}/api`;
}
const BASE_URL = rawBase || '/api';

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  if (!response.ok) {
    const text = await response.text();
    const err = new Error(text || `Request failed with status ${response.status}`);
    err.status = response.status;
    throw err;
  }

  return response;
}

function buildFullUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (BASE_URL.startsWith('http')) {
    return new URL(`${BASE_URL}${cleanEndpoint}`);
  }
  return new URL(`${BASE_URL}${cleanEndpoint}`, window.location.origin);
}

export const apiClient = {
  async get(endpoint, params = {}) {
    const url = buildFullUrl(endpoint);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response);
  },

  async post(endpoint, data = {}) {
    const url = buildFullUrl(endpoint);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  },

  async put(endpoint, data = {}) {
    const url = buildFullUrl(endpoint);
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return handleResponse(response);
  },

  async delete(endpoint) {
    const url = buildFullUrl(endpoint);
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response);
  },

  /**
   * Downloads CSV from backend with current query parameters
   */
  async downloadCSV(endpoint, params = {}, defaultFilename = 'tasks_export.csv') {
    const url = buildFullUrl(endpoint);
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to export CSV: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;

    const disposition = response.headers.get('content-disposition');
    let filename = defaultFilename;
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};
