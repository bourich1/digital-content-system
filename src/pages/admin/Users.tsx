import AdminUserDrawer from '@/components/admin/AdminUserDrawer';
import './AdminWorkspace.css';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth, Profile } from '@/contexts/AuthContext';
import {
  Users as UsersIcon, Search, Filter, Shield, ShieldOff, MoreVertical, Ban, CheckCircle, Trash2, Mail, Settings2, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { UserFeatureModal } from '@/components/admin/UserFeatureModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function Users() {
  const navigate = useNavigate();
  const [params,setParams] = useSearchParams();
  const [selectedId,setSelectedId] = useState<string | null>(() => params.get("user"));
  const { profile: currentProfile, startDemoMode } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const selectedUser = users.find(user => user.id === selectedId);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [featureModalUser, setFeatureModalUser] = useState<Profile | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setUsers(data as Profile[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProfile?.role === 'admin') {
      fetchUsers();
    }
  }, [currentProfile?.role, roleFilter, statusFilter]);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update user status');
    }
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`User role changed to ${newRole}`);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error toggling role:', error);
      toast.error('Failed to update user role');
    }
  };

  const deleteUser = (userId: string) => {
    setConfirmModal({ isOpen: true, userId });
  };

  const executeDeleteUser = async () => {
    const userId = confirmModal.userId;
    if (!userId) return;
    
    setConfirmModal({ isOpen: false, userId: null });

    // In a real scenario, you'd likely call an edge function since you can't delete auth.users directly from client
    // For now we'll just show a toast message explaining this limitation or we can delete their profile
    toast.info('Account deletion requires a Supabase Edge Function to delete from auth.users. Deleting profile only for now...');
    
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      toast.success('User profile deleted');
      fetchUsers();
    } catch (error) {
       console.error('Error deleting user:', error);
       toast.error('Failed to delete user profile');
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (user.full_name && user.full_name.toLowerCase().includes(query)) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query))
    );
  });

  if (currentProfile?.role !== 'admin') {
    return <div className="text-white p-8">Unauthorized access.</div>;
  }

  return (
    <div className="admin-users space-y-6">
      <div>
        <span className="admin-eyebrow">YOUR COMMUNITY</span><h1 className="text-3xl font-bold text-white mb-2">Members<span className="text-orange-500">.</span></h1>
        <p className="text-gray-400">Get to know your members. Keep their experience running smoothly.</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#111] border border-gray-800 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            aria-label="Search members" placeholder="Search name, email or username…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black border border-gray-800 rounded-lg text-white focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              aria-label="Filter members by role" value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-black border border-gray-800 rounded-lg text-white px-3 py-2 focus:outline-none focus:border-orange-500"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <select
            aria-label="Filter members by status" value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-black border border-gray-800 rounded-lg text-white px-3 py-2 focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/50 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">User</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Role</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Joined</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No users found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <span className="text-orange-400 font-medium">
                              {(user.full_name || user.email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <button className="admin-member-name" onClick={() => setSelectedId(user.id)}>{user.full_name || 'Unnamed User'}</button>
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-green-500/10 text-green-400' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {user.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Ban className="w-3 h-3 mr-1" />}
                        {user.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right"><button className="admin-member-details" onClick={() => setSelectedId(user.id)}>View details <Eye size={14}/></button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-800 text-sm text-gray-400 text-center">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>
      
      {selectedUser && <AdminUserDrawer user={selectedUser} isSelf={selectedUser.id === currentProfile.id} onClose={() => {setSelectedId(null); if(params.has('user')) {params.delete('user');setParams(params,{replace:true});}}} onDemo={async () => {try {await startDemoMode(selectedUser.id);navigate('/');} catch {toast.error('Unable to open this user’s workspace. Please try again.');}}} onAccess={() => {setFeatureModalUser(selectedUser);setSelectedId(null);}} onRole={() => toggleUserRole(selectedUser.id,selectedUser.role)} onStatus={() => toggleUserStatus(selectedUser.id,selectedUser.status)} onDelete={() => {deleteUser(selectedUser.id);setSelectedId(null);}}/>}
      {featureModalUser && (
        <UserFeatureModal
          userId={featureModalUser.id}
          userName={featureModalUser.full_name || featureModalUser.email || 'User'}
          initialBlockedFeatures={featureModalUser.blocked_features || []}
          onClose={() => setFeatureModalUser(null)}
          onUpdate={fetchUsers}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, userId: null })}
        onConfirm={executeDeleteUser}
        title="Delete user profile"
        message="Delete this member's profile permanently? This removes the profile only; their sign-in account is not deleted. This cannot be undone."
        confirmText="Delete"
      />
    </div>
  );
}
