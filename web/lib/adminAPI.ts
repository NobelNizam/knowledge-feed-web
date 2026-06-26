import api from './api';

export const adminAPI = {
  getStats: async () => {
    const response = await api.get('/admin/stats/users');
    return response.data;
  },

  togglePipeline: async (active: boolean) => {
    const response = await api.post('/admin/pipeline/status', { active });
    return response.data;
  },

  updateFactCheckConfig: async (config: any) => {
    const response = await api.post('/admin/config/fact-check', { config });
    return response.data;
  },

  deleteFeedContent: async (id: string) => {
    const response = await api.delete(`/admin/feed/${id}`);
    return response.data;
  },

  getReports: async () => {
    const response = await api.get('/admin/reports');
    return response.data;
  }
};
