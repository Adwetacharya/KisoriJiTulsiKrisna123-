import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api.js';
import { Role, BRANCHES, YEARS, User } from '../types.js';
import { 
  UserPlus, Upload, Mic, Trash2, CheckCircle, AlertCircle, 
  X, ChevronRight, Users, FileText, Activity, Search, Filter, 
  Edit2, ChevronLeft, RotateCcw
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'motion/react';

const ROLES = Object.values(Role);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk' | 'voice' | 'list'>('manual');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    id: '', // for edit mode
    name: '',
    email: '',
    phone: '',
    role: Role.STUDENT,
    branch: BRANCHES[0],
    year: YEARS[0]
  });
  const [isEditMode, setIsEditMode] = useState(false);

  // Bulk Import State
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // User List State
  const [userList, setUserList] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\d{10,15}$/.test(phone);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search,
        role: roleFilter,
        branch: branchFilter
      });
      const data = await api.users.list(params.toString());
      setUserList(data.users || []);
      setTotalUsers(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setUserList([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'list') {
      fetchUsers();
    }
  }, [activeTab, currentPage, roleFilter, branchFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'list') {
        setCurrentPage(1);
        fetchUsers();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(manualForm.email)) return setMessage({ type: 'error', text: 'Invalid email format' });
    if (!validatePhone(manualForm.phone)) return setMessage({ type: 'error', text: 'Phone must be 10-15 digits' });

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await api.users.updateProfile(manualForm.id, manualForm);
        setMessage({ type: 'success', text: 'User updated successfully' });
      } else {
        await api.users.create(manualForm);
        setMessage({ type: 'success', text: 'User created successfully' });
      }
      
      setManualForm({
        id: '', name: '', email: '', phone: '',
        role: Role.STUDENT, branch: BRANCHES[0], year: YEARS[0]
      });
      setIsEditMode(false);
      if (activeTab === 'list') fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save user' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.users.delete(id);
      setMessage({ type: 'success', text: 'User deleted successfully' });
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete user' });
    }
  };

  const handleEditUser = (user: any) => {
    setManualForm({
      id: user.id || '',
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || Role.STUDENT,
      branch: user.branch || BRANCHES[0],
      year: user.year || YEARS[0]
    });
    setIsEditMode(true);
    setActiveTab('manual');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        const errors: string[] = [];
        const validated = data.map((row: any, index: number) => {
          const rowErrors = [];
          if (!row.name) rowErrors.push('Missing name');
          if (!validateEmail(row.email)) rowErrors.push('Invalid email');
          if (!validatePhone(row.phone)) rowErrors.push('Invalid phone');
          if (!ROLES.includes(row.role as Role)) rowErrors.push('Invalid role');
          
          if (rowErrors.length > 0) {
            errors.push(`Row ${index + 1}: ${rowErrors.join(', ')}`);
          }
          return row;
        });
        setBulkData(validated);
        setBulkErrors(errors);
      }
    });
  };

  const handleBulkSubmit = async () => {
    if (bulkErrors.length > 0) return setMessage({ type: 'error', text: 'Please fix validation errors' });
    setIsSubmitting(true);
    let successCount = 0;
    for (const user of bulkData) {
      try {
        await api.users.create(user);
        successCount++;
      } catch (err) {
        console.error('Failed to create user', user.email, err);
      }
    }
    setMessage({ type: 'success', text: `Successfully imported ${successCount} users` });
    setBulkData([]);
    setIsSubmitting(false);
  };

  const startVoiceCapture = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setMessage({ type: 'error', text: 'Voice recognition is not supported in this browser. Please use Chrome or Edge.' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('Listening... Speak clearly.');
      setMessage(null);
      
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
      }, 15000); // 15s absolute timeout
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setIsListening(false);
        setMessage({ 
          type: 'error', 
          text: 'Microphone access denied. Please click the Lock icon in your browser address bar and allow Microphone access.' 
        });
      } else if (event.error !== 'no-speech') {
        setIsListening(false);
        setMessage({ type: 'error', text: `Voice recognition error: ${event.error}` });
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognition.onresult = (event: any) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) recognitionRef.current.stop();
      }, 5000); // 5s of silence after speech stops it

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);

      if (finalTranscript) {
        const lowerResult = finalTranscript.toLowerCase();
        const newForm = { ...manualForm };
        
        // Improve email parsing
        const emailMatch = finalTranscript.replace(/\s+/g, '').match(/[a-zA-Z0-9._%+-]+@?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          newForm.email = emailMatch[0]
            .replace('at', '@')
            .replace('dot', '.')
            .replace('underscore', '_');
        }

        // Phone parsing (extact 10-12 digits)
        const phoneDigits = finalTranscript.replace(/\D/g, '');
        if (phoneDigits.length >= 10) {
          newForm.phone = phoneDigits.slice(0, 15);
        }

        // Name parsing
        const nameKeywords = ['name is', 'add', 'this is', 'is', 'for'];
        let foundName = false;
        for (const kw of nameKeywords) {
          if (lowerResult.includes(kw)) {
            const index = lowerResult.indexOf(kw) + kw.length;
            const remaining = finalTranscript.slice(index).trim();
            const potentialName = remaining.split(/with|email|phone|and|at/)[0].trim();
            if (potentialName && potentialName.split(' ').length <= 4) {
              newForm.name = potentialName;
              foundName = true;
              break;
            }
          }
        }

        if (!foundName) {
          const capitalizedWords = finalTranscript.split(' ').filter(w => w && w[0] === w[0].toUpperCase());
          if (capitalizedWords.length >= 2) {
            newForm.name = capitalizedWords.slice(0, 2).join(' ');
          }
        }

        setManualForm(newForm);
        
        if (lowerResult.includes('done') || lowerResult.includes('finish') || lowerResult.includes('save')) {
          recognition.stop();
          setActiveTab('manual');
          setMessage({ type: 'success', text: 'Voice capture complete! Feel free to edit.' });
        }
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Recognition start error:', err);
      setIsListening(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500">Create, import, and manage campus members</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar max-w-full">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'manual' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >Manual</button>
          <button 
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'bulk' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >Bulk Import</button>
          <button 
            onClick={() => setActiveTab('voice')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'voice' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >Voice-to-Form</button>
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >View Users</button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
          >
            {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto hover:opacity-70"><X size={18} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="p-8 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">{isEditMode ? 'Edit User' : 'Create New User'}</h3>
              {isEditMode && (
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditMode(false);
                    setManualForm({ id: '', name: '', email: '', phone: '', role: Role.STUDENT, branch: BRANCHES[0], year: YEARS[0] });
                  }}
                  className="text-gray-500 hover:text-red-500 flex items-center gap-1 text-sm font-bold"
                >
                  <RotateCcw size={16} /> Cancel Edit
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Full Name</label>
                <input 
                  type="text" required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={manualForm.name}
                  onChange={e => setManualForm({...manualForm, name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Email Address</label>
                <input 
                  type="email" required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={manualForm.email}
                  disabled={isEditMode}
                  onChange={e => setManualForm({...manualForm, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Phone Number</label>
                <input 
                  type="tel" required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={manualForm.phone}
                  onChange={e => setManualForm({...manualForm, phone: e.target.value})}
                  placeholder="10-15 digits"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Role</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={manualForm.role}
                  onChange={e => setManualForm({...manualForm, role: e.target.value as Role})}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Branch</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={manualForm.branch}
                  onChange={e => setManualForm({...manualForm, branch: e.target.value})}
                >
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Year</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={manualForm.year}
                  onChange={e => setManualForm({...manualForm, year: e.target.value})}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update User' : 'Create User')}
            </button>
          </form>
        )}

        {activeTab === 'list' && (
          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search name or email..."
                  className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <select 
                  className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select 
                  className="px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="border rounded-2xl overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b text-xs uppercase tracking-wider font-bold text-gray-500">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role / Branch</th>
                      <th className="px-6 py-4">Contact</th>
                      <th className="px-6 py-4">Year</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <Activity className="animate-spin text-indigo-500" size={20} />
                            Loading users...
                          </div>
                        </td>
                      </tr>
                    ) : userList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          No users found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      userList.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{user.name}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${
                                user.role === Role.SUPER_ADMIN ? 'bg-red-100 text-red-700' :
                                user.role === Role.SUB_ADMIN ? 'bg-orange-100 text-orange-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {user.role}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">{user.branch}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                            {user.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-gray-700">
                            {user.year || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditUser(user)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit User"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y">
                {isLoadingUsers ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <Activity className="animate-spin text-indigo-500 mx-auto mb-2" size={24} />
                    Loading users...
                  </div>
                ) : userList.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    No users found matching your criteria.
                  </div>
                ) : (
                  userList.map(user => (
                    <div key={user.id} className="p-4 space-y-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Role & Branch</p>
                          <p className="font-medium text-gray-900">{user.role}</p>
                          <p className="text-gray-500">{user.branch}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Contact</p>
                          <p className="text-gray-900">{user.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-bold uppercase tracking-wider mb-1">Year</p>
                          <p className="text-gray-900">{user.year || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border">
                <div className="text-sm text-gray-500 font-medium">
                  Showing {userList.length} of {totalUsers} users
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="px-4 py-2 text-sm font-bold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="p-8 space-y-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer group"
            >
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload CSV File</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                CSV should have headers: name, email, phone, role, branch, year
              </p>
            </div>

            {bulkErrors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-2">
                <h4 className="font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle size={18} />
                  Validation Errors
                </h4>
                <ul className="text-sm text-red-600 list-disc list-inside">
                  {bulkErrors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {bulkErrors.length > 5 && <li>And {bulkErrors.length - 5} more...</li>}
                </ul>
              </div>
            )}

            {bulkData.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Preview ({bulkData.length} users)</h3>
                  <button 
                    onClick={() => setBulkData([])}
                    className="text-red-600 hover:text-red-700 text-sm font-bold flex items-center gap-1"
                  >
                    <Trash2 size={16} /> Clear
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-bold">Name</th>
                        <th className="px-4 py-2 font-bold">Email</th>
                        <th className="px-4 py-2 font-bold">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bulkData.slice(0, 50).map((u, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2">{u.name}</td>
                          <td className="px-4 py-2">{u.email}</td>
                          <td className="px-4 py-2">{u.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button 
                  onClick={handleBulkSubmit}
                  disabled={isSubmitting || bulkErrors.length > 0}
                  className="w-full px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing...' : 'Start Bulk Import'}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="p-12 text-center space-y-6">
            <div className="relative inline-block">
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-indigo-400/20 animate-ping"></span>
              )}
              <button 
                onClick={startVoiceCapture}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all relative z-10 ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-200' : 'bg-indigo-100 text-indigo-600 hover:scale-105 shadow-indigo-100'} shadow-2xl`}
              >
                {isListening ? (
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-6 bg-white rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-10 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-6 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                ) : (
                  <Mic size={40} />
                )}
              </button>
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {isListening ? 'Listening for details...' : 'Push to Speak'}
              </h3>
              <p className="text-gray-500 mb-8">
                {isListening 
                  ? 'Tell us the user\'s name, email, and phone number...' 
                  : 'Say something like: "Add John Smith with email john@univ.edu and phone 9876543210"'}
              </p>
              
              {transcript && (
                <div className="p-6 bg-gray-50 rounded-2xl border text-left italic text-gray-700 relative">
                  <span className="absolute -top-3 left-4 bg-white px-2 text-xs font-bold text-gray-400 uppercase tracking-widest">Transcript</span>
                  "{transcript}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm mb-4">
            <Users size={24} />
          </div>
          <h4 className="font-bold text-gray-900 mb-1">Standard Roles</h4>
          <p className="text-sm text-gray-600">Students and Faculty are verified via campus email domains.</p>
        </div>
        <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-violet-600 shadow-sm mb-4">
            <FileText size={24} />
          </div>
          <h4 className="font-bold text-gray-900 mb-1">CSV Template</h4>
          <p className="text-sm text-gray-600">Ensure your CSV matches exactly the headers required for seamless import.</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-4">
            <Activity size={24} />
          </div>
          <h4 className="font-bold text-gray-900 mb-1">Activity Tracking</h4>
          <p className="text-sm text-gray-600">All user creations are logged and visible to higher-level administrators.</p>
        </div>
      </div>
    </div>
  );
}
