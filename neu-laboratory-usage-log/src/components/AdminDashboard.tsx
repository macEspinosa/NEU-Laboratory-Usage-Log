import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../services/adminService';
import { FilterService } from '../services/filterService';
import { UsageLog, UserProfile, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Clock, 
  Search, 
  ChevronRight, 
  Ban, 
  CheckCircle,
  TrendingUp,
  History,
  DoorOpen,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  UserCog,
  LogOut,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Trash2,
  AlertTriangle,
  QrCode,
  Download,
  X,
  Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO, startOfDay, subDays, eachDayOfInterval, isSameDay, subMonths, startOfMonth, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface AdminDashboardProps {
  currentRoom: string;
  setCurrentRoom: (room: string) => void;
  rooms: string[];
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export default function AdminDashboard({ currentRoom, setCurrentRoom, rooms, theme, setTheme }: AdminDashboardProps) {
  const [allLogs, setAllLogs] = useState<UsageLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [trendTimeframe, setTrendTimeframe] = useState<'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'faculty' | 'rooms' | 'settings'>('overview');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [promotionStatus, setPromotionStatus] = useState<{ success: boolean, message: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [selectedUserForQr, setSelectedUserForQr] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (showSaveSuccess) {
      const timer = setTimeout(() => setShowSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSaveSuccess]);

  useEffect(() => {
    const unsubscribeLogs = adminService.subscribeToLogs((logs) => {
      setAllLogs(logs);
      setLoading(false);
    });

    const unsubscribeUsers = adminService.subscribeToUsers((usersData) => {
      setUsers(usersData);
    });

    return () => {
      unsubscribeLogs();
      unsubscribeUsers();
    };
  }, []);

  const handleToggleBlock = async (uid: string, currentStatus: boolean) => {
    await adminService.toggleUserBlockStatus(uid, currentStatus);
  };

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
    await adminService.updateUserRole(uid, newRole);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    const result = await adminService.deleteUser(userToDelete.uid);
    if (result.success) {
      setUserToDelete(null);
    }
  };

  const handlePromoteByEmail = async () => {
    if (!newAdminEmail.trim()) return;
    
    if (!newAdminEmail.endsWith('@neu.edu.ph')) {
      setPromotionStatus({ success: false, message: "Please use an institutional email (@neu.edu.ph)" });
      return;
    }
    
    const result = await adminService.promoteUserByEmail(newAdminEmail.trim());
    setPromotionStatus(result);
    if (result.success) {
      setNewAdminEmail('');
    }
    
    setTimeout(() => setPromotionStatus(null), 5000);
  };

  const downloadQrCode = () => {
    if (!selectedUserForQr) return;
    const svg = document.getElementById('faculty-qr-code');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${selectedUserForQr.displayName.replace(/\s+/g, '_')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const filteredLogs = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return FilterService.filterLogs(allLogs, searchTerm, start, end);
  }, [allLogs, searchTerm, startDate, endDate]);

  const stats = useMemo(() => adminService.calculateStats(filteredLogs), [filteredLogs]);

  // Chart Data (Usage by Room)
  const chartData = useMemo(() => {
    const roomUsage = filteredLogs.reduce((acc: Record<string, number>, log) => {
      acc[log.roomNumber] = (acc[log.roomNumber] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(roomUsage).map(([name, value]) => ({ name, value: value as number }));
  }, [filteredLogs]);

  // Trend Data (Usage over time)
  const trendData = useMemo(() => {
    const now = new Date();
    const interval = trendTimeframe === 'week' 
      ? { start: subDays(now, 6), end: now }
      : { start: subDays(now, 29), end: now };

    const days = eachDayOfInterval(interval);

    return days.map(day => {
      const count = allLogs.filter(log => isSameDay(parseISO(log.timestamp), day)).length;
      return {
        date: format(day, trendTimeframe === 'week' ? 'EEE' : 'MMM d'),
        fullDate: format(day, 'MMM d, yyyy'),
        count
      };
    });
  }, [allLogs, trendTimeframe]);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'faculty', label: 'Faculty', icon: <Users className="w-4 h-4" /> },
    { id: 'rooms', label: 'Rooms', icon: <DoorOpen className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <UserCog className="w-4 h-4" /> },
  ];

  return (
    <div className={`flex flex-col lg:flex-row gap-10 min-h-[calc(100vh-12rem)] transition-colors duration-500 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>
      {/* Left Sidebar Navigation */}
      <aside className="lg:w-72 flex-shrink-0">
        <div className="lg:sticky lg:top-28 flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 lg:h-[calc(100vh-14rem)] no-scrollbar">
          <div className="flex-1 flex flex-row lg:flex-col gap-2 min-w-max lg:min-w-0">
            <div className="hidden lg:block px-4 mb-8">
              <h2 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Admin Console</h2>
              <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600'}`}>Management Suite v2.0</p>
            </div>

            <p className="hidden lg:block text-xs font-mono font-bold text-stone-500 uppercase tracking-widest px-4 mb-4">Core</p>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-3 px-4 py-3 lg:py-3.5 rounded-2xl transition-all border group whitespace-nowrap lg:w-full ${
                  activeTab === item.id 
                    ? (theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/5' : 'bg-stone-900 text-white border-stone-800 shadow-lg')
                    : (theme === 'dark' ? 'text-stone-500 border-transparent hover:text-stone-300 hover:bg-white/5' : 'text-stone-500 border-transparent hover:text-stone-900 hover:bg-stone-100')
                }`}
              >
                <div className={`p-2 rounded-xl transition-colors ${activeTab === item.id ? (theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white') : (theme === 'dark' ? 'bg-white/5 text-stone-600 group-hover:text-stone-400' : 'bg-stone-200 text-stone-500 group-hover:text-stone-700')}`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
                {activeTab === item.id && (
                  <div className={`hidden lg:block ml-auto w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] ${theme === 'dark' ? 'bg-emerald-500' : 'bg-white'}`} />
                )}
              </button>
            ))}

            <div className={`hidden lg:block mt-10 pt-10 border-t px-4 ${theme === 'dark' ? 'border-white/5' : 'border-stone-200'}`}>
              <div className={`rounded-2xl p-5 border relative overflow-hidden group/status ${theme === 'dark' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full group-hover/status:bg-emerald-500/10 transition-all" />
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">System Health</p>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500/50 animate-ping" />
                  </div>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-stone-300' : 'text-stone-700'}`}>Cloud Sync Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Footer / User Profile */}
          <div className={`hidden lg:flex mt-auto pt-6 border-t px-2 flex-col ${theme === 'dark' ? 'border-white/5' : 'border-stone-200'}`}>
            <div className={`flex items-center gap-3 p-3 rounded-2xl border mb-4 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-sm'}`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                A
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Administrator</p>
                <p className="text-xs text-stone-400 truncate">admin@neu.edu.ph</p>
              </div>
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all border border-transparent ${theme === 'dark' ? 'text-stone-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20' : 'text-stone-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200'}`}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <div className="flex-1 space-y-8">
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                title="Total Usage" 
                value={stats.totalUsage} 
                icon={<History className="w-5 h-5" />} 
                trend="Lifetime Volume" 
                color="emerald"
                theme={theme}
              />
              <StatCard 
                title="Top Professor" 
                value={stats.mostActiveProfessor} 
                icon={<Users className="w-5 h-5" />} 
                trend="Most Frequent" 
                color="indigo"
                isText
                theme={theme}
              />
              <StatCard 
                title="Active Rooms" 
                value={stats.activeRooms} 
                icon={<DoorOpen className="w-5 h-5" />} 
                trend="Unique Locations" 
                color="amber"
                theme={theme}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Main Log Table */}
              <div className="xl:col-span-2 space-y-6">
                <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden group transition-all duration-500 ${
                  theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
                }`}>
                  {/* Subtle accent glow */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-1000" />
                  
                  <div className="flex flex-col space-y-6 mb-10 relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div>
                        <h3 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Recent Activity</h3>
                        <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600'}`}>Live Feed</p>
                      </div>
                      <div className="relative group/search">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-stone-600 group-focus-within/search:text-emerald-500' : 'text-stone-400 group-focus-within/search:text-stone-900'}`} />
                        <input 
                          type="text" 
                          placeholder="Search records..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`pl-12 pr-6 py-3 rounded-2xl text-sm focus:ring-2 transition-all w-full sm:w-72 ${
                            theme === 'dark' 
                              ? 'bg-white/5 border border-white/10 text-white ring-emerald-500/20 placeholder:text-stone-700' 
                              : 'bg-stone-50 border border-stone-200 text-stone-900 ring-stone-900/10 placeholder:text-stone-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto relative z-10">
                    <table className="w-full">
                      <thead>
                        <tr className={`text-left border-b ${theme === 'dark' ? 'border-white/10' : 'border-stone-200'}`}>
                          <th className="pb-5 font-sans text-xs font-bold uppercase tracking-widest text-stone-500 pl-2">Professor</th>
                          <th className="pb-5 font-sans text-xs font-bold uppercase tracking-widest text-stone-500">Room</th>
                          <th className="pb-5 font-sans text-xs font-bold uppercase tracking-widest text-stone-500">Timestamp</th>
                          <th className="pb-5"></th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-stone-100'}`}>
                        {filteredLogs.slice(0, 10).map((log) => (
                          <tr key={log.id} className={`group transition-all cursor-default ${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-stone-50'}`}>
                            <td className="py-5 pl-2">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border transition-colors ${
                                  theme === 'dark' ? 'bg-stone-800 text-stone-400 border-white/5 group-hover:border-emerald-500/30' : 'bg-stone-100 text-stone-600 border-stone-200 group-hover:border-stone-400'
                                }`}>
                                  {log.userName.charAt(0)}
                                </div>
                                <div>
                                  <p className={`text-sm font-bold transition-colors ${theme === 'dark' ? 'text-stone-200 group-hover:text-white' : 'text-stone-700 group-hover:text-stone-900'}`}>{log.userName}</p>
                                  <p className="text-xs text-stone-500 font-mono uppercase tracking-tight">{log.entryMethod === 'qr' ? 'Verified QR' : 'Manual Entry'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-5">
                              <span className={`px-3 py-1.5 border rounded-xl text-xs font-mono font-bold tracking-widest transition-all ${
                                theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100'
                              }`}>
                                {log.roomNumber}
                              </span>
                            </td>
                            <td className="py-5">
                              <div className={`flex items-center gap-2 transition-colors ${theme === 'dark' ? 'text-stone-400 group-hover:text-stone-200' : 'text-stone-500 group-hover:text-stone-700'}`}>
                                <Clock className="w-4 h-4 opacity-60" />
                                <span className="text-sm font-medium">{format(parseISO(log.timestamp), 'MMM d, h:mm a')}</span>
                              </div>
                            </td>
                            <td className="py-5 text-right pr-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ml-auto ${theme === 'dark' ? 'group-hover:bg-emerald-500/10' : 'group-hover:bg-stone-200'}`}>
                                <ChevronRight className={`w-4 h-4 transition-colors ${theme === 'dark' ? 'text-stone-700 group-hover:text-emerald-400' : 'text-stone-400 group-hover:text-stone-900'}`} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    onClick={() => setActiveTab('history')}
                    className={`w-full mt-6 py-4 border-t text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${
                      theme === 'dark' ? 'border-white/5 text-stone-500 hover:text-emerald-400' : 'border-stone-100 text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    View All Activity
                  </button>
                </div>
              </div>

              {/* Sidebar: Charts */}
              <div className="space-y-8">
                {/* Usage Trend Chart */}
                <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden group transition-all duration-500 ${
                  theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
                }`}>
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-1000" />
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div>
                      <h3 className={`text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Usage Trends</h3>
                      <p className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Temporal Analysis</p>
                    </div>
                    <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-stone-100 border-stone-200'}`}>
                      <button 
                        onClick={() => setTrendTimeframe('week')}
                        className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${trendTimeframe === 'week' ? (theme === 'dark' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-stone-900 text-white shadow-md') : 'text-stone-500 hover:text-stone-300'}`}
                      >
                        7D
                      </button>
                      <button 
                        onClick={() => setTrendTimeframe('month')}
                        className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${trendTimeframe === 'month' ? (theme === 'dark' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-stone-900 text-white shadow-md') : 'text-stone-500 hover:text-stone-300'}`}
                      >
                        30D
                      </button>
                    </div>
                  </div>
                  <div className="h-48 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#ffffff05" : "#00000005"} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: theme === 'dark' ? '#57534e' : '#a8a29e', fontWeight: 500 }}
                          interval={trendTimeframe === 'week' ? 0 : 6}
                        />
                        <YAxis hide />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className={`p-4 rounded-2xl shadow-2xl border ${theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-stone-200'}`}>
                                  <p className={`text-[9px] font-mono uppercase tracking-widest mb-1 ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`}>{payload[0].payload.fullDate}</p>
                                  <p className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{payload[0].value} <span className="text-[10px] font-normal text-stone-600">Entries</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#10b981" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorCount)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Room Popularity Chart */}
                <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden group transition-all duration-500 ${
                  theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
                }`}>
                  <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-emerald-500/5 blur-[40px] rounded-full group-hover:bg-emerald-500/10 transition-all duration-1000" />
                  <div className="mb-8 relative z-10">
                    <h3 className={`text-lg font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Room Popularity</h3>
                    <p className={`text-[10px] font-mono uppercase tracking-widest ${theme === 'dark' ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Spatial Distribution</p>
                  </div>
                  <div className="h-64 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#ffffff05" : "#00000005"} />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: theme === 'dark' ? '#57534e' : '#a8a29e', fontWeight: 600 }} 
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: theme === 'dark' ? '#ffffff05' : '#00000005', radius: 8 }}
                          contentStyle={{ 
                            borderRadius: '20px', 
                            border: theme === 'dark' ? '1px solid #ffffff10' : '1px solid #00000010', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)', 
                            background: theme === 'dark' ? '#000' : '#fff', 
                            color: theme === 'dark' ? '#fff' : '#000' 
                          }}
                          itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={32}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden transition-all duration-500 ${
            theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
          }`}>
            <div className="flex flex-col space-y-6 mb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h3 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Full Usage History</h3>
                  <p className={`text-[10px] font-mono uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-emerald-500/60' : 'text-emerald-600'}`}>Archive</p>
                </div>
                <div className="relative group/search">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-stone-600 group-focus-within/search:text-emerald-500' : 'text-stone-400 group-focus-within/search:text-stone-900'}`} />
                  <input 
                    type="text" 
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pl-12 pr-6 py-3 rounded-2xl text-sm focus:ring-2 transition-all w-full sm:w-72 ${
                      theme === 'dark' 
                        ? 'bg-white/5 border border-white/10 text-white ring-emerald-500/20 placeholder:text-stone-700' 
                        : 'bg-stone-50 border border-stone-200 text-stone-900 ring-stone-900/10 placeholder:text-stone-400'
                    }`}
                  />
                </div>
              </div>

              {/* Date Filters */}
              <div className={`flex flex-wrap items-center gap-4 p-5 rounded-3xl border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-200'}`}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-stone-200 shadow-sm'}`}>
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Date Range</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 transition-all ${
                      theme === 'dark' ? 'bg-black border-white/10 text-white ring-emerald-500/20' : 'bg-white border-stone-200 text-stone-900 ring-stone-900/10'
                    }`}
                  />
                  <span className="text-stone-700 font-mono text-[10px]">TO</span>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 transition-all ${
                      theme === 'dark' ? 'bg-black border-white/10 text-white ring-emerald-500/20' : 'bg-white border-stone-200 text-stone-900 ring-stone-900/10'
                    }`}
                  />
                </div>
                {(startDate || endDate || searchTerm) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); setSearchTerm(''); }}
                    className={`text-[10px] font-bold uppercase transition-colors ml-auto px-4 py-2 rounded-xl border ${
                      theme === 'dark' ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 hover:text-emerald-300' : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Reset All
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-left border-b ${theme === 'dark' ? 'border-white/10' : 'border-stone-200'}`}>
                    <th className="pb-5 font-sans text-xs font-bold uppercase tracking-widest text-stone-500 pl-2">Professor</th>
                    <th className="pb-5 font-sans text-xs font-bold uppercase tracking-widest text-stone-500">Room</th>
                    <th className="pb-5 font-sans text-xs font-bold uppercase tracking-widest text-stone-500">Timestamp</th>
                    <th className="pb-5"></th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-stone-100'}`}>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className={`group transition-all cursor-default ${theme === 'dark' ? 'hover:bg-white/[0.03]' : 'hover:bg-stone-50'}`}>
                      <td className="py-5 pl-2">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm border transition-colors ${
                            theme === 'dark' ? 'bg-stone-800 text-stone-400 border-white/5 group-hover:border-emerald-500/30' : 'bg-stone-100 text-stone-600 border-stone-200 group-hover:border-stone-400'
                          }`}>
                            {log.userName.charAt(0)}
                          </div>
                          <div>
                            <p className={`text-sm font-bold transition-colors ${theme === 'dark' ? 'text-stone-200 group-hover:text-white' : 'text-stone-700 group-hover:text-stone-900'}`}>{log.userName}</p>
                            <p className="text-xs text-stone-500 font-mono uppercase tracking-tight">{log.entryMethod === 'qr' ? 'Verified QR' : 'Manual Entry'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <span className={`px-3 py-1.5 border rounded-xl text-xs font-mono font-bold tracking-widest transition-all ${
                          theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-emerald-100'
                        }`}>
                          {log.roomNumber}
                        </span>
                      </td>
                      <td className="py-5">
                        <div className={`flex items-center gap-2 transition-colors ${theme === 'dark' ? 'text-stone-400 group-hover:text-stone-200' : 'text-stone-500 group-hover:text-stone-700'}`}>
                          <Clock className="w-4 h-4 opacity-60" />
                          <span className="text-sm font-medium">{format(parseISO(log.timestamp), 'MMM d, h:mm a')}</span>
                        </div>
                      </td>
                      <td className="py-5 text-right pr-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ml-auto ${theme === 'dark' ? 'group-hover:bg-emerald-500/10' : 'group-hover:bg-stone-200'}`}>
                          <ChevronRight className={`w-4 h-4 transition-colors ${theme === 'dark' ? 'text-stone-700 group-hover:text-emerald-400' : 'text-stone-400 group-hover:text-stone-900'}`} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'faculty' && (
          <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden group transition-all duration-500 ${
            theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 relative z-10">
              <div>
                <h3 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Faculty Directory</h3>
                <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600'}`}>Access Control</p>
              </div>
              <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-stone-100 border-stone-200'}`}>
                <button 
                  onClick={() => setSearchTerm('')}
                  className={`px-4 py-1.5 text-xs font-bold uppercase rounded-lg transition-all ${theme === 'dark' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-stone-900 text-white shadow-md'}`}
                >
                  All Faculty
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {users.map((u) => (
                <div key={u.uid} className={`flex items-center justify-between p-6 rounded-3xl border transition-all group/user ${
                  theme === 'dark' ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border transition-colors ${
                        theme === 'dark' ? 'bg-stone-800 text-stone-400 border-white/5 group-hover/user:border-emerald-500/30' : 'bg-stone-200 text-stone-600 border-stone-300 group-hover/user:border-stone-400'
                      }`}>
                        {u.displayName.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${theme === 'dark' ? 'border-black' : 'border-white'} ${u.isBlocked ? 'bg-red-500' : 'bg-emerald-500'}`} />
                    </div>
                    <div>
                      <p className={`text-base font-bold transition-colors ${theme === 'dark' ? 'text-stone-200 group-hover/user:text-white' : 'text-stone-700 group-hover/user:text-stone-900'}`}>{u.displayName}</p>
                      <p className="text-xs text-stone-400 font-mono uppercase tracking-tight">{u.universityId || 'ID Pending'}</p>
                      <p className="text-xs text-stone-500 mt-1">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedUserForQr(u)}
                      className={`p-3 rounded-2xl transition-all ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}
                      title="Generate QR Code"
                    >
                      <QrCode className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleToggleBlock(u.uid, u.isBlocked)}
                      className={`p-3 rounded-2xl transition-all ${u.isBlocked ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                      title={u.isBlocked ? 'Unblock' : 'Block'}
                    >
                      {u.isBlocked ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden transition-all duration-500 ${
              theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
            }`}>
              <div className="mb-8">
                <h3 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Active Room Configuration</h3>
                <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600'}`}>System Control</p>
              </div>
              <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 transition-colors ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-colors ${
                    theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    <DoorOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-400">Current Scanner Room</p>
                    <p className={`text-2xl font-bold tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{currentRoom}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select 
                    value={currentRoom}
                    onChange={(e) => setCurrentRoom(e.target.value)}
                    className={`flex-1 md:w-48 border rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none transition-all ${
                      theme === 'dark' ? 'bg-black border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  >
                    {rooms.map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                  <div className="px-4 py-3 bg-emerald-500 text-black text-xs font-bold rounded-xl uppercase tracking-widest">
                    Live
                  </div>
                </div>
              </div>
            </div>

            <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden transition-all duration-500 ${
              theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
            }`}>
              <div className="mb-8">
                <h3 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Room Analytics</h3>
                <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600'}`}>Spatial Utilization</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {chartData.map((room) => (
                  <div key={room.name} className={`p-6 rounded-3xl border transition-all group/room ${
                    theme === 'dark' ? 'bg-white/5 border-white/10 hover:border-emerald-500/30' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
                        theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        <DoorOpen className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-mono font-bold text-stone-400 uppercase tracking-widest">Room {room.name}</span>
                    </div>
                    <h4 className={`text-3xl font-bold mb-1 transition-colors ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{room.value}</h4>
                    <p className="text-sm text-stone-500 mb-4">Total Entries</p>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-stone-200'}`}>
                      <div 
                        className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                        style={{ width: `${Math.min((room.value / stats.totalUsage) * 100 * 2, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={`backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl border relative overflow-hidden transition-all duration-500 ${
            theme === 'dark' ? 'bg-emerald-950/20 border-white/20' : 'bg-white border-stone-300 shadow-xl'
          }`}>
            <div className="mb-8">
              <h3 className={`text-2xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>System Settings</h3>
              <p className={`text-xs font-mono uppercase tracking-widest mt-1 ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600'}`}>Configuration</p>
            </div>
            <div className="space-y-6">
              <div className={`p-6 rounded-3xl border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-stone-50 border-stone-200'}`}>
                <h4 className={`text-sm font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Appearance</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-stone-300' : 'text-stone-700'}`}>Theme Mode</p>
                    <p className="text-xs text-stone-500">Switch between dark and light dashboard</p>
                  </div>
                  <div className={`flex p-1 rounded-xl border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-stone-100 border-stone-200'}`}>
                    <button 
                      onClick={() => setTheme('light')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-emerald-500 text-black shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                      <Sun className="w-4 h-4" />
                      Light
                    </button>
                    <button 
                      onClick={() => setTheme('dark')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-emerald-500 text-black shadow-lg' : 'text-stone-500 hover:text-stone-300'}`}
                    >
                      <Moon className="w-4 h-4" />
                      Dark
                    </button>
                  </div>
                </div>
              </div>

              <div className={`p-6 rounded-3xl border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-200'}`}>
                <h4 className={`text-sm font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Add New Administrator</h4>
                <p className="text-xs text-stone-500 mb-4">Enter the institutional email of the faculty member you want to promote to Admin.</p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    placeholder="faculty.name@neu.edu.ph"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm outline-none border transition-all ${
                      theme === 'dark' ? 'bg-black border-white/10 text-white focus:border-emerald-500/50' : 'bg-white border-stone-300 text-stone-900 focus:border-stone-900'
                    }`}
                  />
                  <button 
                    onClick={handlePromoteByEmail}
                    className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                      theme === 'dark' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    Add Admin
                  </button>
                </div>
                
                {promotionStatus && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                      promotionStatus.success 
                        ? (theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700')
                        : (theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-700')
                    }`}
                  >
                    {promotionStatus.success ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    {promotionStatus.message}
                  </motion.div>
                )}
              </div>

              <div className={`p-6 rounded-3xl border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-200'}`}>
                <h4 className={`text-sm font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>User Management</h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {users.map((u) => (
                    <div key={u.uid} className={`flex items-center justify-between p-4 rounded-2xl border group/user transition-colors ${
                      theme === 'dark' ? 'bg-black/20 border-white/5' : 'bg-white border-stone-200 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border group-hover/user:scale-110 transition-all ${
                          theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`text-sm font-bold transition-colors ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{u.displayName}</p>
                          <p className="text-xs text-stone-400 font-mono tracking-tight">{u.universityId || 'ID Pending'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">System Role</span>
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.uid, e.target.value as UserRole)}
                            className={`border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-emerald-500/50 transition-all cursor-pointer ${
                              theme === 'dark' ? 'bg-black border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                            }`}
                          >
                            <option value="professor">Professor</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">Access</span>
                          <button
                            onClick={() => handleToggleBlock(u.uid, u.isBlocked)}
                            className={`p-2 rounded-lg transition-all ${u.isBlocked ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'}`}
                            title={u.isBlocked ? 'Unblock User' : 'Block User'}
                          >
                            {u.isBlocked ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-mono text-stone-500 uppercase tracking-widest">Remove</span>
                          <button
                            onClick={() => setUserToDelete(u)}
                            className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'}`}
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`p-6 rounded-3xl border transition-colors ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-stone-50 border-stone-200'}`}>
                <h4 className={`text-sm font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Notifications</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-stone-200' : 'text-stone-700'}`}>Email Alerts</p>
                    <p className="text-xs text-stone-400">Receive alerts for unauthorized access attempts</p>
                  </div>
                  <div className={`w-12 h-6 rounded-full relative p-1 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <div className="w-4 h-4 bg-emerald-500 rounded-full ml-auto" />
                  </div>
                </div>
              </div>

              <div className={`pt-6 relative`}>
                <button 
                  onClick={() => setShowSaveSuccess(true)}
                  className={`w-full py-4 font-bold rounded-2xl transition-all shadow-lg ${
                    theme === 'dark' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' : 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-900/20'
                  }`}
                >
                  Save Configuration
                </button>
                {showSaveSuccess && (
                  <div className={`absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-2 ${
                    theme === 'dark' ? 'bg-emerald-500 text-black' : 'bg-stone-900 text-white'
                  }`}>
                    Settings saved successfully!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedUserForQr && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`max-w-md w-full p-8 rounded-[2.5rem] border shadow-2xl relative ${
                  theme === 'dark' ? 'bg-stone-900 border-white/10' : 'bg-white border-stone-200'
                }`}
              >
                <button 
                  onClick={() => setSelectedUserForQr(null)}
                  className="absolute top-6 right-6 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>

                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                    <QrCode className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className={`text-xl font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{selectedUserForQr.displayName}</h3>
                  <p className="text-stone-500 text-xs uppercase tracking-widest font-mono">Access QR Code</p>
                </div>

                <div className="bg-white p-8 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                  <QRCodeSVG 
                    id="faculty-qr-code"
                    value={selectedUserForQr.universityId || selectedUserForQr.email}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <button 
                      onClick={downloadQrCode}
                      className="flex-1 py-4 rounded-2xl font-bold text-sm bg-emerald-500 text-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
                    >
                      <Download className="w-4 h-4" />
                      Save Image
                    </button>
                    <button 
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          const svg = document.getElementById('faculty-qr-code')?.outerHTML;
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Print QR - ${selectedUserForQr.displayName}</title>
                                <style>
                                  body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
                                  .card { border: 2px solid #eee; padding: 40px; border-radius: 20px; text-align: center; }
                                  h1 { margin-top: 20px; font-size: 24px; }
                                  p { color: #666; margin-top: 5px; }
                                </style>
                              </head>
                              <body>
                                <div class="card">
                                  ${svg}
                                  <h1>${selectedUserForQr.displayName}</h1>
                                  <p>${selectedUserForQr.universityId || selectedUserForQr.email}</p>
                                  <p style="font-size: 10px; margin-top: 20px; color: #999;">NEU LABORATORY ACCESS CODE</p>
                                </div>
                                <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      className={`flex-1 py-4 rounded-2xl font-bold text-sm border transition-all flex items-center justify-center gap-3 ${
                        theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-stone-100 border-stone-200 text-stone-900 hover:bg-stone-200'
                      }`}
                    >
                      <Printer className="w-4 h-4" />
                      Print Code
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500 text-center uppercase tracking-widest font-mono">
                    ID: {selectedUserForQr.universityId || 'N/A'} • {selectedUserForQr.email}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}

          {userToDelete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={`max-w-md w-full p-8 rounded-[2.5rem] border shadow-2xl ${
                  theme === 'dark' ? 'bg-stone-900 border-white/10' : 'bg-white border-stone-200'
                }`}
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className={`text-xl font-bold text-center mb-2 ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>Delete User Profile?</h3>
                <p className="text-stone-500 text-sm text-center mb-8">
                  You are about to delete <span className="font-bold text-red-500">{userToDelete.displayName}</span>. This action cannot be undone and they will lose all access.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setUserToDelete(null)}
                    className={`flex-1 py-4 rounded-2xl font-bold text-sm transition-all ${
                      theme === 'dark' ? 'bg-white/5 text-stone-400 hover:bg-white/10' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteUser}
                    className="flex-1 py-4 rounded-2xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    Delete User
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color, isText, theme }: { title: string, value: string | number, icon: React.ReactNode, trend: string, color: 'emerald' | 'indigo' | 'amber', isText?: boolean, theme: 'dark' | 'light' }) {
  const colors = {
    emerald: theme === 'dark' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10 shadow-emerald-500/5' : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm',
    indigo: theme === 'dark' ? 'bg-indigo-500/5 text-indigo-500 border-indigo-500/10 shadow-indigo-500/5' : 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm',
    amber: theme === 'dark' ? 'bg-amber-500/5 text-amber-500 border-amber-500/10 shadow-amber-500/5' : 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm'
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border flex items-center justify-between group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden ${
      theme === 'dark' ? 'bg-black/60 backdrop-blur-2xl border-white/20 shadow-2xl' : 'bg-white border-stone-300 shadow-lg'
    }`}>
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/[0.02] blur-[40px] rounded-full group-hover:bg-white/[0.05] transition-all duration-1000" />
      <div className="flex-1 min-w-0 relative z-10">
        <p className={`text-xs font-mono font-bold uppercase tracking-widest mb-3 ${theme === 'dark' ? 'text-emerald-500/70' : 'text-emerald-600'}`}>{title}</p>
        <h4 className={`font-bold tracking-tighter truncate transition-colors ${isText ? 'text-2xl' : 'text-4xl'} ${theme === 'dark' ? 'text-white' : 'text-stone-900'}`}>{value}</h4>
        <div className="flex items-center gap-2 mt-4">
          <div className={`w-1.5 h-1.5 rounded-full ${theme === 'dark' ? 'bg-emerald-500/40' : 'bg-emerald-500'}`} />
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{trend}</span>
        </div>
      </div>
      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border shadow-lg transition-all group-hover:rotate-6 group-hover:scale-110 relative z-10 ${colors[color]}`}>
        {icon}
      </div>
    </div>
  );
}
