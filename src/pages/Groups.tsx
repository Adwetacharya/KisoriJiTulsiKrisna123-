import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { Group, Post } from '../types.js';
import { 
  Users, Lock, Send, Image as ImageIcon, 
  FileText, X, MessageCircle, Heart, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Groups() {
  const [groups, setGroups] = useState<(Group & { canView: boolean, canPost: boolean })[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<(Group & { canView: boolean, canPost: boolean }) | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string, type: string, name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const data = await api.groups.getAll();
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
        loadPosts(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load groups', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async (groupId: string) => {
    setPostsLoading(true);
    try {
      const data = await api.groups.getPosts(groupId);
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setPostsLoading(false);
    }
  };

  const handleGroupSelect = (group: any) => {
    setSelectedGroup(group);
    loadPosts(group.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        url: event.target?.result as string,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || (!newPost.trim() && !attachment)) return;

    try {
      const post = await api.groups.createPost(selectedGroup.id, { 
        content: newPost,
        file_url: attachment?.url,
        file_type: attachment?.type
      });
      setPosts([post, ...posts]);
      setNewPost('');
      setAttachment(null);
    } catch (err) {
      console.error('Failed to create post', err);
    }
  };

  const handleSeed = async () => {
    try {
      await api.groups.seed();
      loadGroups();
    } catch (err) {
      console.error('Seed failed', err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] md:h-[calc(100vh-12rem)] max-w-7xl mx-auto px-4 relative overflow-hidden">
      {/* Sidebar: Group List */}
      <div className={`${selectedGroup && !loading ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-col h-full`}>
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center whitespace-nowrap">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-indigo-600" />
            Campus Groups
          </h2>
          {groups.length === 0 && (
            <button 
              onClick={handleSeed}
              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-colors"
            >
              Seed
            </button>
          )}
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => handleGroupSelect(group)}
              className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                selectedGroup?.id === group.id 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
                : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm truncate">{group.name}</span>
                <span className="text-[10px] uppercase tracking-wider font-bold opacity-70">
                  {group.type} {group.branch && `• ${group.branch}`}
                </span>
              </div>
              <ChevronRight size={16} className={`transition-transform shrink-0 ${selectedGroup?.id === group.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
            </button>
          ))}
          {groups.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm italic">No groups available for your role.</p>
          )}
        </div>
      </div>

      {/* Main Content: Selected Group Feed */}
      <div className={`${selectedGroup ? 'flex' : 'hidden lg:flex'} flex-1 flex flex-col h-full absolute inset-0 lg:relative z-20 bg-gray-50 lg:bg-transparent px-4 lg:px-0 py-4 lg:py-0`}>
        {selectedGroup ? (
          <div className="flex flex-col h-full bg-white lg:bg-transparent rounded-2xl overflow-hidden shadow-sm lg:shadow-none border lg:border-0 relative">
            <button 
              onClick={() => setSelectedGroup(null)}
              className="lg:hidden absolute top-4 left-4 z-30 p-2 bg-white/80 backdrop-blur rounded-full shadow-md text-gray-600 border"
            >
              <X size={20} />
            </button>

            {/* Group Header */}
            <div className="bg-white rounded-t-2xl border-x lg:border-t p-6 shadow-sm shrink-0 pt-14 lg:pt-6">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight truncate">{selectedGroup.name}</h1>
                  <p className="text-gray-500 text-xs md:text-sm mt-1 line-clamp-1">{selectedGroup.description || 'Welcome to the group discussion.'}</p>
                </div>
                {!selectedGroup.canPost && (
                  <div className="flex-shrink-0 flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold border border-amber-100 italic">
                    <Lock size={12} className="hidden sm:inline" /> View Only
                  </div>
                )}
              </div>
            </div>

            {/* Post Input */}
            {selectedGroup.canPost && (
              <div className="bg-white border-x p-4 md:p-6 shrink-0 shadow-sm z-10">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="hidden sm:flex w-10 h-10 bg-indigo-100 rounded-full flex-shrink-0 items-center justify-center font-bold text-indigo-600 uppercase">
                      {selectedGroup.name[0]}
                    </div>
                    <div className="flex-1">
                      <textarea
                        placeholder={`Message ${selectedGroup.name}...`}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm md:text-base text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none min-h-[80px] md:min-h-[100px]"
                        value={newPost}
                        onChange={e => setNewPost(e.target.value)}
                      />
                      <AnimatePresence>
                        {attachment && (
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative mt-3 group"
                          >
                            {attachment.type.startsWith('image/') ? (
                              <img src={attachment.url} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border shadow-sm" />
                            ) : (
                              <div className="flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm">
                                <FileText className="text-indigo-600" size={24} />
                                <span className="text-xs font-bold truncate flex-1">{attachment.name}</span>
                              </div>
                            )}
                            <button 
                              type="button"
                              onClick={() => setAttachment(null)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"
                            >
                              <X size={14} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pl-0 md:pl-14">
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <ImageIcon size={20} />
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*,application/pdf"
                      />
                    </button>
                    <button
                      type="submit"
                      disabled={!newPost.trim() && !attachment}
                      className="bg-indigo-600 text-white px-4 md:px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none text-xs md:text-sm"
                    >
                      <Send size={16} />
                      Post
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Posts List */}
            <div className="flex-1 overflow-y-auto bg-gray-50 border-x pb-20">
              {postsLoading ? (
                <div className="flex justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : posts.length > 0 ? (
                <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                  {posts.map((post) => (
                    <motion.div 
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-5 group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-black text-sm md:text-lg">
                            {post.user_avatar ? (
                              <img src={post.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              post.user_name[0].toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 leading-tight text-sm md:text-base truncate">{post.user_name}</h3>
                            <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-indigo-400 truncate">
                              {post.user_role} • {formatDistanceToNow(new Date(post.created_at))} ago
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-800 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
                      {post.file_url && (
                        <div className="mt-4">
                          {post.file_type?.startsWith('image/') ? (
                            <img src={post.file_url} alt="Post content" className="rounded-xl w-full object-cover max-h-64 md:max-h-96 border shadow-inner" />
                          ) : (
                            <a 
                              href={post.file_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-3 p-3 bg-indigo-50/30 rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors"
                            >
                              <FileText className="text-indigo-600" size={20} />
                              <span className="text-[10px] md:text-xs font-bold text-indigo-600 truncate">View Attachment</span>
                            </a>
                          )}
                        </div>
                      )}
                      <div className="mt-4 flex gap-6 pt-4 border-t border-gray-50">
                        <button className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors">
                          <Heart size={16} fill={post.is_liked ? 'currentColor' : 'none'} className={post.is_liked ? 'text-red-500' : ''} />
                          <span className="text-[10px] md:text-xs font-bold">{post.likes_count}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 transition-colors">
                          <MessageCircle size={16} />
                          <span className="text-[10px] md:text-xs font-bold px-1">Comments</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
                  <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <MessageCircle size={40} className="text-gray-200" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 italic">No posts yet</h3>
                  <p className="text-sm px-10">Be the first one to start a conversation in this group!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 italic">
            Select a group to view discussion
          </div>
        )}
      </div>
    </div>
  );
}
