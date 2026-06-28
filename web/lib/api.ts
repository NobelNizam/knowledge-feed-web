import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for sending/receiving HttpOnly cookies
});

export const authAPI = {
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  login: async (data: any) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
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
    return response.data;
  },

  getPersonalizedFeed: async (domains: string[], limit = 20, offset = 0, seenIds?: string[]) => {
    const response = await api.post('/feed/personalized', { domains, seenIds }, { params: { limit, offset } });
    return response.data;
  },

  refreshFeed: async () => {
    const response = await api.post('/feed/refresh');
    return response.data;
  },
};

export const knowledgeAPI = {
  getCard: async (id: string) => {
    const response = await api.get(`/knowledge/${id}`);
    return response.data;
  },

  search: async (query: string, domain?: string) => {
    const params = new URLSearchParams({ q: query });
    if (domain) params.append('domain', domain);
    const response = await api.get(`/knowledge/search?${params}`);
    return response.data;
  },

  getTrending: async (limit = 10) => {
    const response = await api.get(`/knowledge/trending?limit=${limit}`);
    return response.data;
  },

  getDomains: async () => {
    const response = await api.get('/knowledge/domains');
    return response.data;
  },
};

export const userAPI = {
  create: async (name: string, domains: string[]) => {
    const response = await api.post('/user', { name, domains });
    return response.data;
  },

  getProfile: async (userId: string) => {
    const response = await api.get(`/user/${userId}`);
    return response.data;
  },

  updatePreferences: async (domains: string[], readingLevel = 'intermediate') => {
    const response = await api.put(`/user/preferences`, { domains, readingLevel });
    return response.data;
  },

  saveCard: async (cardId: string) => {
    const response = await api.post(`/user/save`, { cardId });
    return response.data;
  },
};

export const interactionAPI = {
  likeCard: async (cardId: string) => {
    // API Ready: POST /api/knowledge/:id/like
    // Mocking response for now until backend is implemented
    return { success: true };
  },

  viewCard: async (cardId: string) => {
    // API Ready: POST /api/knowledge/:id/view
    return { success: true };
  },

  getComments: async (cardId: string) => {
    // API Ready: GET /api/knowledge/:id/comments
    // Mocking empty comments
    return { success: true, data: [] };
  },

  addComment: async (cardId: string, text: string, parentId?: string) => {
    // API Ready: POST /api/knowledge/:id/comments
    return { success: true, data: { id: Date.now(), text, parentId, createdAt: new Date() } };
  }
};

export default api;
