import api from './api';

export const adminAPI = {
  getStats: async () => {
    const response = await api.get('/admin/stats/users');
    return response;
  },

  togglePipeline: async (active: boolean) => {
    const response = await api.post('/admin/pipeline/status', { active });
    return response;
  },

  updateFactCheckConfig: async (config: { enabled: boolean; sources: string[] }) => {
    const response = await api.post('/admin/config/fact-check', { config });
    return response;
  },

  deleteFeedContent: async (id: string) => {
    const response = await api.delete(`/admin/feed/${id}`);
    return response;
  },

  getReports: async () => {
    const response = await api.get('/admin/reports');
    return response;
  },

  dismissReport: async (id: string) => {
    const response = await api.delete(`/admin/reports/${id}`);
    return response;
  }
};
