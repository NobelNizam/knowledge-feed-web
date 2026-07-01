const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function request(path: string, options: FetchOptions = {}) {
  let url = `${API_BASE_URL}${path}`;
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(options.params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Setara dengan withCredentials: true di axios (penting untuk cloudflared tunnel cookies)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

const api = {
  get: (path: string, options?: FetchOptions) => request(path, { ...options, method: 'GET' }),
  post: (path: string, data?: unknown, options?: FetchOptions) => request(path, { ...options, method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined }),
  put: (path: string, data?: unknown, options?: FetchOptions) => request(path, { ...options, method: 'PUT', body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: (path: string, options?: FetchOptions) => request(path, { ...options, method: 'DELETE' }),
};

export const authAPI = {
  register: async (data: { name: string; email: string; password: string }) => {
    const response = await api.post('/auth/register', data);
    return response;
  },
  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    return response;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response;
  },
};

export const feedAPI = {
  getFeed: async (limit = 20, offset = 0, domains?: string[], seenIds?: string[]) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (domains && domains.length > 0) {
      params.append('domains', domains.join(','));
    }
    if (seenIds && seenIds.length > 0) {
      params.append('seenIds', seenIds.join(','));
    }
    const response = await api.get(`/feed?${params}`);
    return response;
  },

  getPersonalizedFeed: async (domains: string[], limit = 20, offset = 0, seenIds?: string[]) => {
    const response = await api.post('/feed/personalized', { domains, seenIds }, { params: { limit, offset } });
    return response;
  },

  refreshFeed: async (filterType?: string, filterValue?: string) => {
    const response = await api.post('/feed/refresh', { filterType, filterValue });
    return response;
  },

  getRefreshSSEUrl: (filterType?: string, filterValue?: string, seenIds?: string[]) => {
    const params = new URLSearchParams();
    if (filterType) params.append('filterType', filterType);
    if (filterValue) params.append('filterValue', filterValue);
    if (seenIds && seenIds.length > 0) params.append('seenIds', seenIds.join(','));
    
    // Gunakan full URL jika API_BASE_URL absolut, jika relatif gunakan path lengkap
    const baseUrl = API_BASE_URL.startsWith('http') 
      ? API_BASE_URL 
      : typeof window !== 'undefined' 
        ? `${window.location.origin}${API_BASE_URL}` 
        : API_BASE_URL;
        
    return `${baseUrl}/feed/refresh/sse?${params.toString()}`;
  },
};

export const knowledgeAPI = {
  getCard: async (id: string) => {
    const response = await api.get(`/knowledge/${id}`);
    return response;
  },

  search: async (query: string, domain?: string) => {
    const params = new URLSearchParams({ q: query });
    if (domain) params.append('domain', domain);
    const response = await api.get(`/knowledge/search?${params}`);
    return response;
  },

  getTrending: async (limit = 10) => {
    const response = await api.get(`/knowledge/trending?limit=${limit}`);
    return response;
  },

  getDomains: async () => {
    const response = await api.get('/knowledge/domains');
    return response;
  },

  getTags: async () => {
    const response = await api.get('/knowledge/tags');
    return response;
  },
};

export const userAPI = {
  create: async (name: string, domains: string[]) => {
    const response = await api.post('/user', { name, domains });
    return response;
  },

  getProfile: async (userId: string) => {
    const response = await api.get(`/user/${userId}`);
    return response;
  },

  updatePreferences: async (domains: string[], readingLevel = 'intermediate') => {
    const response = await api.put(`/user/preferences`, { domains, readingLevel });
    return response;
  },

  saveCard: async (cardId: string) => {
    const response = await api.post(`/user/save`, { cardId });
    return response;
  },

  updateProfile: async (name: string, avatarUrl?: string) => {
    const response = await api.put('/user/profile', { name, avatarUrl });
    return response;
  },
};

export const interactionAPI = {
  likeCard: async (cardId: string) => {
    const response = await api.post(`/knowledge/${cardId}/like`);
    return response;
  },

  viewCard: async (cardId: string) => {
    const response = await api.post(`/knowledge/${cardId}/view`);
    return response;
  },

  shareCard: async (cardId: string) => {
    const response = await api.post(`/knowledge/${cardId}/share`);
    return response;
  },

  getComments: async (cardId: string) => {
    const response = await api.get(`/knowledge/${cardId}/comments`);
    return response;
  },

  addComment: async (cardId: string, text: string, parentId?: string) => {
    const response = await api.post(`/knowledge/${cardId}/comments`, { text, parentId });
    return response;
  }
};

export default api;
