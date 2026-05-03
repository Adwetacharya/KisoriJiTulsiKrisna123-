import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { User, Role, BRANCHES } from '../types.js';
import { Search, UserPlus, Check, UserMinus, Clock, Edit2, X, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { motion, AnimatePresence } from 'motion/react';

export default function Directory() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({ role: '', branch: '', search: '' });
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const { user: currentUser, login } = useAuth();
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', avatar: '', bio: '', branch: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [filters]);

  const loadUsers = async () => {
    const params = new URLSearchParams(filters).toString();
    const data = await api.users.search(params);
    const usersArray = Array.isArray(data) ? data : [];
    setUsers(usersArray);
    
    // Load statuses for visible users
    usersArray.forEach(async (u: User) => {
      if (u.id === currentUser?.id) return;
      const status = await api.connections.getStatus(u.id);
      setStatuses(prev => ({ ...prev, [u.id]: status }));
    });
  };

  const handleEditClick = () => {
    if (!currentUser) return;
    setEditForm({
      name: currentUser.name || '',
      avatar: currentUser.avatar || '',
      bio: (currentUser as any).bio || '',
      branch: currentUser.branch || ''
    });
    setIsEditing(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      await api.users.updateProfile(currentUser.id, editForm);
      // Update local storage/context if necessary. Since useAuth usually loads from token/api, might need re-login or refresh.
      // For now, let's just close and maybe the user can refresh or we can refresh the page.
      // Better: if the app has a way to refresh user context.
      window.location.reload(); // Quickest way to sync state for now
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequest = async (userId: string) => {
    await api.connections.request(userId);
    const status = await api.connections.getStatus(userId);
    setStatuses(prev => ({ ...prev, [userId]: status }));
  };

  const renderActionButton = (userId: string) => {
    if (userId === currentUser?.id) {
      return (
        <button 
          onClick={handleEditClick}
          className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
        >
          <Edit2 size={16} />
          Edit Profile
        </button>
      );
    }

    const status = statuses[userId];
    if (!status) return null;

    if (status.status === 'none') {
      return (
        <button 
          onClick={() => handleRequest(userId)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <UserPlus size={16} />
          Follow
        </button>
      );
    }

    if (status.status === 'pending') {
      if (status.requester_id === currentUser?.id) {
        return (
          <div className="flex items-center gap-2 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium">
            <Clock size={16} />
            Requested
          </div>
        );
      }
      return (
        <button 
          onClick={async () => {
            await api.connections.accept(userId);
            loadUsers();
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Accept
        </button>
      );
    }

    return (
      <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium">
        <Check size={16} />
        Connected
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {currentUser && (
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-2xl p-8 mb-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-32 h-32 rounded-2xl object-cover shadow-lg border-4 border-white/20" />
              ) : (
                <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-4xl font-bold shadow-lg border-4 border-white/20 uppercase">
                  {currentUser.name[0]}
                </div>
              )}
              <button 
                onClick={handleEditClick}
                className="absolute -bottom-2 -right-2 p-2 bg-white text-indigo-600 rounded-xl shadow-lg hover:scale-110 transition-transform"
              >
                <Camera size={18} />
              </button>
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                <h2 className="text-3xl font-extrabold">{currentUser.name}</h2>
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-indigo-100 font-medium mb-4">{currentUser.branch}</p>
              <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                {(currentUser as any).bio || "Add a bio to tell others about yourself, your interests, and what you're working on."}
              </p>
            </div>
            <button 
              onClick={handleEditClick}
              className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
            >
              <Edit2 size={16} />
              Edit Profile
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          value={filters.role}
          onChange={e => setFilters({ ...filters, role: e.target.value })}
        >
          <option value="">All Roles</option>
          {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          value={filters.branch}
          onChange={e => setFilters({ ...filters, branch: e.target.value })}
        >
          <option value="">All Branches</option>
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(user => (
          <div 
            key={user.id} 
            onClick={() => user.id === currentUser?.id && handleEditClick()}
            className={`bg-white p-6 rounded-xl border shadow-sm flex flex-col items-center text-center group transition-all ${
              user.id === currentUser?.id ? 'cursor-pointer hover:border-indigo-400 border-indigo-200 bg-indigo-50/10' : 'hover:border-indigo-200'
            }`}
          >
            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-3xl font-bold mb-4 uppercase overflow-hidden ring-4 ring-transparent group-hover:ring-indigo-50 transition-all">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name[0]
              )}
            </div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{user.name}</h3>
            <p className="text-sm text-indigo-600 font-medium mb-1">{user.role}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-6">{user.branch}</p>
            <div className="mt-auto w-full">
              {renderActionButton(user.id)}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-gray-50 px-8 py-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Edit Your Profile</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Display Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Avatar URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.avatar}
                    onChange={e => setEditForm({ ...editForm, avatar: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Branch</label>
                  <select
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editForm.branch}
                    onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                  >
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Bio</label>
                  <textarea
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                    placeholder="Tell us about yourself..."
                    value={editForm.bio}
                    onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-6 py-3 border rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
