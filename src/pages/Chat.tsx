import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api.js';
import { User, Message } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { Send, Sparkles, MessageSquare, ChevronLeft, Wifi, WifiOff, Calculator, Calendar, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiService, AISuggestion } from '../services/aiService.js';

export default function Chat() {
  const [connections, setConnections] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiMode, setAiMode] = useState<'online' | 'offline'>('online');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user: currentUser } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConnections();
    
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConnections = async () => {
    const data = await api.connections.getConnections();
    setConnections(data);
  };

  const loadMessages = async () => {
    if (!selectedUser) return;
    const data = await api.messages.get(selectedUser.id);
    setMessages(data);
  };

  const handleSend = async (e?: React.FormEvent, text?: string) => {
    if (e) e.preventDefault();
    const content = text || newMessage;
    if (!content.trim() || !selectedUser) return;

    const msg = await api.messages.send(selectedUser.id, content);
    setMessages([...messages, msg]);
    setNewMessage('');
    setAiSuggestions([]);
  };

  const getAiSuggestions = async () => {
    if (!selectedUser) return;
    setIsGenerating(true);
    try {
      const history = messages.slice(-5).map(m => `${m.sender_id === currentUser?.id ? 'Me' : selectedUser.name}: ${m.content}`).join('\n');
      const lastMsg = messages.length > 0 ? messages[messages.length - 1].content : '';
      
      const response = await aiService.getAssistantResponse(history, lastMsg);
      setAiSuggestions(response.suggestions);
      setAiMode(response.mode);
    } catch (e) {
      console.error('AI Assist Error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    if (suggestion.type === 'grammar') {
      const correctedText = suggestion.text.replace('Corrected: ', '');
      setNewMessage(correctedText);
    } else if (suggestion.type === 'academic') {
      if (suggestion.text.includes('Structure')) {
        setNewMessage("Report Structure:\n1. Introduction\n2. Literature Review\n3. Methodology\n4. Analysis\n5. Conclusion");
      } else if (suggestion.text.includes('Weekly Planner')) {
        setNewMessage("Weekly Planner:\n- Monday: \n- Tuesday: \n- Wednesday: \n- Thursday: \n- Friday: ");
      } else {
        setNewMessage(prev => prev + (prev ? ' ' : '') + suggestion.text);
      }
    } else {
      handleSend(undefined, suggestion.text);
    }
    setAiSuggestions([]);
  };

  const handleMathSolve = () => {
    const solved = aiService.solveMath(newMessage);
    setNewMessage(solved);
  };

  const handleScheduleGen = (type: 'daily' | 'weekly') => {
    const template = aiService.generateSchedule(type);
    setNewMessage(template);
  };

  const handleReportGen = (format: 'report' | 'essay' | 'bib' | 'cheat' = 'report') => {
    const template = aiService.generateReportStructure(newMessage || undefined, format);
    setNewMessage(template);
  };

  const handleGrammarCheck = () => {
    const corrected = aiService.checkGrammar(newMessage);
    setNewMessage(corrected);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 h-[calc(100vh-8.5rem)] md:h-[calc(100vh-12rem)] flex overflow-hidden relative">
      {/* Sidebar */}
      <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r flex-col bg-white z-10`}>
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <span className="font-bold text-gray-900">Messages</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
              {connections.length} active
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {connections.length > 0 ? (
            connections.map(u => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-indigo-50/30 transition-all text-left ${selectedUser?.id === u.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-lg flex-shrink-0 shadow-sm shadow-indigo-100">
                    {u.name[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-4 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-gray-900 truncate">{u.name}</p>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Online</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.role}</p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400">
              <MessageSquare className="mx-auto mb-4 opacity-20" size={48} />
              <p className="text-sm font-medium italic">No connections yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat */}
      {selectedUser ? (
        <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex flex-col bg-gray-50 absolute inset-0 md:relative z-20`}>
          <div className="p-3 md:p-4 bg-white/90 backdrop-blur-md border-b flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedUser(null)}
                className="md:hidden p-2 -ml-2 text-gray-500 hover:text-indigo-600 transition-colors"
                aria-label="Back to messages"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                {selectedUser.name[0]}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-sm md:text-base truncate">{selectedUser.name}</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{selectedUser.role}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-600 border border-orange-100'}`}>
                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                <span>AI: {aiMode === 'online' ? 'Online' : 'Local'}</span>
              </div>
              <button 
                onClick={getAiSuggestions}
                disabled={isGenerating}
                className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 md:px-4 md:py-2 rounded-xl transition-all flex items-center gap-2 text-xs md:text-sm font-bold disabled:opacity-50 ring-1 ring-indigo-100 group"
              >
                <Sparkles size={16} className={isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'} />
                <span className="hidden sm:inline">{isGenerating ? 'Synthesizing...' : 'AI Assist'}</span>
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-95">
            {messages.length > 0 ? (
              messages.map((m, index) => {
                const isMe = m.sender_id === currentUser?.id;
                const showDate = index === 0 || new Date(messages[index-1].created_at).toDateString() !== new Date(m.created_at).toDateString();
                
                return (
                  <React.Fragment key={m.id}>
                    {showDate && (
                      <div className="flex justify-center my-6">
                        <span className="px-3 py-1 bg-gray-200/50 text-gray-500 text-[10px] font-bold rounded-full uppercase tracking-widest backdrop-blur-sm">
                          {new Date(m.created_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                      <div className={`max-w-[85%] md:max-w-[70%] p-3.5 rounded-2xl shadow-sm text-sm ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                      }`}>
                        <p className="leading-relaxed">{m.content}</p>
                        <p className={`text-[9px] mt-1.5 font-bold uppercase tracking-tighter opacity-60 text-right`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                <MessageSquare size={64} className="mb-4" />
                <p className="font-bold uppercase tracking-widest text-lg">No messages here yet</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-white/90 backdrop-blur-md border-t sticky bottom-0 z-40">
            <AnimatePresence>
              {aiSuggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar"
                >
                  {aiSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s)}
                      className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-sm border ${
                        s.type === 'grammar' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        s.type === 'academic' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        s.type === 'coach' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        'bg-indigo-50 text-indigo-600 border-indigo-200'
                      }`}
                    >
                      <span className="opacity-50 text-[10px] uppercase font-black">{s.type}</span>
                      {s.text}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-wrap gap-2 mb-3">
              <button 
                onClick={handleGrammarCheck}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-amber-50 transition-colors border border-amber-100 shadow-sm"
              >
                <FileText size={12} />
                Grammar Fix
              </button>
              <button 
                onClick={handleMathSolve}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-indigo-50 transition-colors border border-indigo-100 shadow-sm"
              >
                <Calculator size={12} />
                Solve Math/Eq
              </button>
              <button 
                onClick={() => handleScheduleGen('daily')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-green-600 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-green-50 transition-colors border border-green-100 shadow-sm"
              >
                <Calendar size={12} />
                Daily Plan
              </button>
              <button 
                onClick={() => handleReportGen('report')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-purple-600 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-purple-50 transition-colors border border-purple-100 shadow-sm"
              >
                <FileText size={12} />
                Report Format
              </button>
              <button 
                onClick={() => handleReportGen('essay')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-pink-600 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-pink-50 transition-colors border border-pink-100 shadow-sm"
              >
                <FileText size={12} />
                Essay Outline
              </button>
              <button 
                onClick={() => handleReportGen('bib')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-blue-50 transition-colors border border-blue-100 shadow-sm"
              >
                <FileText size={12} />
                Bib Template
              </button>
            </div>
            <form onSubmit={handleSend} className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Ask a question or send a message..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-100/80 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-400 text-sm md:text-base font-medium"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <Send size={18} />
                </div>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-indigo-600 text-white w-12 h-12 rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none active:scale-90"
              >
                <Send size={22} className="rotate-45 -translate-y-0.5 -translate-x-0.5" strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-300 flex-col gap-6 p-12 text-center bg-gray-50/30">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-100/50">
            <MessageSquare size={48} strokeWidth={1.5} className="text-indigo-200 rotate-12" />
          </div>
          <div>
            <h3 className="text-gray-900 font-bold text-xl mb-2">Campus Connections</h3>
            <p className="text-sm max-w-xs mx-auto leading-relaxed text-gray-500">Pick a partner from your connections list to start real-time academic collaboration.</p>
          </div>
          <button className="md:hidden mt-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100">View Connections</button>
        </div>
      )}
    </div>
  );
}
