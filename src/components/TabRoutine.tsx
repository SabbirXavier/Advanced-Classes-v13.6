import React, { useState, useEffect } from "react";
import { Radio, CalendarCheck, Calendar, Clock, Instagram, Activity, ArrowRight } from "lucide-react";
import { firestoreService, handleFirestoreError } from "../services/firestoreService";
import { analyticsService } from "../services/analyticsService";
import MarkdownRenderer from "./MarkdownRenderer";
import { motion } from "motion/react";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export default function TabRoutine() {
  const getKolkataTime = () => {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
  };

  const [routines, setRoutines] = useState<any[]>([]);
  const [radars, setRadars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(getKolkataTime());

  const kolkataNow = getKolkataTime();
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayName = dayNames[kolkataNow.getDay()];
  const [activeDay, setActiveDay] = useState(todayName === 'sun' ? 'mon' : todayName);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getKolkataTime()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubRoutines = firestoreService.listenToCollection(
      "routines",
      (data) => {
        setRoutines(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'routines');
      }
    );
    const unsubRadars = firestoreService.listenToCollection(
      "radars",
      setRadars,
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'radars');
      }
    );
    return () => {
      unsubRoutines();
      unsubRadars();
    };
  }, []);

  const parseTime = (timeStr: string, isTomorrow?: boolean) => {
    if (!timeStr) return null;
    try {
      const startTimeStr = timeStr.split('-')[0].trim();
      const timeMatch = startTimeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!timeMatch) return null;
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const modifier = timeMatch[3]?.toUpperCase();
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      const date = getKolkataTime();
      if (isTomorrow) {
        date.setDate(date.getDate() + 1);
      }
      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (e) { return null; }
  };

  const getStatusInfo = (radar: any) => {
    const startTime = parseTime(radar.time, radar.isTomorrow);
    if (!startTime) return { status: radar.status || 'upcoming', label: radar.status?.toUpperCase() || 'UPCOMING', color: 'bg-gray-500' };
    const diffMins = (startTime.getTime() - currentTime.getTime()) / (1000 * 60);
    
    if (radar.status === 'canceled') return { status: 'canceled', label: 'CANCELED', color: 'bg-red-500' };
    
    if (diffMins <= 0 && diffMins >= -120) {
      return { status: 'live', label: 'LIVE NOW', color: 'bg-indigo-500 animate-pulse' };
    }
    
    if (diffMins > 0) {
      let label = 'UPCOMING';
      if (diffMins < 60) {
        label = `STARTS IN ${Math.ceil(diffMins)} MINS`;
      } else {
        const hrs = Math.floor(diffMins / 60);
        const mins = Math.ceil(diffMins % 60);
        label = radar.isTomorrow ? `TOMORROW • ${hrs}H ${mins}M` : `STARTS IN ${hrs}H ${mins}M`;
      }
      return { status: 'upcoming', label: label, color: radar.isTomorrow ? 'bg-purple-500' : 'bg-cyan-500' };
    }
    
    return { status: 'completed', label: 'OFFLINE', color: 'bg-gray-700' };
  };

  const activeRadars = radars.filter(r => getStatusInfo(r).status !== 'completed');
  let displayRadars = [...activeRadars];
  let showingTomorrow = false;

  if (displayRadars.length === 0) {
    const tomorrow = new Date(kolkataNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "short" }).toLowerCase();
    
    const tomorrowRoutinesLocal = routines.filter(r => r[tomorrowDay] && r[tomorrowDay] !== '-');
    if (tomorrowRoutinesLocal.length > 0) {
      showingTomorrow = true;
      tomorrowRoutinesLocal.forEach(r => {
        displayRadars.push({
          title: r[tomorrowDay],
          time: r.startTime && r.endTime ? `${r.startTime} - ${r.endTime}` : r.time || r.startTime || "",
          status: 'upcoming',
          isTomorrow: true
        });
      });
    }
  }

  const getGoogleCalendarUrl = (item: any) => {
    try {
      const text = encodeURIComponent(item.title);
      const host = "Advanced Classes, Sonai";
      const desc = `Mathematics Only Tuition For Class XI, XII\n\n📌 Faculty: Nemesis Developers\n📍 Location: https://share.google/MTzvbg4BOw6Ya3vTF\n🌐 App: ${window.location.origin}\n\nNote: ${item.notes || "No extra notes"}`;
      const details = encodeURIComponent(desc);
      const location = encodeURIComponent(
        "Advanced Classes, Sonai (24.73115, 92.89119)",
      );

      const parseToISO = (dateStr: string, timeStr: string) => {
        const d = new Date(dateStr);
        // Normalize time string (remove spaces, handle 12:30PM format)
        const parts = timeStr
          .trim()
          .toUpperCase()
          .match(/(\d+):(\d+)\s*(AM|PM)?/);
        if (!parts)
          return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        let hours = parseInt(parts[1], 10);
        let minutes = parseInt(parts[2], 10);
        let modifier = parts[3];

        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;

        d.setHours(hours, minutes, 0);
        return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      };

      const start = parseToISO(item.date, item.startTime || item.time);
      // Default classes to 2 hours if not specified
      const end = item.endTime
        ? parseToISO(item.date, item.endTime)
        : parseToISO(
            item.date,
            (item.startTime || item.time).replace(/(\d+)/, (m: string) =>
              (parseInt(m) + 2).toString(),
            ),
          );

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}&dates=${start}/${end}`;
    } catch (e) {
      return "#";
    }
  };

  if (loading)
    return (
      <div className="text-center p-10 opacity-50 font-bold">Loading...</div>
    );

  const tomorrowName = dayNames[(kolkataNow.getDay() + 1) % 7];

  const todayRadars = radars.filter(
    (r) => r.date === kolkataNow.toDateString(),
  );
  const hasLiveOrUpcoming = todayRadars.some(
    (r) => r.status === "live" || r.status === "upcoming",
  );

  // Logic: Show tomorrow if no radars for today OR all today's radars are completed
  const showTomorrow = todayRadars.length === 0 || !hasLiveOrUpcoming;

  const tomorrowRoutines = showTomorrow
    ? routines.filter((r) => r[tomorrowName] && r[tomorrowName] !== "-")
    : [];

  return (
    <div className="space-y-5">
      {/* Global Live Radar HUD - Same visual style as Home Tab */}
      {displayRadars.length > 0 && (
        <div className="mb-10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Activity className="text-indigo-500 animate-pulse" /> 
              RADAR
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayRadars.map((radar, index) => {
              const info = getStatusInfo(radar);
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}
                  className={`relative overflow-hidden rounded-[1.5rem] border backdrop-blur-lg p-[1px] shadow-sm ${showingTomorrow ? 'border-purple-500/30 bg-purple-500/5' : 'border-indigo-500/30 bg-indigo-500/5'}`}
                >
                  <div className="bg-white/90 dark:bg-black/60 rounded-[1.4rem] p-4 flex flex-col gap-4 h-full">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${info.color.split(' ')[0]} animate-pulse shrink-0 shadow-lg`}></div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1 flex-1">
                        <MarkdownRenderer inline content={radar.title || "Active Transmission"} />
                      </h4>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-200 dark:border-gray-800">
                      <div className="text-[10px] font-mono font-bold tracking-wider text-gray-500 dark:text-gray-400">
                        {radar.time}
                      </div>
                      {radar.link ? (
                        <a 
                          href={radar.link} 
                          onClick={() => {
                            analyticsService.logEvent({
                              event: 'click',
                              section: 'routine_radar',
                              itemId: radar.id || 'dynamic-radar',
                              itemName: info.status === 'live' ? 'join_live' : 'get_ready',
                              page: 'routine'
                            });
                          }}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:scale-[1.02] active:scale-95 transition-all text-[10px] uppercase flex items-center gap-1.5"
                        >
                          Join <ArrowRight size={12} />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 rounded-lg font-bold text-[10px] uppercase`}>
                            {info.label}
                          </span>
                          {info.status === "upcoming" && (
                            <a
                              href={getGoogleCalendarUrl(radar)}
                              onClick={() => {
                                analyticsService.logEvent({
                                  event: 'click',
                                  section: 'routine_radar',
                                  itemId: radar.id || 'dynamic-radar',
                                  itemName: 'google_calendar',
                                  page: 'routine'
                                });
                              }}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-gray-800 dark:text-gray-200 transition-all border border-gray-200 dark:border-white/10"
                              title="Add to Google Calendar"
                            >
                              <Calendar size={14} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Master Routine</h2>
        
        {/* Mobile Day Selector */}
        <div className="flex md:hidden overflow-x-auto pb-2 gap-2 scrollbar-hide">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day) => (
            <button
              key={day}
              onClick={() => {
                analyticsService.logEvent({
                  event: 'click',
                  section: 'routine_days',
                  itemName: day,
                  page: 'routine'
                });
                setActiveDay(day);
              }}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                activeDay === day 
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg' 
                  : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop View Table */}
      <div className="hidden md:block glass-card overflow-x-auto !p-3">
        <table className="w-full min-w-[500px] border-collapse">
          <thead>
            <tr>
              <th className="text-left p-2.5 text-xs text-[var(--primary)] border-b-2 border-[var(--border-color)]">
                TIME
              </th>
              {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => (
                <th key={day} className="text-left p-2.5 text-xs text-[var(--primary)] border-b-2 border-[var(--border-color)] uppercase">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {routines.filter(r => {
              const isEmpty = ["mon", "tue", "wed", "thu", "fri", "sat"].every(day => !r[day] || String(r[day]).trim() === '-' || String(r[day]).trim() === '•' || String(r[day]).trim() === '');
              return !isEmpty;
            }).map((routine) => (
              <tr key={routine.id}>
                <td className="p-2.5 border-b border-[var(--border-color)] text-sm whitespace-nowrap">
                  {routine.startTime && routine.endTime
                    ? `${routine.startTime} - ${routine.endTime}`
                    : routine.time || routine.startTime || ""}
                </td>
                {["mon", "tue", "wed", "thu", "fri", "sat"].map((day) => {
                  const val = routine[day];
                  const isMath = val?.includes("Math");
                  const isChem = val?.includes("Chem");
                  let className =
                    "p-2.5 border-b border-[var(--border-color)] text-sm max-w-[150px] whitespace-normal break-words align-top ";
                  if (isMath)
                    className +=
                      "text-[var(--primary)] font-semibold bg-[#4f46e5]/5 border-l-[3px] border-l-[var(--primary)]";
                  else if (isChem)
                    className +=
                      "text-[var(--accent)] font-semibold bg-[#f59e0b]/5 border-l-[3px] border-l-[var(--accent)]";
                  else className += "opacity-50";

                  return (
                    <td key={day} className={className}>
                      <MarkdownRenderer content={val} inline />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View Card List */}
      <div className="md:hidden space-y-3">
        {routines
          .filter(r => {
            const val = r[activeDay];
            return val && String(val).trim() !== '-' && String(val).trim() !== '•' && String(val).trim() !== '';
          })
          .map((routine) => {
            const val = routine[activeDay];
            const isMath = val?.includes("Math");
            const isChem = val?.includes("Chem");
            
            return (
              <div 
                key={`mobile-${routine.id}`}
                className={`glass-card !p-4 flex items-center justify-between gap-4 border-l-4 ${
                  isMath ? 'border-l-[var(--primary)]' : isChem ? 'border-l-[var(--accent)]' : 'border-l-white/10'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    <Clock size={12} className={isMath ? 'text-[var(--primary)]' : isChem ? 'text-[var(--accent)]' : ''} />
                    {routine.startTime && routine.endTime
                      ? `${routine.startTime} - ${routine.endTime}`
                      : routine.time || routine.startTime || ""}
                  </div>
                  <div className={`font-bold text-base ${isMath ? 'text-[var(--primary)]' : isChem ? 'text-[var(--accent)]' : ''}`}>
                    <MarkdownRenderer content={val} inline />
                  </div>
                </div>
                <div className="shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-[10px] font-bold uppercase`}>
                    {activeDay.slice(0, 3)}
                  </div>
                </div>
              </div>
            );
          })}
        {routines.filter(r => {
          const val = r[activeDay];
          return val && String(val).trim() !== '-' && String(val).trim() !== '•' && String(val).trim() !== '';
        }).length === 0 && (
          <div className="p-8 text-center glass-card opacity-50 italic text-sm">
            No classes scheduled for {activeDay.toUpperCase()}.
          </div>
        )}
      </div>

      <div className="glass-card">
        <p className="mb-2 opacity-90">
          🔴 <b className="font-bold">Sunday Tests:</b> 09:00 AM - 10:00 AM,
          10:00 AM - 11:00 AM, 11:00 AM - 01:00 PM
        </p>
        <p className="opacity-90">
          🔵 <b className="font-bold">Math:</b> 2.5 Hour Sessions.
        </p>
      </div>
    </div>
  );
}
