import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Users, 
  Rss, 
  Calendar, 
  MessageSquare,
  TrendingUp,
  UserCheck,
  Flag,
  ArrowUpRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    { label: 'Connections', value: '124', icon: Users, color: 'indigo-500' },
    { label: 'Campus Rank', value: '#42', icon: TrendingUp, color: 'green-500' },
    { label: 'Attendance', value: '88%', icon: UserCheck, color: 'blue-500' },
    { label: 'Pending Task', value: '3', icon: Flag, color: 'amber-500' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">Hello, {user?.name}!</h1>
        <p className="text-sm md:text-base text-gray-500 mt-1">Welcome back to your campus workspace.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4"
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600`}>
              <stat.icon size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-sm text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-bold">Upcoming Sessions</h3>
              <button className="text-indigo-600 text-xs md:text-sm font-bold flex items-center gap-1 hover:underline">View All <ArrowUpRight size={14} /></button>
            </div>
            <div className="space-y-3 md:space-y-4">
              {[
                { time: '09:00 AM', subject: 'Advanced Algorithms', faculty: 'Dr. Sarah Wilson' },
                { time: '11:15 AM', subject: 'Machine Learning', faculty: 'Prof. David Chen' },
                { time: '02:00 PM', subject: 'Systems Design', faculty: 'Dr. Alex Reed' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-3 p-4 rounded-2xl bg-gray-50/50 hover:bg-indigo-50/50 transition-all border border-transparent hover:border-indigo-100 group">
                  <div className="bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-xs text-center min-w-[100px] flex sm:flex-col items-center justify-between sm:justify-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Starts</p>
                    <p className="text-sm font-bold text-indigo-600">{item.time}</p>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors text-sm md:text-base">{item.subject}</h4>
                    <p className="text-xs md:text-sm text-gray-500">{item.faculty}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg uppercase tracking-widest ring-1 ring-green-200">Ongoing</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-2xl p-5 md:p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3 md:gap-4 relative z-10">
              {[
                { label: 'Feed', icon: Rss, color: 'bg-white/10' },
                { label: 'Messages', icon: MessageSquare, color: 'bg-white/10' },
                { label: 'Academic', icon: Calendar, color: 'bg-white/10' },
                { label: 'Directory', icon: Users, color: 'bg-white/10' },
              ].map((item) => (
                <button key={item.label} className={`${item.color} p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-white/20 transition-all active:scale-95 border border-white/5`}>
                  <item.icon size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <h3 className="text-lg font-bold">Campus Notices</h3>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Library Renovation', date: 'Oct 12', tag: 'Infrastructure' },
                { title: 'Tech Expo 2024', date: 'Oct 15', tag: 'Events' },
                { title: 'Exam Registration', date: 'Oct 18', tag: 'Academic' },
              ].map((notice, i) => (
                <div key={i} className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 ring-4 ring-indigo-50"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 truncate">{notice.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{notice.date}</p>
                      <span className="text-[8px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">{notice.tag}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
