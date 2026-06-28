'use client';

import { useState, useEffect } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { adminAPI } from '@/lib/adminAPI';
import { RefreshCw, Users, Server, AlertTriangle, ShieldCheck, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0 });
  const [pipelineActive, setPipelineActive] = useState(true);
  const [deleteId, setDeleteId] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      const res = await adminAPI.deleteFeedContent(deleteId);
      if (res.success) {
        alert(res.message);
        setDeleteId('');
      }
    } catch (err) {
      alert("Failed to delete content");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="flex flex-col flex-1 w-full max-w-4xl mx-auto border-x border-border min-h-screen bg-background">
        
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center">
          <ShieldCheck className="w-6 h-6 mr-2 text-primary" />
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Users</p>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-3xl font-black text-foreground">{stats.totalUsers}</h2>
            </div>
            
            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Online Now</p>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
              <h2 className="text-3xl font-black text-emerald-500">{stats.onlineUsers}</h2>
            </div>

            <div className="bg-card rounded-2xl p-4 border border-border shadow-sm col-span-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">AI Pipeline Status</p>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full shadow-inner", pipelineActive ? 'bg-emerald-500' : 'bg-destructive')}></div>
                  <span className="font-bold text-foreground text-sm">
                    {pipelineActive ? 'Active & Generating' : 'Halted'}
                  </span>
                </div>
              </div>
              <button 
                onClick={togglePipeline}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm",
                  pipelineActive 
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' 
                    : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                )}
              >
                {pipelineActive ? 'Stop Pipeline' : 'Start Pipeline'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Moderation */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <div className="flex items-center mb-4 text-destructive">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <h3 className="text-lg font-bold">Content Moderation</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4 font-medium">
                Force delete any inappropriate content by Post ID.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text"
                  placeholder="Enter Post ID..."
                  value={deleteId}
                  onChange={(e) => setDeleteId(e.target.value)}
                  className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm"
                />
                <button 
                  onClick={handleDelete}
                  disabled={!deleteId || isSubmitting}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-6 py-2.5 rounded-xl font-bold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Reports */}
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col h-full min-h-[250px]">
              <div className="flex items-center mb-4 text-foreground">
                <Inbox className="w-5 h-5 mr-2 text-primary" />
                <h3 className="text-lg font-bold">User Reports</h3>
              </div>
              <div className="bg-muted/50 rounded-xl border border-border p-6 flex-1 flex flex-col items-center justify-center text-center">
                {reports.length === 0 ? (
                  <>
                    <Inbox className="w-10 h-10 mb-3 text-muted-foreground opacity-50" />
                    <p className="text-foreground font-bold">No pending reports.</p>
                    <p className="text-muted-foreground text-sm mt-1">Your community is looking good!</p>
                  </>
                ) : (
                  <div className="w-full text-left">
                    <p className="text-sm font-medium">Load reports here...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </AdminGuard>
  );
}
