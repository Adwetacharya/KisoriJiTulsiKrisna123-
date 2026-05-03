import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { Post } from '../types.js';
import { 
  Heart, MessageCircle, Send, Image as ImageIcon, 
  FileText, X, MoreHorizontal, Edit2, Check, ExternalLink, ChevronUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [attachment, setAttachment] = useState<{ url: string, type: string, name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadPosts();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);

    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadPosts = async () => {
    try {
      const data = await api.posts.getAll();
      setPosts(data);
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
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
    if (!newPost.trim() && !attachment) return;

    try {
      const post = await api.posts.create({ 
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

  const handleEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  const handleUpdate = async (id: string) => {
    try {
      const updatedPost = await api.posts.update(id, { content: editContent });
      setPosts(posts.map(p => p.id === id ? updatedPost : p));
      setEditingPostId(null);
    } catch (err) {
      console.error('Failed to update post', err);
    }
  };

  const handleLike = async (id: string) => {
    try {
      await api.posts.like(id);
      setPosts(posts.map(p => {
        if (p.id === id) {
          return {
            ...p,
            is_liked: !p.is_liked,
            likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1
          };
        }
        return p;
      }));
    } catch (err) {
      console.error('Failed to like post', err);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 pb-12">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 font-bold shadow-lg shadow-indigo-100">
              {currentUser?.name?.[0].toUpperCase()}
            </div>
            <textarea
              placeholder="What's happening on campus?"
              className="w-full border-none focus:ring-0 text-base md:text-lg resize-none min-h-[80px] md:min-h-[100px] text-gray-800 placeholder-gray-400 p-0 pt-2"
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
            />
          </div>
          
          <AnimatePresence>
            {attachment && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative group rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 p-2"
              >
                {attachment.type.startsWith('image/') ? (
                  <img src={attachment.url} alt="Preview" className="w-full max-h-64 md:max-h-96 object-cover rounded-xl" />
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{attachment.name}</p>
                      <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{attachment.type.split('/')[1]}</p>
                    </div>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="absolute top-4 right-4 bg-gray-900/60 backdrop-blur-md hover:bg-red-500 text-white p-2 rounded-xl transition-all shadow-lg"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex gap-1">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
                title="Attach photo or document"
              >
                <ImageIcon size={22} strokeWidth={2} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,application/pdf"
              />
            </div>
            <button
              type="submit"
              disabled={!newPost.trim() && !attachment}
              className="bg-indigo-600 text-white px-6 md:px-8 py-2 md:py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2 text-sm md:text-base active:scale-95"
            >
              <Send size={18} strokeWidth={2.5} />
              <span>Share</span>
            </button>
          </div>
        </form>
      </motion.div>

      <div className="space-y-4 md:space-y-6">
        {posts.map((post) => (
          <motion.div 
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                  {post.user_avatar ? (
                    <img src={post.user_avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    post.user_name[0].toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{post.user_name}</h3>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">
                    {post.user_role} • {formatDistanceToNow(new Date(post.created_at))} ago
                    {post.updated_at && <span className="text-gray-400 ml-1">(edited)</span>}
                  </p>
                </div>
              </div>
              
              {currentUser?.id === post.user_id && editingPostId !== post.id && (
                <button 
                  onClick={() => handleEdit(post)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
              )}
            </div>

            <div className="px-6 pb-4">
              {editingPostId === post.id ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full p-3 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px]"
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdate(post.id)}
                      className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1"
                    >
                      <Check size={16} /> Save
                    </button>
                    <button 
                      onClick={() => setEditingPostId(null)}
                      className="bg-gray-100 text-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  
                  {post.file_url && (
                    <div className="mt-4">
                      {post.file_type?.startsWith('image/') ? (
                        <img 
                          src={post.file_url} 
                          alt="Post attachment" 
                          className="rounded-2xl w-full object-cover max-h-[500px] border"
                        />
                      ) : (
                        <a 
                          href={post.file_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-4 p-4 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl border border-indigo-100 group/file transition-colors"
                        >
                          <div className="p-3 bg-white rounded-lg">
                            <FileText className="text-indigo-600" size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">Document Attachment</p>
                            <p className="text-xs text-indigo-500 uppercase tracking-widest font-bold">PDF FILE</p>
                          </div>
                          <ExternalLink className="text-indigo-400" size={18} />
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/20 flex items-center gap-8">
              <button 
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-2 transition-all ${post.is_liked ? 'text-red-500 scale-110' : 'text-gray-500 hover:text-red-500'}`}
              >
                <Heart size={20} fill={post.is_liked ? 'currentColor' : 'none'} />
                <span className="text-sm font-bold">{post.likes_count}</span>
              </button>
              <button className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors">
                <MessageCircle size={20} />
                <span className="text-sm font-bold text-gray-500">Comment</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 md:bottom-32 md:right-12 z-50 bg-indigo-600 text-white p-3 md:p-4 rounded-2xl shadow-2xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 group border-2 border-white/20"
            aria-label="Scroll to top"
          >
            <ChevronUp size={24} strokeWidth={3} className="group-hover:animate-bounce" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
