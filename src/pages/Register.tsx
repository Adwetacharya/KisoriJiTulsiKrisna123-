import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Role, BRANCHES } from '../types.js';
import { motion } from 'motion/react';
import { CheckCircle, ShieldCheck, Mail, X } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: Role.STUDENT,
    branch: BRANCHES[0]
  });
  
  const [inviteUser, setInviteUser] = useState<any>(null);
  const [verifying, setVerifying] = useState(!!token);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await api.auth.verifyInvite(token!);
      setInviteUser(res.user);
      setFormData(prev => ({
        ...prev,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
        branch: res.user.branch
      }));
    } catch (err: any) {
      setError('This invitation link is invalid or has expired.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (token) {
        // Complete Invitation
        await api.auth.completeInvite({ token, password: formData.password });
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        // Normal Registration
        const res = await api.auth.register(formData);
        if (res.error) throw new Error(res.error);
        login(res.token, res.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-12 rounded-3xl shadow-2xl text-center flex flex-col items-center max-w-md w-full"
        >
          <div className="bg-green-100 p-4 rounded-full mb-6">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Account Activated!</h2>
          <p className="text-gray-500 mb-8 font-medium">Your password has been set. Redirecting you to login...</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 3 }}
              className="bg-green-500 h-full"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-indigo-600 h-1/2 -z-10 rounded-b-[4rem]" />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="bg-white p-8 pb-4 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100">
            {token ? <ShieldCheck size={32} /> : <Mail size={32} />}
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {token ? 'Complete Join' : 'Join SCC'}
          </h1>
          <p className="text-gray-500 mt-2 font-medium">
            {token ? 'Securely set your campus password' : 'Create your campus account'}
          </p>
        </div>

        <div className="px-8 pb-8">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-2xl mb-6 text-sm font-bold border border-red-100 flex items-center gap-3">
              <div className="bg-red-200 p-1 rounded-full"><X size={12} /></div>
              {error}
            </div>
          )}

          {token && inviteUser && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
              <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Invitation For</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-indigo-600 shadow-sm border border-indigo-100">
                  {inviteUser.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{inviteUser.name}</h4>
                  <p className="text-xs text-indigo-600">{inviteUser.role} • {inviteUser.branch}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!token && (
              <>
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-2 ml-1">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-5 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none font-medium transition-all text-sm md:text-base"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-2 ml-1">Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="name@university.edu"
                    className="w-full px-5 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none font-medium transition-all text-sm md:text-base"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 md:mb-2 ml-1">
                {token ? 'New Secure Password' : 'Password'}
              </label>
              <input
                required
                type="password"
                className="w-full px-5 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none font-medium transition-all text-sm md:text-base"
                placeholder={token ? 'Minimum 8 characters' : '••••••••'}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {!token && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Role</label>
                  <select
                    className="w-full px-4 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none font-bold text-sm transition-all"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                  >
                    {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Branch</label>
                  <select
                    className="w-full px-4 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none font-bold text-sm transition-all"
                    value={formData.branch}
                    onChange={e => setFormData({ ...formData, branch: e.target.value })}
                  >
                    {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={token && error}
              className="w-full bg-indigo-600 text-white py-3 md:py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 text-sm md:text-base"
            >
              {token ? 'Activate Account' : 'Create My Account'}
            </button>
          </form>

          <p className="text-center mt-8 text-gray-400 font-bold text-sm">
            {token ? (
              <Link to="/login" className="text-indigo-600 hover:underline">Back to Login</Link>
            ) : (
              <>Already have an account? <Link to="/login" className="text-indigo-600 hover:underline">Sign In</Link></>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
