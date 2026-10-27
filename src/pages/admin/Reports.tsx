import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  AlertTriangle, CheckCircle, XCircle, Search, Filter, Eye, Trash2, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Report {
  id: string;
  reporter_id: string;
  reported_content_id: string;
  content_type: 'idea' | 'task' | 'collaboration' | 'comment';
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'rejected';
  created_at: string;
  reporter?: { full_name: string; email: string };
}

export default function Reports() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; report: Report | null }>({ isOpen: false, report: null });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    rejected: 0
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchReports();
    }
  }, [profile]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reporter_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setReports(data);
        
        // Calculate stats
        const pending = data.filter(r => r.status === 'pending').length;
        const reviewed = data.filter(r => r.status === 'reviewed').length;
        const rejected = data.filter(r => r.status === 'rejected').length;
        
        setStats({
          total: data.length,
          pending,
          reviewed,
          rejected
        });
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports. Make sure the table exists.');
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (reportId: string, status: 'reviewed' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ 
          status, 
          reviewed_by: profile?.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', reportId);

      if (error) throw error;
      
      toast.success(`Report marked as ${status}`);
      fetchReports(); // Refresh data
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report status');
    }
  };

  const deleteContent = (report: Report) => {
    setConfirmModal({ isOpen: true, report });
  };

  const executeDeleteContent = async () => {
    const report = confirmModal.report;
    if (!report) return;
    
    setConfirmModal({ isOpen: false, report: null });

    try {
      // Delete the actual content based on content_type
      const tableMap: Record<string, string> = {
        'idea': 'content_ideas',
        'task': 'tasks',
        'collaboration': 'collaborations',
        'comment': 'comments' // If comments exist
      };
      
      const tableName = tableMap[report.content_type];
      if (!tableName) throw new Error('Unknown content type');

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', report.reported_content_id);

      if (deleteError) throw deleteError;

      toast.success('Content deleted successfully');
      
      // Auto-mark report as reviewed
      await updateReportStatus(report.id, 'reviewed');
      
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  if (profile?.role !== 'admin') {
    return <div className="text-white p-8">Unauthorized access.</div>;
  }

  // Filter and search logic
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.reporter?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
    const matchesType = filterType === 'all' || report.content_type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Reports Center</h1>
        <p className="text-gray-400">Manage and moderate user-reported content.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#111] p-6 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-400">Total Reports</h3>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#111] p-6 rounded-xl border border-orange-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-orange-400">Pending</h3>
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.pending}</p>
        </div>
        <div className="bg-[#111] p-6 rounded-xl border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-green-400">Reviewed</h3>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.reviewed}</p>
        </div>
        <div className="bg-[#111] p-6 rounded-xl border border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-red-400">Rejected</h3>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats.rejected}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, User, or Reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111] border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-orange-500"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#111] border border-gray-800 rounded-xl pl-9 pr-8 py-2.5 text-white focus:outline-none focus:border-orange-500 appearance-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#111] border border-gray-800 rounded-xl pl-9 pr-8 py-2.5 text-white focus:outline-none focus:border-orange-500 appearance-none"
            >
              <option value="all">All Content</option>
              <option value="idea">Idea</option>
              <option value="task">Task</option>
              <option value="collaboration">Collaboration</option>
              <option value="comment">Comment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading reports...</div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No reports found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-gray-400 border-b border-gray-800">
                <tr>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Reporter</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Reason</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-gray-300">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="text-white">{report.reporter?.full_name || 'Unknown User'}</div>
                      <div className="text-xs text-gray-500">{report.reporter?.email || 'No email'}</div>
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-gray-300 bg-gray-800 px-2 py-1 rounded text-xs">
                        {report.content_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium truncate max-w-[200px]">{report.reason}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{report.description}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'pending' ? 'bg-orange-500/10 text-orange-400' :
                        report.status === 'reviewed' ? 'bg-green-500/10 text-green-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {report.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => updateReportStatus(report.id, 'reviewed')}
                              className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors" 
                              title="Mark as Reviewed (Safe)"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteContent(report)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" 
                              title="Delete Content & Mark Reviewed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => updateReportStatus(report.id, 'rejected')}
                              className="p-2 text-gray-400 hover:bg-gray-500/10 rounded-lg transition-colors" 
                              title="Reject Report (False Alarm)"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, report: null })}
        onConfirm={executeDeleteContent}
        title="Delete Content"
        message={`Are you sure you want to delete this ${confirmModal.report?.content_type}? This action cannot be undone.`}
        confirmText="Delete"
      />
    </div>
  );
}
