import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const feedAPI = {
  getFeed: async (limit = 20, offset = 0, domains?: string[]) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (domains && domains.length > 0) {
      params.append('domains', domains.join(','));
    }
    const response = await api.get(`/feed?${params}`);
    return response.data;
  },

  getPersonalizedFeed: async (domains: string[], limit = 20, offset = 0) => {
    const response = await api.post('/feed/personalized', { domains }, { params: { limit, offset } });
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

  updatePreferences: async (userId: string, domains: string[], readingLevel = 'intermediate') => {
    const response = await api.put(`/user/${userId}/preferences`, { domains, readingLevel });
    return response.data;
  },

  saveCard: async (userId: string, cardId: string) => {
    const response = await api.post(`/user/${userId}/save`, { cardId });
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

  addComment: async (cardId: string, text: string) => {
    // API Ready: POST /api/knowledge/:id/comments
    return { success: true, data: { id: Date.now(), text, createdAt: new Date() } };
  }
};

export default api;
