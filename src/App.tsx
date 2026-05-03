import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { 
  LayoutDashboard, 
  Rss, 
  Users, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut,
  Bell,
  CheckCircle,
  X,
  Menu,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext.js';
import { motion, AnimatePresence } from 'motion/react';
import { AIAssistant } from './components/AIAssistant.js';
import { api } from './services/api.js';
import { formatDistanceToNow } from 'date-fns';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Feed from './pages/Feed.js';
import Dashboard from './pages/Dashboard.js';
import Directory from './pages/Directory.js';
import Chat from './pages/Chat.js';
import Academic from './pages/Academic.js';
import AdminDashboard from './pages/AdminDashboard.js';
import Groups from './pages/Groups.js';

const Sidebar = ({ isOpen, onClose, onOpenAI }: { isOpen: boolean, onClose: () => void, onOpenAI: () => void }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Rss, label: 'Campus Feed', path: '/feed' },
    { icon: Users, label: 'Directory', path: '/directory' },
    { icon: MessageSquare, label: 'Messages', path: '/chat' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: Calendar, label: 'Academic', path: '/academic' },
  ];

  if (user?.role === 'Sub Admin' || user?.role === 'Super Admin') {
    navItems.push({ icon: Settings, label: 'Admin Panel', path: '/admin' });
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Desktop/Tablet Sidebar */}
      <div className={`w-64 bg-white border-r h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200">S</div>
            Smart Campus
          </h1>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-indigo-600 p-2 rounded-lg hover:bg-indigo-50 transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              <span className="font-semibold">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => {
              onOpenAI();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all font-bold group"
          >
            <div className="w-6 h-6 bg-indigo-100 rounded flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Sparkles size={14} />
            </div>
            <span>AI Campus Coach</span>
          </button>
        </nav>

        <div className="p-4 border-t bg-gray-50/50">
          <div className="flex items-center justify-between mb-4 px-3">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Appearance</span>
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-all active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-white rounded-xl border border-gray-100">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold uppercase overflow-hidden ring-2 ring-white">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name[0]}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate text-gray-900">{user?.name}</p>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-all font-bold text-sm"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50 flex items-center justify-around px-2 pb-safe-area-inset-bottom h-16 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all p-2 rounded-xl h-full justify-center min-w-[64px] ${
              location.pathname === item.path
                ? 'text-indigo-600 scale-110'
                : 'text-gray-400'
            }`}
          >
            <item.icon size={22} strokeWidth={location.pathname === item.path ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
};

const Header = ({ onOpenSidebar }: { onOpenSidebar: () => void }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    if (user) {
      loadNotifications();
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}`);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', userId: user.id }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          setNotifications(prev => [data.data, ...prev]);
        }
      };

      return () => ws.close();
    }
  }, [user]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 w-full backdrop-blur-md bg-white/80">
      <div className="flex items-center gap-4">
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-indigo-600 transition-colors focus:outline-none"
        >
          <Menu size={24} />
        </button>
        <div className="flex flex-col">
          <h2 className="text-gray-900 font-bold text-sm md:text-lg truncate max-w-[150px] sm:max-w-[200px] md:max-w-none">
            {location.pathname === '/' ? 'Dashboard' : 
             location.pathname === '/feed' ? 'Campus Feed' :
             location.pathname === '/directory' ? 'Directory' :
             location.pathname === '/chat' ? 'Messages' :
             location.pathname === '/groups' ? 'Groups' :
             location.pathname === '/academic' ? 'Academic' :
             location.pathname === '/admin' ? 'Admin Panel' : 'SCC'}
          </h2>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider md:hidden">Smart Campus</p>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-[calc(100vw-2rem)] md:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
              >
                <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-indigo-600 font-bold hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`p-4 border-b last:border-0 hover:bg-gray-50 transition-colors cursor-pointer relative group ${!notification.read ? 'bg-indigo-50/30' : ''}`}
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        {!notification.read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            notification.type === 'message' ? 'bg-blue-100 text-blue-600' : 
                            notification.type === 'connection_request' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {notification.type === 'message' ? <MessageSquare size={16} /> : <Users size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">{notification.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notification.content}</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-medium">
                              {formatDistanceToNow(new Date(notification.created_at))} ago
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Bell className="text-gray-300" size={24} />
                      </div>
                      <p className="text-sm text-gray-500 font-medium italic">No notifications yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="hidden md:block h-8 w-[1px] bg-gray-200"></div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Session</p>
          <p className="text-sm font-medium text-gray-600">2024-2025</p>
        </div>
      </div>
    </header>
  );
};

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = React.useState(false);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onOpenAI={() => setAiAssistantOpen(true)}
      />
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 pb-16 lg:pb-0">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={window.location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
      <AIAssistant isOpen={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedLayout>
                  <Dashboard />
                </ProtectedLayout>
              }
            />
            <Route
              path="/feed"
              element={
                <ProtectedLayout>
                  <Feed />
                </ProtectedLayout>
              }
            />
            <Route
              path="/directory"
              element={
                <ProtectedLayout>
                  <Directory />
                </ProtectedLayout>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedLayout>
                  <Chat />
                </ProtectedLayout>
              }
            />
            <Route
              path="/academic"
              element={
                <ProtectedLayout>
                  <Academic />
                </ProtectedLayout>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedLayout>
                  <Groups />
                </ProtectedLayout>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedLayout>
                  <AdminDashboard />
                </ProtectedLayout>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
