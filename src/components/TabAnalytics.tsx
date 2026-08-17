import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, Users, MousePointer2, Map, Globe, 
  Calendar, BarChart3, PieChart as PieChartIcon, 
  ArrowUpRight, ArrowDownRight, Clock, Eye, 
  ExternalLink, Monitor, Smartphone, Search, Filter, Route, X, Activity
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Cell, AreaChart, Area
} from 'recharts';

export default function TabAnalytics() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<'range' | 'day'>('range');
  const [timeRange, setTimeRange] = useState(7); // days
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [timeRange, selectedDay, filterMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let data;
      if (filterMode === 'day') {
        const start = new Date(selectedDay);
        start.setHours(0, 0, 0, 0);
        const end = new Date(selectedDay);
        end.setHours(23, 59, 59, 999);
        data = await analyticsService.getAnalytics(undefined, start, end);
      } else {
        data = await analyticsService.getAnalytics(timeRange);
      }
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  // Data processing
  const stats = {
    totalVisits: events.filter(e => e.event === 'visit').length,
    totalViews: events.filter(e => e.event === 'page_view').length,
    totalClicks: events.filter(e => e.event === 'click').length,
    uniqueUsers: new Set(events.map(e => e.userId)).size,
  };

  // Prepare chart data
  const getChartData = () => {
    if (filterMode === 'day') {
      // Hourly data for single day
      const hours: any = {};
      for (let i = 0; i < 24; i++) {
        const label = `${i}:00`;
        hours[label] = { label, visits: 0, views: 0 };
      }

      events.forEach(e => {
        const date = e.timestamp?.toDate ? e.timestamp.toDate() : new Date(e.clientTime);
        const hour = date.getHours();
        const label = `${hour}:00`;
        if (hours[label]) {
          if (e.event === 'visit') hours[label].visits++;
          if (e.event === 'page_view') hours[label].views++;
        }
      });
      return Object.values(hours);
    } else {
      // Daily data for range
      const days: any = {};
      const now = new Date();
      for (let i = 0; i < timeRange; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days[dateStr] = { label: dateStr, visits: 0, views: 0 };
      }

      events.forEach(e => {
        const dateStr = e.timestamp?.toDate ? e.timestamp.toDate().toISOString().split('T')[0] : e.clientTime?.split('T')[0];
        if (days[dateStr]) {
          if (e.event === 'visit') days[dateStr].visits++;
          if (e.event === 'page_view') days[dateStr].views++;
        }
      });

      return Object.values(days).reverse();
    }
  };

  // Top Pages
  const getTopPages = () => {
    const pages: any = {};
    events.filter(e => e.event === 'page_view').forEach(e => {
      pages[e.page] = (pages[e.page] || 0) + 1;
    });
    return Object.entries(pages).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  };

  // Referrers
  const getTopReferrers = () => {
    const refs: any = {};
    events.filter(e => e.event === 'visit').forEach(e => {
      const r = e.referrer || 'direct';
      refs[r] = (refs[r] || 0) + 1;
    });
    return Object.entries(refs).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  };

  // Top Programs
  const getTopPrograms = () => {
    const progs: any = {};
    events.filter(e => e.event === 'enroll_click').forEach(e => {
      const name = e.itemName || e.itemId || 'Unknown';
      progs[name] = (progs[name] || 0) + 1;
    });
    return Object.entries(progs).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  };

  // Funnel Data
  const getFunnelData = () => {
    const opens = events.filter(e => e.event === 'form_open').length;
    const clicks = events.filter(e => e.event === 'enroll_click').length;
    const subs = events.filter(e => e.event === 'form_submit').length;
    return [
      { name: 'Interested', value: clicks, fill: '#6366f1' },
      { name: 'Started Form', value: opens, fill: '#a855f7' },
      { name: 'Submitted', value: subs, fill: '#10b981' }
    ];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin text-indigo-500">
          <TrendingUp size={48} />
        </div>
        <p className="font-bold opacity-50">Gathering Insights...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-[#111] p-6 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <BarChart3 className="text-indigo-500" />
            Analytics Overview
          </h2>
          <p className="text-sm opacity-60">Track your growth and user engagement</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Filter Type Toggle */}
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'range' ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}
            >
              Range
            </button>
            <button
              onClick={() => setFilterMode('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterMode === 'day' ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500'}`}
            >
              Date
            </button>
          </div>

          {filterMode === 'range' ? (
            <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
              {[1, 7, 30, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all ${timeRange === days ? 'bg-white dark:bg-white/10 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {days === 1 ? 'Today' : `${days}D`}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
              <Calendar size={14} className="ml-2 text-gray-400" />
              <input 
                type="date" 
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent border-none text-[10px] sm:text-xs font-bold focus:ring-0 p-1.5 cursor-pointer outline-none"
              />
            </div>
          )}

          <button 
            onClick={fetchData}
            className="p-2.5 bg-indigo-500 text-white rounded-xl hover:scale-105 transition-transform"
          >
            <Clock size={16} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card !p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">Total Visits</p>
            <h3 className="text-2xl font-black">{stats.totalVisits}</h3>
          </div>
        </div>
        <div className="glass-card !p-6 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">Page Views</p>
            <h3 className="text-2xl font-black">{stats.totalViews}</h3>
          </div>
        </div>
        <div className="glass-card !p-6 flex items-center gap-4">
          <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl">
            <MousePointer2 size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">Interactions</p>
            <h3 className="text-2xl font-black">{stats.totalClicks}</h3>
          </div>
        </div>
        <div className="glass-card !p-6 flex items-center gap-4">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-2xl">
            <Globe size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-50 tracking-widest">Unique Users</p>
            <h3 className="text-2xl font-black">{stats.uniqueUsers}</h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card !p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-lg flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-500" />
              {filterMode === 'day' ? 'Hourly Activity' : 'Traffic Growth'}
            </h4>
          </div>
          <div className="h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              <AreaChart data={getChartData()}>
                <defs>
                  <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8882" />
                <XAxis 
                  dataKey="label" 
                  stroke="#8888" 
                  fontSize={10} 
                  tickFormatter={(str) => filterMode === 'day' ? str : (str.split('-').slice(1).join('/') || str)} 
                />
                <YAxis stroke="#8888" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderRadius: '12px', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#6366f1' }}
                />
                <Area type="monotone" dataKey="visits" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVisits)" />
                <Area type="monotone" dataKey="views" stroke="#a855f7" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          <div className="glass-card !p-6">
            <h4 className="font-black text-lg mb-4 flex items-center gap-2">
              <Eye size={20} className="text-purple-500" />
              Top Pages
            </h4>
            <div className="space-y-4">
              {getTopPages().map(([page, count]: any, idx) => (
                <div key={page} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold capitalize">{page}</span>
                    <span className="opacity-50">{count} views</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / (stats.totalViews || 1)) * 100}%` }}
                      className={`h-full bg-gradient-to-r ${idx === 0 ? 'from-indigo-500 to-purple-500' : 'from-gray-400 to-gray-500'}`}
                    />
                  </div>
                </div>
              ))}
              {getTopPages().length === 0 && <p className="text-xs opacity-50 py-4 text-center">No page views recorded for this period</p>}
            </div>
          </div>

          <div className="glass-card !p-6">
            <h4 className="font-black text-lg mb-4 flex items-center gap-2">
              <ExternalLink size={20} className="text-orange-500" />
              Top Referrers
            </h4>
            <div className="space-y-4">
              {getTopReferrers().map(([ref, count]: any) => (
                <div key={ref} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white dark:bg-[#111] rounded-lg shadow-sm">
                      <Globe size={14} className="text-indigo-500" />
                    </div>
                    <span className="text-xs font-bold truncate max-w-[150px]">{ref}</span>
                  </div>
                  <span className="text-xs font-black opacity-50">{count}</span>
                </div>
              ))}
              {getTopReferrers().length === 0 && <p className="text-xs opacity-50 py-4 text-center">No referrers found</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Funnel and Top Programs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card !p-6 lg:col-span-1">
          <h4 className="font-black text-lg mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-500" />
            Enrollment Funnel
          </h4>
          <div className="space-y-6">
            {getFunnelData().map((item, idx, arr) => (
              <div key={item.name} className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-black uppercase tracking-widest opacity-60">{item.name}</span>
                  <span className="text-sm font-black">{item.value}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-white/5 h-3 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(item.value / (arr[0].value || 1)) * 100}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex justify-center my-1">
                    <ArrowDownRight size={14} className="opacity-20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card !p-6 lg:col-span-2">
          <h4 className="font-black text-lg mb-6 flex items-center gap-2">
            <PieChartIcon size={20} className="text-blue-500" />
            Top Program Interests
          </h4>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              <BarChart data={getTopPrograms().map(([name, value]) => ({ name, value }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#8882" />
                <XAxis dataKey="name" stroke="#8888" fontSize={10} />
                <YAxis stroke="#8888" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderRadius: '12px', border: 'none', color: '#fff' }}
                  cursor={{ fill: '#8881' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Log */}
      <div className="glass-card !p-6">
        <div className="flex justify-between items-center mb-6">
          <h4 className="font-black text-lg flex items-center gap-2">
            <Clock size={20} className="text-gray-400" />
            Recent Activity
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-[10px] uppercase font-black opacity-50 tracking-widest">
                <th className="pb-4">Event</th>
                <th className="pb-4">User Details</th>
                <th className="pb-4">Interaction</th>
                <th className="pb-4">Device/IP</th>
                <th className="pb-4 text-right">Time</th>
                <th className="pb-4 text-center">Journey</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {events.slice(0, 20).map(e => (
                <tr key={e.id} className="border-b border-gray-50 dark:border-white/5">
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      e.event === 'visit' ? 'bg-green-500/10 text-green-500' :
                      e.event === 'click' ? 'bg-blue-500/10 text-blue-500' :
                      e.event === 'form_submit' ? 'bg-emerald-500/10 text-emerald-500' :
                      'bg-gray-500/10 text-gray-500'
                    }`}>
                      {e.event}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold">{e.userName || e.userEmail || 'Anonymous'}</span>
                      <span className="text-[10px] opacity-50 flex items-center gap-1">
                        <Map size={10} /> {e.city || 'Unknown'}, {e.country || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold capitalize">{e.page || 'Home'}</span>
                      {e.itemName && <span className="text-[10px] opacity-50 text-indigo-500">{e.itemName}</span>}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex flex-col text-[10px] font-mono">
                      <span className="opacity-70">{e.ip || '0.0.0.0'}</span>
                      <span className="opacity-40 truncate max-w-[120px]" title={e.userAgent}>
                        {(() => {
                          const ua = e.userAgent;
                          if (!ua) return 'Unknown';
                          if (/android/i.test(ua)) return 'Android';
                          if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
                          if (/windows/i.test(ua)) return 'Windows';
                          if (/mac/i.test(ua)) return 'macOS';
                          if (/linux/i.test(ua)) return 'Linux';
                          if (/cros/i.test(ua)) return 'Chrome O';
                          return ua.split(' ')[1]?.replace('(', '') || 'Unknown';
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 opacity-50 text-xs text-right tabular-nums">
                    {new Date(e.timestamp?.toDate ? e.timestamp.toDate() : e.clientTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-4 text-center">
                    <button 
                      onClick={() => setSelectedUserId(e.userId)}
                      className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg transition-colors border border-indigo-500/20 tooltip-trigger"
                      title="View User Journey"
                    >
                      <Route size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center opacity-50">No events found for this selection</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Journey Modal */}
      <AnimatePresence>
        {selectedUserId && (() => {
          const userEvents = events
            .filter(e => e.userId === selectedUserId)
            .sort((a, b) => {
              const aTime = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.clientTime).getTime();
              const bTime = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.clientTime).getTime();
              return bTime - aTime;
            });
            
          const firstEvent = userEvents[userEvents.length - 1]; // Oldest
          const lastEvent = userEvents[0]; // Newest
          
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedUserId(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
                  <div>
                    <h3 className="text-xl font-black flex items-center gap-2">
                      <Route className="text-indigo-500" />
                      User Journey
                    </h3>
                    <p className="text-xs opacity-60 mt-1 flex items-center gap-1 font-mono">
                      ID: {selectedUserId.substring(0, 12)}... 
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedUserId(null)}
                    className="p-2 bg-gray-200/50 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="p-6 bg-indigo-500/5 border-b border-gray-100 dark:border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Total Events</p>
                    <p className="text-lg font-black">{userEvents.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Duration</p>
                    <p className="text-sm font-bold">
                      {firstEvent && lastEvent ? (() => {
                        const start = firstEvent.timestamp?.toDate ? firstEvent.timestamp.toDate().getTime() : new Date(firstEvent.clientTime).getTime();
                        const end = lastEvent.timestamp?.toDate ? lastEvent.timestamp.toDate().getTime() : new Date(lastEvent.clientTime).getTime();
                        const diffMins = Math.round((end - start) / 60000);
                        return diffMins < 1 ? '< 1 min' : `${diffMins} min`;
                      })() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Location</p>
                    <p className="text-sm font-bold truncate">{firstEvent?.city || 'Unknown'}, {firstEvent?.country || 'Unk'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Device/OS</p>
                    <p className="text-xs font-mono font-bold truncate" title={firstEvent?.userAgent || 'Unknown'}>
                      {(() => {
                        const ua = firstEvent?.userAgent;
                        if (!ua) return 'Unknown';
                        if (/android/i.test(ua)) return 'Android';
                        if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
                        if (/windows/i.test(ua)) return 'Windows';
                        if (/mac/i.test(ua)) return 'macOS';
                        if (/linux/i.test(ua)) return 'Linux';
                        if (/cros/i.test(ua)) return 'Chrome OS';
                        return ua.split(' ')[1]?.replace('(', '') || 'Unknown';
                      })()}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/80 dark:bg-white/[0.01] border-b border-gray-100 dark:border-white/5 flex flex-wrap gap-2 text-xs">
                  {firstEvent?.region && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md">Region: <b>{firstEvent.region}</b></span>}
                  {firstEvent?.timezone && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md">Timezone: <b>{firstEvent.timezone}</b></span>}
                  {firstEvent?.org && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md truncate max-w-[200px]" title={firstEvent.org}>ISP: <b>{firstEvent.org}</b></span>}
                  {firstEvent?.deviceMemory && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md">RAM: <b>{firstEvent.deviceMemory}GB</b></span>}
                  {firstEvent?.hardwareConcurrency && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md">Cores: <b>{firstEvent.hardwareConcurrency}</b></span>}
                  {firstEvent?.connectionType && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md">Network: <b>{firstEvent.connectionType}</b></span>}
                  {firstEvent?.language && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md">Lang: <b>{firstEvent.language}</b></span>}
                  {firstEvent?.ip && <span className="px-2 py-1 bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-md font-mono">IP: <b>{firstEvent.ip}</b></span>}
                  {firstEvent?.utmSource && <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30 rounded-md">Source: <b>{firstEvent.utmSource}</b></span>}
                  {firstEvent?.utmCampaign && <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30 rounded-md">Campaign: <b>{firstEvent.utmCampaign}</b></span>}
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-white/50 dark:bg-transparent">
                  <div className="relative border-l-2 border-indigo-500/30 ml-4 space-y-8 py-4">
                    {(() => {
                      const eventsByDay: { [key: string]: typeof userEvents } = {};
                      userEvents.forEach(e => {
                        const time = new Date(e.timestamp?.toDate ? e.timestamp.toDate() : e.clientTime);
                        const dayString = time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        if (!eventsByDay[dayString]) eventsByDay[dayString] = [];
                        eventsByDay[dayString].push(e);
                      });

                      return Object.entries(eventsByDay).map(([dayString, dayEvents], dayIdx) => (
                        <div key={dayIdx} className="mb-10 relative">
                          <div className="absolute -left-10 top-0 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400 font-bold text-xs shadow-sm border border-indigo-100 dark:border-indigo-500/20 whitespace-nowrap z-10">
                            {dayString}
                          </div>
                          
                          <div className="pt-10 space-y-8">
                            {dayEvents.map((e, idx) => {
                              const time = new Date(e.timestamp?.toDate ? e.timestamp.toDate() : e.clientTime);
                              return (
                                <div key={e.id || idx} className="relative pl-6">
                                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-[#111] flex items-center justify-center ${
                                    e.event === 'visit' ? 'bg-green-500' :
                                    e.event === 'click' ? 'bg-blue-500' :
                                    e.event === 'form_submit' ? 'bg-emerald-500' :
                                    e.event === 'enroll_click' ? 'bg-purple-500' :
                                    'bg-gray-500'
                                  }`}>
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        e.event === 'visit' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
                                        e.event === 'click' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                        e.event === 'form_submit' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                        e.event === 'enroll_click' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                        'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                      }`}>
                                        {e.event}
                                      </span>
                                      <span className="text-xs opacity-50 font-mono">
                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                    </div>
                                    
                                    <p className="text-sm font-bold">
                                      {e.event === 'page_view' ? `Viewed ${e.page} page` :
                                       e.event === 'visit' ? `Started session on ${e.page}` :
                                       e.event === 'click' ? `Clicked on ${e.page}` :
                                       e.event === 'enroll_click' ? `Clicked Enroll` :
                                       e.event === 'social_click' ? `Clicked Social Link` : 
                                       e.event}
                                    </p>
                                    
                                    {(e.itemName || e.itemId || e.referrer || e.urlParams) && (
                                      <div className="mt-1 p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400">
                                        {e.itemName && <span className="block font-medium">Item: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{e.itemName}</span></span>}
                                        {e.referrer && e.referrer !== 'direct' && <span className="block">Referrer: <span className="opacity-80 break-all">{e.referrer}</span></span>}
                                        {e.urlParams && Object.keys(e.urlParams).length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-white/10 flex flex-wrap gap-1">
                                            {Object.entries(e.urlParams).map(([k, v]) => (
                                              <span key={k} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded text-[10px] break-all">
                                                <b>{k}:</b> {String(v)}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
