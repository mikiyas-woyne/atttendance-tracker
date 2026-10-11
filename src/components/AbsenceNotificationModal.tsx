import React, { useState } from 'react';
import { AbsenceAlert, Student } from '../types';
import { markAlertAsRead, markAlertAsResolved } from '../lib/absenceAlertService';
import { formatEthStringDate } from '../lib/ethiopianDate';
import { EthiopianOrthodoxCross } from './EthiopianOrthodoxCross';
import {
  Bell,
  X,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  User,
  History,
  Check,
  Loader2,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';

interface AbsenceNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AbsenceAlert[];
  students: Student[];
  onSelectStudentHistory?: (student: Student) => void;
  adminEmail?: string;
}

export const AbsenceNotificationModal: React.FC<AbsenceNotificationModalProps> = ({
  isOpen,
  onClose,
  alerts,
  students,
  onSelectStudentHistory,
  adminEmail,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'resolved'>('unread');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState<string>('');

  if (!isOpen) return null;

  const unreadAlerts = alerts.filter((a) => a.status === 'unread');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unread') return alert.status === 'unread' || alert.status === 'read';
    if (filter === 'resolved') return alert.status === 'resolved';
    return true;
  });

  const handleRead = async (alert: AbsenceAlert) => {
    if (!alert.alertId) return;
    setLoadingId(alert.alertId);
    try {
      await markAlertAsRead(alert.alertId);
    } catch (e) {
      console.warn('Error marking read:', e);
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmResolve = async (alert: AbsenceAlert) => {
    if (!alert.alertId) return;
    setLoadingId(alert.alertId);
    try {
      await markAlertAsResolved(alert.alertId, resolveNote, adminEmail);
      setResolvingAlertId(null);
      setResolveNote('');
    } catch (e) {
      console.warn('Error resolving alert:', e);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-amber-300 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 p-3.5 sm:p-5 text-amber-100 flex items-center justify-between border-b-2 border-amber-500/50 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center relative shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-bounce" />
              {unreadAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white font-extrabold text-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-red-950 animate-pulse">
                  {unreadAlerts.length}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-xs sm:text-base md:text-lg text-amber-200 font-serif leading-tight truncate">
                የ4 ሳምንት ተከታታይ መቅረት ማሳወቂያዎች
              </h3>
              <p className="text-[11px] sm:text-xs text-amber-100/80 font-medium truncate">
                የአስተዳዳሪ ብቻ የክትትል ጥሪ ጥቆማዎች ({unreadAlerts.length} ያልተነበቡ)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 active:scale-95 transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex items-center gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              filter === 'unread'
                ? 'bg-amber-500 text-red-950 shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
            <span>ያልተነበቡ / ንቁ ({unreadAlerts.length})</span>
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              filter === 'all'
                ? 'bg-amber-500 text-red-950 shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-700" />
            <span>ሁሉም ({alerts.length})</span>
          </button>

          <button
            onClick={() => setFilter('resolved')}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              filter === 'resolved'
                ? 'bg-amber-500 text-red-950 shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>የተፈቱ ({resolvedAlerts.length})</span>
          </button>
        </div>

        {/* List of Alerts */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 my-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800 font-serif">
                ምንም ተከታታይ የቀረ ተማሪ ማሳወቂያ የለም
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                በስርዓቱ ውስጥ 4 ተከታታይ የሰንበት ትምህርት ቤት ስብሰባዎችን ያመለጡ ተማሪዎች የሉም። ሁሉም ተማሪዎች በስርዓት ይከታተላሉ።
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const studentObj = students.find((s) => s.studentId === alert.studentId);
              const studentPhone = studentObj?.phoneNumber || alert.phoneNumber;
              const guardianPhone = studentObj?.guardianPhone || alert.guardianPhone;

              const isUnread = alert.status === 'unread';
              const isResolved = alert.status === 'resolved';

              return (
                <div
                  key={alert.alertId || alert.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    isUnread
                      ? 'bg-red-50/80 border-red-300 shadow-sm'
                      : isResolved
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-amber-50/50 border-amber-300'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {alert.studentName}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 font-mono font-extrabold text-xs border border-amber-300">
                        {alert.studentId}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isUnread && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>ያልተነበበ አዲስ!</span>
                        </span>
                      )}
                      {alert.status === 'read' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>የተነበበ (በክትትል ላይ)</span>
                        </span>
                      )}
                      {isResolved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>ችግሩ ተፈቷል</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Issue Explanation */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 bg-white/90 p-2.5 rounded-xl border border-slate-200 text-slate-800 font-medium">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-950 text-xs">
                          ጉዳይ፡ በ4 ተከታታይ የሰንበት ትምህርት ቤት ስብሰባዎች አልተገኙም።
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>ያመለጧቸው ቀናት፡</span>
                          <div className="flex flex-wrap gap-1">
                            {alert.missedDates.map((d) => (
                              <span
                                key={d}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200"
                              >
                                {formatEthStringDate(d)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recommended Action */}
                    <div className="p-2.5 rounded-xl bg-amber-100/70 border border-amber-300/80 text-amber-950">
                      <p className="font-extrabold text-[11px] mb-0.5 flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-800" />
                        <span>የሚመከር እርምጃ፡</span>
                      </p>
                      <p className="text-slate-800 text-[11px] leading-relaxed">
                        ተማሪውን ወይም ወላጅን በስልክ ደውለው ደህነነታቸውን፣ የታመሙ መሆናቸውን ወይም የመቅረታቸውን ምክንያት በአካል ይከታተሉ።
                      </p>
                    </div>

                    {/* Phone Numbers for Direct Call */}
                    {(studentPhone || guardianPhone) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {studentPhone && (
                          <a
                            href={`tel:${studentPhone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>የተማሪ ስልክ፡ {studentPhone}</span>
                          </a>
                        )}

                        {guardianPhone && (
                          <a
                            href={`tel:${guardianPhone}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-amber-100 font-bold text-xs shadow-xs transition-all"
                          >
                            <User className="w-3.5 h-3.5" />
                            <span>ወላጅ/ደጋፊ፡ {guardianPhone}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Resolution Note if resolved */}
                    {isResolved && alert.notes && (
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px]">
                        <strong>የመፍትሔ ማስታወሻ፡</strong> {alert.notes}
                      </div>
                    )}

                    {/* Resolving Form */}
                    {resolvingAlertId === alert.alertId && (
                      <div className="mt-2 p-3 bg-white rounded-xl border border-amber-400 space-y-2 animate-fade-in">
                        <label className="block text-[11px] font-bold text-slate-800">
                          የመፍትሔ / የክትትል ማስታወሻ ያስገቡ (ለምሳሌ፡ ከወላጅ ጋር ተነጋግሬያለሁ፤ በሚቀጥለው ሳምንት ይመጣሉ)፡
                        </label>
                        <input
                          type="text"
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          placeholder="ማስታወሻ ያስገቡ..."
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setResolvingAlertId(null)}
                            className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold text-xs"
                          >
                            ሰርዝ
                          </button>
                          <button
                            onClick={() => handleConfirmResolve(alert)}
                            disabled={loadingId === alert.alertId}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                          >
                            {loadingId === alert.alertId && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>አረጋግጥና ፈታ</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                      {onSelectStudentHistory && studentObj && (
                        <button
                          onClick={() => {
                            onClose();
                            onSelectStudentHistory(studentObj);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <History className="w-3.5 h-3.5 text-slate-600" />
                          <span>የተማሪ ታሪክ ተመልከት</span>
                        </button>
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        {isUnread && (
                          <button
                            onClick={() => handleRead(alert)}
                            disabled={loadingId === alert.alertId}
                            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-red-950 font-extrabold text-[11px] flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50"
                          >
                            {loadingId === alert.alertId ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>እንደተነበበ ማርክ አድርግ</span>
                          </button>
                        )}

                        {!isResolved && resolvingAlertId !== alert.alertId && (
                          <button
                            onClick={() => {
                              setResolvingAlertId(alert.alertId);
                              setResolveNote('');
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ችግሩ ተፈቷል በል</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-600 font-medium">
            ይህ ማሳወቂያ ለአስተዳዳሪዎች ብቻ የሚታይ ነው።
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-all"
          >
            ዝጋ
          </button>
        </div>

      </div>
    </div>
  );
};
