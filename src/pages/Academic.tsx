import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Role, BRANCHES } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { 
  FileText, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types.js';

export default function Academic() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'timetable' | 'complaints' | 'leave'>('timetable');
  const [timetable, setTimetable] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [complaintForm, setComplaintForm] = useState({ title: '', description: '' });
  
  // Leave State
  const [leaves, setLeaves] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ reason: '', start_date: '', end_date: '' });

  // Absence State
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenceStatus, setAbsenceStatus] = useState<{ message: string; sub?: string } | null>(null);
  const [absenceReports, setAbsenceReports] = useState<any[]>([]);

  // Timetable Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    branch: user?.branch || BRANCHES[0],
    year: '3',
    section: 'A',
    day: 'Monday',
    slots: [] as any[]
  });
  const [faculties, setFaculties] = useState<User[]>([]);

  const isAuthorizedToEdit = user && [
    Role.HOD, Role.VICE_PRINCIPAL, Role.PRINCIPAL, Role.SUB_ADMIN, Role.SUPER_ADMIN
  ].includes(user.role as Role);

  const isFaculty = user?.role === Role.FACULTY;

  useEffect(() => {
    if (activeTab === 'complaints') loadComplaints();
    if (activeTab === 'timetable') loadTimetable();
    if (activeTab === 'leave') loadLeaves();
    if (activeTab === 'absence' && isAuthorizedToEdit) loadAbsences();
    if (isAuthorizedToEdit) loadFaculties();
  }, [activeTab]);

  const loadAbsences = async () => {
    const data = await api.academic.getAbsences();
    setAbsenceReports(data);
  };

  const loadFaculties = async () => {
    const data = await api.users.search('role=Faculty');
    setFaculties(data);
  };

  const loadTimetable = async () => {
    const data = await api.academic.getTimetable(`branch=${user?.branch}&year=3&section=A`);
    setTimetable(data);
    if (data?.schedule_json) {
      setEditForm(prev => ({ ...prev, slots: JSON.parse(data.schedule_json) }));
    }
  };

  const handleSaveTimetable = async () => {
    await api.academic.postTimetable(editForm);
    setIsEditing(false);
    loadTimetable();
  };

  const addSlot = () => {
    setEditForm({
      ...editForm,
      slots: [...editForm.slots, { time: '09:00 AM', subject: '', faculty_id: '', faculty_name: '' }]
    });
  };

  const removeSlot = (index: number) => {
    const newSlots = [...editForm.slots];
    newSlots.splice(index, 1);
    setEditForm({ ...editForm, slots: newSlots });
  };

  const updateSlot = (index: number, field: string, value: string) => {
    const newSlots = [...editForm.slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    if (field === 'faculty_id') {
      const fac = faculties.find(f => f.id === value);
      newSlots[index].faculty_name = fac?.name || '';
    }
    setEditForm({ ...editForm, slots: newSlots });
  };

  const loadComplaints = async () => {
    const data = await api.academic.getComplaints();
    setComplaints(data);
  };

  const loadLeaves = async () => {
    const data = await api.academic.getLeaves();
    setLeaves(data);
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.academic.submitComplaint(complaintForm);
    setComplaintForm({ title: '', description: '' });
    loadComplaints();
  };

  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.academic.reportAbsence(absenceDate);
      setAbsenceStatus({ 
        message: res.message, 
        sub: res.substituteAssigned ? 'A substitute has been automatically assigned to your sessions.' : 'No substitute found for that date.' 
      });
      if (isAuthorizedToEdit) loadAbsences();
    } catch (err: any) {
      setAbsenceStatus({ message: 'Error: ' + err.message });
    }
  };

  const handleAssignSub = async (absenceId: string, subId: string) => {
    await api.academic.assignSubstitute(absenceId, subId);
    loadAbsences();
  };

  const handleComplaintStatusUpdate = async (id: string, status: string) => {
    await api.academic.updateComplaintStatus(id, status);
    loadComplaints();
  };

  const handleLeaveStatusUpdate = async (id: string, status: string) => {
    await api.academic.updateLeaveStatus(id, status);
    loadLeaves();
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.academic.submitLeave(leaveForm);
    setLeaveForm({ reason: '', start_date: '', end_date: '' });
    setShowLeaveForm(false);
    loadLeaves();
  };

  const tabs = ['timetable', 'complaints', 'leave', ...(isFaculty || isAuthorizedToEdit ? ['absence'] : [])];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-2 md:gap-4 border-b pb-1 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-3 md:px-4 py-2 font-medium capitalize transition-colors relative shrink-0 ${
              activeTab === tab ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-sm md:text-base">{tab === 'absence' ? 'Report Absence' : tab}</span>
            {activeTab === tab && (
              <motion.div layoutId="activeTab" className="absolute bottom-[-5px] left-0 right-0 h-[2px] bg-indigo-600" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'timetable' && (
          <motion.div key="tt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl border p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold">Class Schedule</h3>
              <div className="flex items-center gap-2 md:gap-3">
                {isAuthorizedToEdit && (
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold transition-colors ${
                      isEditing ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    {isEditing ? <><X size={16} /> Cancel</> : <><Edit3 size={16} /> Edit</>}
                  </button>
                )}
                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs md:text-sm font-bold shrink-0">Semester 6</span>
              </div>
            </div>
            
            {isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-dashed text-xs md:text-sm">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">Branch</label>
                    <select 
                      className="w-full bg-white border rounded-lg px-2 md:px-3 py-1.5 md:py-2"
                      value={editForm.branch}
                      onChange={e => setEditForm({ ...editForm, branch: e.target.value })}
                    >
                      {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">Day</label>
                    <select 
                      className="w-full bg-white border rounded-lg px-2 md:px-3 py-1.5 md:py-2"
                      value={editForm.day}
                      onChange={e => setEditForm({ ...editForm, day: e.target.value })}
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">Year</label>
                    <input 
                      className="w-full bg-white border rounded-lg px-2 md:px-3 py-1.5 md:py-2"
                      value={editForm.year}
                      onChange={e => setEditForm({ ...editForm, year: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase mb-1">Section</label>
                    <input 
                      className="w-full bg-white border rounded-lg px-2 md:px-3 py-1.5 md:py-2"
                      value={editForm.section}
                      onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {editForm.slots.map((slot, i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-end bg-white border p-4 rounded-xl shadow-sm relative">
                      <div className="w-full md:w-32">
                        <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1">Time</label>
                        <input 
                          placeholder="09:00 AM"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          value={slot.time}
                          onChange={e => updateSlot(i, 'time', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1">Subject</label>
                        <input 
                          placeholder="e.g. Algorithms"
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          value={slot.subject}
                          onChange={e => updateSlot(i, 'subject', e.target.value)}
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <label className="block text-[10px] md:text-xs font-bold text-gray-400 mb-1">Faculty</label>
                        <select 
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          value={slot.faculty_id}
                          onChange={e => updateSlot(i, 'faculty_id', e.target.value)}
                        >
                          <option value="">Select Faculty</option>
                          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                      <button 
                        onClick={() => removeSlot(i)}
                        className="absolute top-2 right-2 md:static p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={addSlot}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all font-bold flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <Plus size={20} /> Add Slot
                  </button>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSaveTimetable}
                    className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg"
                  >
                    <Save size={20} /> Save Schedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {timetable?.schedule_json ? JSON.parse(timetable.schedule_json).map((slot: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 md:gap-6 p-4 rounded-lg border hover:border-indigo-200 transition-colors bg-gray-50/30 min-w-0">
                    <div className="w-20 md:w-24 font-mono font-bold text-xs md:text-sm text-indigo-600 shrink-0">{slot.time}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm md:text-base truncate">{slot.subject}</p>
                      <p className="text-xs md:text-sm text-gray-500 truncate">{slot.faculty_name || 'TBA'}</p>
                    </div>
                    <ChevronRight className="text-gray-300 shrink-0" size={18} />
                  </div>
                )) : (
                  <div className="p-12 text-center text-gray-400 italic">No classes scheduled for today</div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'complaints' && (
          <motion.div key="cp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border p-6 sticky top-24">
                <h3 className="text-xl font-bold mb-4">Submit a Complaint</h3>
                <form onSubmit={handleSubmitComplaint} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={complaintForm.title}
                      onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                    <textarea
                      required
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                      value={complaintForm.description}
                      onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">
                    Submit Report
                  </button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold px-2">
                {isAuthorizedToEdit ? 'Manage Complaints' : 'Your Submissions'}
              </h3>
              {complaints.map(cp => (
                <div key={cp.id} className="bg-white p-6 rounded-xl border flex gap-4">
                   <div className={`mt-1 p-2 rounded-full ${
                    cp.status === 'Resolved' || cp.status === 'resolved' ? 'bg-green-50 text-green-600' : 
                    cp.status === 'In-Progress' ? 'bg-yellow-50 text-yellow-600' : 
                    'bg-orange-50 text-orange-600'
                  }`}>
                    {cp.status === 'Resolved' || cp.status === 'resolved' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900">{cp.title}</h4>
                      {isAuthorizedToEdit ? (
                        <select 
                          className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded border-none appearance-none cursor-pointer outline-none bg-gray-50 hover:bg-gray-100"
                          value={cp.status}
                          onChange={(e) => handleComplaintStatusUpdate(cp.id, e.target.value)}
                        >
                          <option value="Open">Open</option>
                          <option value="In-Progress">In-Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded ${
                          cp.status === 'Resolved' || cp.status === 'resolved' ? 'bg-green-100 text-green-800' : 
                          cp.status === 'In-Progress' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {cp.status}
                        </span>
                      )}
                    </div>
                    {isAuthorizedToEdit && <p className="text-xs text-gray-400 mb-2">Submitted by: {cp.user_name}</p>}
                    <p className="text-gray-600 text-sm">{cp.description}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1"><Clock size={14} /> Created: {cp.created_at.split(' ')[0]}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'leave' && (
          <motion.div key="lv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border shadow-sm">
              <div>
                <h3 className="text-xl font-bold">Leave Requests</h3>
                <p className="text-sm text-gray-500">
                  {isAuthorizedToEdit ? 'Review and manage leave applications from staff and students.' : 'Track the status of your leave applications.'}
                </p>
              </div>
              {!isAuthorizedToEdit && (
                <button 
                  onClick={() => setShowLeaveForm(true)}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
                >
                  New Application
                </button>
              )}
            </div>

            {showLeaveForm && !isAuthorizedToEdit && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl border shadow-sm max-w-xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-bold text-lg">Leave Application</h4>
                  <button onClick={() => setShowLeaveForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmitLeave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Reason</label>
                    <textarea 
                      required
                      placeholder="e.g. Medical emergency, Family function"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                      value={leaveForm.reason}
                      onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={leaveForm.start_date}
                        onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">End Date</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={leaveForm.end_date}
                        onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100">
                    Submit Application
                  </button>
                </form>
              </motion.div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {leaves.map((lv) => (
                <div key={lv.id} className="bg-white p-6 rounded-xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <CalendarIcon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{isAuthorizedToEdit ? lv.user_name : 'Leave Request'}</h4>
                        {isAuthorizedToEdit && <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{lv.user_role}</span>}
                      </div>
                      <p className="text-gray-600 text-sm">{lv.reason}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs font-medium text-gray-400">
                        <span className="flex items-center gap-1"><Clock size={14} /> {lv.start_date} to {lv.end_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                      lv.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                      lv.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {lv.status}
                    </span>
                    
                    {isAuthorizedToEdit && lv.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleLeaveStatusUpdate(lv.id, 'Approved')}
                          className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleLeaveStatusUpdate(lv.id, 'Rejected')}
                          className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {leaves.length === 0 && (
                <div className="bg-white rounded-xl border p-12 text-center text-gray-400 italic">
                  No leave requests found.
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'absence' && (
          <motion.div key="abs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {isFaculty && (
              <div className="bg-white rounded-xl border p-8 max-w-2xl mx-auto shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Report Absence</h3>
                    <p className="text-sm text-gray-500">Quickly report your absence to trigger the automated substitute system.</p>
                  </div>
                </div>

                <form onSubmit={handleReportAbsence} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Date of Absence</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                      value={absenceDate}
                      onChange={e => setAbsenceDate(e.target.value)}
                    />
                  </div>

                  {absenceStatus && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-xl flex gap-3 ${
                        absenceStatus.message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {absenceStatus.message.includes('Error') ? <X size={20} /> : <CheckCircle2 size={20} />}
                      <div>
                        <p className="font-bold">{absenceStatus.message}</p>
                        <p className="text-sm mt-1">{absenceStatus.sub}</p>
                      </div>
                    </motion.div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                  >
                    Report and Find Substitute
                  </button>
                </form>
              </div>
            )}

            {isAuthorizedToEdit && (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-gray-50/50">
                  <h3 className="text-xl font-bold text-gray-900">Manage Absences</h3>
                  <p className="text-sm text-gray-500">Review and manually assign substitutes for faculty absences.</p>
                </div>
                
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Faculty</th>
                        <th className="px-6 py-4">Branch</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Current Substitute</th>
                        <th className="px-6 py-4">Assign Substitute</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {absenceReports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900">{report.faculty_name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{report.branch}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{report.date}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider ${
                              report.substitute_id ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {report.substitute_name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <select 
                              className="text-sm border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none w-full max-w-[200px]"
                              value={report.substitute_id || ''}
                              onChange={(e) => handleAssignSub(report.id, e.target.value)}
                            >
                              <option value="">Select Faculty</option>
                              {faculties.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden divide-y">
                  {absenceReports.map((report) => (
                    <div key={report.id} className="p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-900">{report.faculty_name}</p>
                          <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">{report.branch}</p>
                        </div>
                        <p className="text-xs font-bold text-gray-400">{report.date}</p>
                      </div>
                      
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Status</span>
                          <span className={`px-2 py-1 rounded inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider ${
                            report.substitute_id ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {report.substitute_name || 'Unassigned'}
                          </span>
                        </div>
                        <div className="flex-1 max-w-[150px]">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block mb-1">Assign Sub</span>
                          <select 
                            className="text-xs border rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                            value={report.substitute_id || ''}
                            onChange={(e) => handleAssignSub(report.id, e.target.value)}
                          >
                            <option value="">Select Faculty</option>
                            {faculties.map(f => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {absenceReports.length === 0 && (
                  <div className="px-6 py-12 text-center text-gray-400 italic">
                    <FileText className="mx-auto mb-4 opacity-20" size={48} />
                    <p>No absence reports found</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
