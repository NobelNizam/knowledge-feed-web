'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { adminAPI } from '@/lib/adminAPI';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0 });
  const [pipelineActive, setPipelineActive] = useState(true);
  const [deleteId, setDeleteId] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await adminAPI.getStats();
        if (statsRes.success) setStats(statsRes.data);
        
        const reportsRes = await adminAPI.getReports();
        if (reportsRes.success) setReports(reportsRes.data);
      } catch (error) {
        console.error("Failed to load admin data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const togglePipeline = async () => {
    try {
      const newState = !pipelineActive;
      const res = await adminAPI.togglePipeline(newState);
      if (res.success) setPipelineActive(newState);
      alert(res.message);
    } catch (err) {
      alert("Error toggling pipeline");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await adminAPI.deleteFeedContent(deleteId);
      if (res.success) {
        alert(res.message);
        setDeleteId('');
      }
    } catch (err) {
      alert("Failed to delete content");
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 p-8 font-sans">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
              <p className="text-slate-500 mt-1 font-medium">Manage platform content and AI pipelines</p>
            </div>
            <a href="/" className="text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors">
              &larr; Back to Feed
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Users</p>
              <h2 className="text-5xl font-black text-slate-800">{stats.totalUsers}</h2>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Online Now</p>
              <h2 className="text-5xl font-black text-emerald-500">{stats.onlineUsers}</h2>
            </div>
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm col-span-1 md:col-span-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">AI Pipeline Status</p>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full shadow-inner ${pipelineActive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className="font-extrabold text-slate-700 text-lg">
                    {pipelineActive ? 'Active & Generating' : 'Halted'}
                  </span>
                </div>
              </div>
              <button 
                onClick={togglePipeline}
                className={`px-6 py-3 rounded-xl font-bold transition-all shadow-sm ${
                  pipelineActive 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-md' 
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:shadow-md'
                }`}
              >
                {pipelineActive ? 'Stop Pipeline' : 'Start Pipeline'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-xl font-extrabold text-slate-800 mb-2">Content Moderation</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium">Force delete any inappropriate content by Post ID.</p>
              <div className="flex gap-3">
                <input 
                  type="text"
                  placeholder="Enter Post ID..."
                  value={deleteId}
                  onChange={(e) => setDeleteId(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <button 
                  onClick={handleDelete}
                  className="bg-red-500 hover:bg-red-600 hover:shadow-lg hover:-translate-y-0.5 text-white px-6 py-3 rounded-xl font-bold transition-all"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-extrabold text-slate-800 mb-6">Inbox Reports</h3>
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex-1 flex flex-col items-center justify-center text-center">
                {reports.length === 0 ? (
                  <>
                    <div className="text-5xl mb-4 opacity-80">📬</div>
                    <p className="text-slate-500 font-bold">No pending user reports.</p>
                    <p className="text-slate-400 text-sm mt-1">Your community is looking good!</p>
                  </>
                ) : (
                  <p>Load reports here...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
