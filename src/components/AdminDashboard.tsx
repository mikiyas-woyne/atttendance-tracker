import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  query,
  orderBy,
  addDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Student, AttendanceSession, AttendanceRecord, AttendanceStatus, AbsenceAlert } from '../types';
import { EthiopianOrthodoxCross } from './EthiopianOrthodoxCross';
import { toEthiopianDate, ETHIOPIC_MONTHS, formatEthStringDate } from '../lib/ethiopianDate';
import { detectAndCreateAbsenceAlerts } from '../lib/absenceAlertService';
import { AbsenceNotificationModal } from './AbsenceNotificationModal';
import html2canvas from 'html2canvas';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Edit,
  PlusCircle,
  AlertTriangle,
  ChevronRight,
  Check,
  X,
  Loader2,
  FileSpreadsheet,
  History,
  Award,
  Settings,
  LogOut,
  Image,
  Filter,
  CheckSquare,
  Bell,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { isAdmin, currentUser, logout } = useAuth();

  // Three Main Tabs: 'attendance' (Students & Attendance), 'reports' (Attendance Reports), 'settings' (Settings)
  const [activeMainTab, setActiveMainTab] = useState<'attendance' | 'reports' | 'settings'>('attendance');

  // Firestore Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [absenceAlerts, setAbsenceAlerts] = useState<AbsenceAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);

  // Attendance Date (Ethiopian Calendar)
  const initialEthDate = toEthiopianDate(new Date());
  const [ethDay, setEthDay] = useState<number>(initialEthDate.day);
  const [ethMonth, setEthMonth] = useState<number>(initialEthDate.month);
  const [ethYear, setEthYear] = useState<number>(initialEthDate.year);

  const selectedMeetingDate = `${ethYear}-${String(ethMonth).padStart(2, '0')}-${String(ethDay).padStart(2, '0')}`;

  // Attendance Marking Map: studentId -> { status: AttendanceStatus, reason: string }
  const [markedMap, setMarkedMap] = useState<Record<string, { status?: AttendanceStatus; reason?: string }>>({});
  const [savingAttendance, setSavingAttendance] = useState<boolean>(false);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<'all' | 'unmarked' | 'present' | 'absent' | 'excused'>('all');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals & Selections
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showManualAddModal, setShowManualAddModal] = useState<boolean>(false);

  // Manual Add Student Form
  const [manualName, setManualName] = useState<string>('');
  const [manualAge, setManualAge] = useState<string>('');
  const [manualGender, setManualGender] = useState<'ወንድ' | 'ሴት' | 'ያልተጠቀሰ'>('ወንድ');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualGuardian, setManualGuardian] = useState<string>('');

  // Reports State
  const [reportSubTab, setReportSubTab] = useState<'overall' | 'individual' | 'monthly' | 'ranking'>('overall');
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string>('');
  const [selectedReportYear, setSelectedReportYear] = useState<number>(initialEthDate.year);
  const [selectedReportMonth, setSelectedReportMonth] = useState<number>(initialEthDate.month);
  const [rankingMode, setRankingMode] = useState<'overall' | 'monthly'>('overall');

  // Refs for PNG Export
  const reportCaptureRef = useRef<HTMLDivElement>(null);
  const [isExportingPNG, setIsExportingPNG] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Subscribe to Real-Time Firestore Collections (Cross-Device Auto-Sync)
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        const studentList: Student[] = [];
        snapshot.forEach((docSnap) => {
          studentList.push({ id: docSnap.id, ...docSnap.data() } as Student);
        });
        setStudents(studentList);
        setLoading(false);
      },
      (error) => {
        console.warn('Students snapshot notice:', error?.message || error);
        setLoading(false);
      }
    );

    const unsubSessions = onSnapshot(
      collection(db, 'attendanceSessions'),
      (snapshot) => {
        const sessionList: AttendanceSession[] = [];
        snapshot.forEach((docSnap) => {
          sessionList.push({ id: docSnap.id, ...docSnap.data() } as AttendanceSession);
        });
        setSessions(sessionList);
      },
      (error) => {
        console.warn('Sessions snapshot notice:', error?.message || error);
      }
    );

    const unsubRecords = onSnapshot(
      collection(db, 'attendanceRecords'),
      (snapshot) => {
        const recordList: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          recordList.push({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
        });
        setRecords(recordList);
      },
      (error) => {
        console.warn('Records snapshot notice:', error?.message || error);
      }
    );

    const unsubAlerts = onSnapshot(
      collection(db, 'absenceAlerts'),
      (snapshot) => {
        const alertList: AbsenceAlert[] = [];
        snapshot.forEach((docSnap) => {
          alertList.push({ id: docSnap.id, ...docSnap.data() } as AbsenceAlert);
        });
        setAbsenceAlerts(alertList);
      },
      (error) => {
        console.warn('Absence alerts snapshot notice:', error?.message || error);
      }
    );

    return () => {
      unsubStudents();
      unsubSessions();
      unsubRecords();
      unsubAlerts();
    };
  }, [isAdmin, currentUser]);

  // Run consecutive absence detection whenever students, sessions, or records update
  useEffect(() => {
    if (isAdmin && students.length > 0 && sessions.length > 0 && records.length > 0) {
      detectAndCreateAbsenceAlerts(students, sessions, records, absenceAlerts);
    }
  }, [isAdmin, students, sessions, records, absenceAlerts]);

  // Sync Attendance Marking Map when Date or Records Change
  useEffect(() => {
    const existingDateRecords = records.filter((r) => r.meetingDate === selectedMeetingDate);
    const initialMap: Record<string, { status?: AttendanceStatus; reason?: string }> = {};

    existingDateRecords.forEach((r) => {
      initialMap[r.studentId] = {
        status: r.status,
        reason: r.excusedReason || '',
      };
    });

    setMarkedMap(initialMap);
  }, [selectedMeetingDate, records]);

  // Filter Active Students
  const activeStudents = students.filter((s) => s.status === 'active');
  const isDateAlreadyRecorded = sessions.some((s) => s.meetingDate === selectedMeetingDate);

  // Mark status for student
  const handleSetStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setMarkedMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Set excused reason
  const handleSetExcusedReason = (studentId: string, reason: string) => {
    setMarkedMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: 'excused',
        reason,
      },
    }));
  };

  // Mark all unmarked active students as Present
  const handleMarkAllPresent = () => {
    const updated = { ...markedMap };
    activeStudents.forEach((student) => {
      if (!updated[student.studentId]?.status) {
        updated[student.studentId] = { status: 'present', reason: '' };
      }
    });
    setMarkedMap(updated);
    showToast('ያልተመዘገቡ ንቁ ተማሪዎች «ተገኝቷል» ተብለዋል። ለማስቀመጥ «አቴንዳንስ መዝግብ» የሚለውን ይጫኑ።');
  };

  // Save Attendance Session and Records to Database
  const handleSaveAttendance = async () => {
    if (!selectedMeetingDate) {
      showToast('እባክዎን የቀን መረጣ ያድርጉ።', 'error');
      return;
    }

    setSavingAttendance(true);

    try {
      const sessionId = `session_${selectedMeetingDate}`;
      const now = new Date().toISOString();

      // Upsert Session document
      const sessionRef = doc(db, 'attendanceSessions', sessionId);
      await setDoc(
        sessionRef,
        {
          sessionId,
          meetingDate: selectedMeetingDate,
          createdBy: currentUser?.email || 'superadmin',
          createdAt: now,
        },
        { merge: true }
      );

      // Upsert marked student records
      const recordsToSave = activeStudents.filter((s) => markedMap[s.studentId]?.status);

      const batchPromises = recordsToSave.map(async (student) => {
        const entry = markedMap[student.studentId];
        const recordId = `${sessionId}_${student.studentId}`;
        const recordRef = doc(db, 'attendanceRecords', recordId);

        return setDoc(
          recordRef,
          {
            recordId,
            sessionId,
            studentId: student.studentId,
            studentName: student.fullName,
            meetingDate: selectedMeetingDate,
            status: entry.status,
            excusedReason: entry.status === 'excused' ? entry.reason || '' : '',
            markedBy: currentUser?.email || 'superadmin',
            markedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );
      });

      await Promise.all(batchPromises);
      setSavingAttendance(false);
      showToast(`የቀን ${selectedMeetingDate} አቴንዳንስ በተሳካ ሁኔታ ተመዝግቧል!`);
    } catch (err) {
      console.error('Attendance save error:', err);
      setSavingAttendance(false);
      showToast('አቴንዳንስ መዝገቡን ማስቀመጥ አልተቻለም።', 'error');
    }
  };

  // Deactivate/Reactivate Student
  const handleToggleStudentStatus = async (student: Student) => {
    if (!student.id) return;
    const newStatus = student.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'students', student.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(
        newStatus === 'inactive'
          ? `${student.fullName} ከንቁ ተማሪዎች ዝርዝር ተወግዷል። (የቀደመ የመገኘት ታሪካቸው አልተሰረዘም)`
          : `${student.fullName} እንደገና ንቁ ተማሪ ሆኗል።`
      );
    } catch (err) {
      console.error(err);
      showToast('የተማሪውን ሁኔታ መቀየር አልተቻለም።', 'error');
    }
  };

  // Edit Student Info
  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.id) return;

    try {
      await updateDoc(doc(db, 'students', editingStudent.id), {
        fullName: editingStudent.fullName,
        age: Number(editingStudent.age),
        gender: editingStudent.gender,
        phoneNumber: editingStudent.phoneNumber || '',
        guardianPhone: editingStudent.guardianPhone || '',
        updatedAt: new Date().toISOString(),
      });
      showToast('የተማሪው መረጃ በተሳካ ሁኔታ ተስተካክሏል።');
      setEditingStudent(null);
    } catch (err) {
      console.error(err);
      showToast('መረጃውን ማስተካከል አልተቻለም።', 'error');
    }
  };

  // Manual Add Student by Admin (Sequential ID starting from 0001)
  const handleManualAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualAge) {
      showToast('እባክዎን ስም እና ዕድሜ ያስገቡ።', 'error');
      return;
    }

    try {
      let maxNumber = 0;
      students.forEach((s) => {
        if (s.studentId && typeof s.studentId === 'string') {
          const matches = s.studentId.match(/(\d+)$/);
          if (matches && matches[1]) {
            const num = parseInt(matches[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNum = maxNumber + 1;
      const studentId = `FH-${String(nextNum).padStart(4, '0')}`;
      const now = new Date().toISOString();

      const newStudent: Student = {
        studentId,
        fullName: manualName.trim(),
        age: parseInt(manualAge, 10),
        gender: manualGender,
        classId: 'ዓቢይ ክፍል (የአዋቂዎች)',
        phoneNumber: manualPhone.trim() || '',
        guardianPhone: manualGuardian.trim() || '',
        registrationDate: new Date().toLocaleDateString('am-ET'),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, 'students'), newStudent);
      showToast(`ተማሪ ${manualName} በመለያ ቁጥር ${studentId} ተመዝግቧል።`);

      setShowManualAddModal(false);
      setManualName('');
      setManualAge('');
      setManualPhone('');
      setManualGuardian('');
    } catch (err) {
      console.error(err);
      showToast('ተማሪውን መመዝገብ አልተቻለም።', 'error');
    }
  };

  // Export Report as PNG Image using html2canvas
  const handleExportPNG = async (reportTitle: string) => {
    if (!reportCaptureRef.current) return;
    setIsExportingPNG(true);

    try {
      const canvas = await html2canvas(reportCaptureRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Freihaymanot_${reportTitle}_${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      setIsExportingPNG(false);
      showToast('ሪፖርቱ በ PNG ፎቶግራፍ በተሳካ ሁኔታ ወርዷል።');
    } catch (e) {
      console.error('PNG Export error:', e);
      setIsExportingPNG(false);
      showToast('ሪፖርቱን ወደ PNG ማውረድ አልተቻለም።', 'error');
    }
  };

  // Filtered Students for Tab 1
  const filteredStudents = students.filter((s) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      s.fullName.toLowerCase().includes(query) ||
      s.studentId.toLowerCase().includes(query) ||
      (s.phoneNumber && s.phoneNumber.includes(query));

    const statusObj = markedMap[s.studentId];
    if (attendanceStatusFilter === 'unmarked') return matchesSearch && !statusObj?.status;
    if (attendanceStatusFilter === 'present') return matchesSearch && statusObj?.status === 'present';
    if (attendanceStatusFilter === 'absent') return matchesSearch && statusObj?.status === 'absent';
    if (attendanceStatusFilter === 'excused') return matchesSearch && statusObj?.status === 'excused';

    return matchesSearch;
  });

  // Calculate Reports Calculations
  const totalRecordedSessionsCount = sessions.length;
  const totalPresentRecordsCount = records.filter((r) => r.status === 'present').length;
  const totalAbsentRecordsCount = records.filter((r) => r.status === 'absent').length;
  const totalExcusedRecordsCount = records.filter((r) => r.status === 'excused').length;
  const totalAllRecordsCount = totalPresentRecordsCount + totalAbsentRecordsCount + totalExcusedRecordsCount;
  const overallAttendancePercentage =
    totalAllRecordsCount > 0 ? Math.round((totalPresentRecordsCount / totalAllRecordsCount) * 100) : 0;

  // Selected Student for Individual Report
  const activeReportStudent =
    students.find((s) => s.studentId === selectedReportStudentId) || students[0] || null;

  const activeStudentRecords = activeReportStudent
    ? records.filter((r) => r.studentId === activeReportStudent.studentId)
    : [];

  const indPresent = activeStudentRecords.filter((r) => r.status === 'present').length;
  const indAbsent = activeStudentRecords.filter((r) => r.status === 'absent').length;
  const indExcused = activeStudentRecords.filter((r) => r.status === 'excused').length;
  const indTotal = indPresent + indAbsent + indExcused;
  const indPct = indTotal > 0 ? Math.round((indPresent / indTotal) * 100) : 0;

  // Monthly Report Calculation
  const monthlyFilteredRecords = records.filter((r) => {
    if (!r.meetingDate) return false;
    const parts = r.meetingDate.split('-');
    if (parts.length < 2) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return y === selectedReportYear && m === selectedReportMonth;
  });

  const monthlyStudentStats = activeStudents.map((student) => {
    const sRecs = monthlyFilteredRecords.filter((r) => r.studentId === student.studentId);
    const p = sRecs.filter((r) => r.status === 'present').length;
    const a = sRecs.filter((r) => r.status === 'absent').length;
    const e = sRecs.filter((r) => r.status === 'excused').length;
    const tot = p + a + e;
    const pct = tot > 0 ? Math.round((p / tot) * 100) : 0;

    return {
      student,
      present: p,
      absent: a,
      excused: e,
      total: tot,
      percentage: pct,
    };
  });

  // Ranking Calculation
  const overallStudentStats = activeStudents.map((student) => {
    const sRecs = records.filter((r) => r.studentId === student.studentId);
    const p = sRecs.filter((r) => r.status === 'present').length;
    const a = sRecs.filter((r) => r.status === 'absent').length;
    const e = sRecs.filter((r) => r.status === 'excused').length;
    const tot = p + a + e;
    const pct = tot > 0 ? Math.round((p / tot) * 100) : 0;

    return {
      student,
      present: p,
      absent: a,
      excused: e,
      total: tot,
      percentage: pct,
    };
  });

  const rankingSourceList = rankingMode === 'monthly' ? monthlyStudentStats : overallStudentStats;
  const rankedStudents = [...rankingSourceList]
    .filter((item) => item.total > 0) // Fair tie-handling: exclude students with 0 recorded sessions
    .sort((a, b) => b.percentage - a.percentage || b.present - a.present);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-semibold transition-all animate-bounce ${
            toastMessage.type === 'error'
              ? 'bg-red-950 border-red-500 text-red-100'
              : 'bg-emerald-950 border-emerald-500 text-emerald-100'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Admin Dashboard Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4 sm:mb-6">
        
        {/* Organization Branding Banner */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 p-3.5 sm:p-5 text-white border-b-2 border-amber-500/40">
          <div className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center shrink-0">
                <EthiopianOrthodoxCross className="w-5 h-5 sm:w-7 sm:h-7 text-amber-300" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-amber-200 font-serif truncate">
                  የአቴንዳንስ ማስተዳደሪያ ማዕከል
                </h2>
                <p className="text-[11px] sm:text-xs text-amber-100/80 font-medium truncate">
                  የተማሪዎች መዝገብ እና የመገኘት መከታተያ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Absence Notification Bell Icon Button */}
              <button
                onClick={() => setShowNotificationModal(true)}
                className="relative p-2 sm:p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 transition-all shrink-0 cursor-pointer"
                title="የ4 ሳምንት ተከታታይ መቅረት ማሳወቂያዎች"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
                {absenceAlerts.filter((a) => a.status === 'unread').length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[10px] font-extrabold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center border-2 border-red-950 animate-pulse shadow-md">
                    {absenceAlerts.filter((a) => a.status === 'unread').length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setShowManualAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-500 hover:bg-amber-400 text-red-950 font-bold rounded-xl text-xs sm:text-sm shadow transition-all shrink-0 border border-amber-400/60"
              >
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">+ አዲስ ተማሪ</span>
                <span className="xs:hidden">+ አዲስ</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Main Tabs Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs sm:text-sm">
          <button
            onClick={() => setActiveMainTab('attendance')}
            className={`flex-1 py-3 px-2 text-center font-extrabold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeMainTab === 'attendance'
                ? 'border-red-900 text-red-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-amber-800 shrink-0" />
            <span className="hidden sm:inline">1. ተማሪዎች እና አቴንዳንስ</span>
            <span className="sm:hidden font-bold">1. አቴንዳንስ</span>
          </button>

          <button
            onClick={() => setActiveMainTab('reports')}
            className={`flex-1 py-3 px-2 text-center font-extrabold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeMainTab === 'reports'
                ? 'border-red-900 text-red-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-800 shrink-0" />
            <span className="hidden sm:inline">2. የአቴንዳንስ ሪፖርት</span>
            <span className="sm:hidden font-bold">2. ሪፖርት</span>
          </button>

          <button
            onClick={() => setActiveMainTab('settings')}
            className={`flex-1 py-3 px-2 text-center font-extrabold transition-all border-b-2 flex items-center justify-center gap-1.5 ${
              activeMainTab === 'settings'
                ? 'border-red-900 text-red-950 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4 text-amber-800 shrink-0" />
            <span className="hidden sm:inline">3. ቅንብሮች</span>
            <span className="sm:hidden font-bold">3. ቅንብሮች</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-slate-200">
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-xs sm:text-sm">የተማሪዎች እና የአቴንዳንስ መረጃ እየተጫነ ነው...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: STUDENTS & ATTENDANCE (ተማሪዎች እና አቴንዳንስ) */}
          {activeMainTab === 'attendance' && (
            <div className="space-y-3 sm:space-y-4 animate-fade-in">
              
              {/* Date & Session Status Summary Toolbar */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-2xs border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-950">
                      <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
                    </div>

                    {/* Day Dropdown */}
                    <select
                      value={ethDay}
                      onChange={(e) => setEthDay(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-300 font-bold text-slate-900 text-xs bg-white outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      {Array.from({ length: ethMonth === 13 ? 6 : 30 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d} ቀን
                        </option>
                      ))}
                    </select>

                    {/* Month Dropdown */}
                    <select
                      value={ethMonth}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        setEthMonth(m);
                        const maxD = m === 13 ? 6 : 30;
                        if (ethDay > maxD) setEthDay(maxD);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-300 font-bold text-slate-900 text-xs bg-white outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      {ETHIOPIC_MONTHS.map((mName, idx) => (
                        <option key={mName} value={idx + 1}>
                          {mName}
                        </option>
                      ))}
                    </select>

                    {/* Year Dropdown */}
                    <select
                      value={ethYear}
                      onChange={(e) => setEthYear(Number(e.target.value))}
                      className="px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs bg-white outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                      {[2016, 2017, 2018, 2019, 2020, 2021, 2022].map((y) => (
                        <option key={y} value={y}>
                          {y} ዓ.ም
                        </option>
                      ))}
                    </select>
                  </div>

                  {isDateAlreadyRecorded ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>አቴንዳንስ ተመዝግቧል</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <Clock className="w-3.5 h-3.5 text-amber-800" />
                      <span>አልተመዘገበም</span>
                    </span>
                  )}

                  <div className="bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] sm:text-xs text-slate-700 font-bold ml-auto sm:ml-0">
                    ተማሪዎች፡ <span className="text-amber-950 font-mono font-extrabold">{students.length}</span>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleMarkAllPresent}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 transition-all flex items-center justify-center gap-1 min-h-[36px]"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>ሁሉንም ተገኝቷል በል</span>
                  </button>

                  <button
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="flex-1 sm:flex-initial px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-950 to-amber-950 hover:from-red-900 hover:to-amber-900 text-amber-200 font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 border border-amber-400/40 disabled:opacity-50 min-h-[36px]"
                  >
                    {savingAttendance ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>አስቀምጥ</span>
                  </button>
                </div>

              </div>

              {/* Search and Status Filter Controls */}
              <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl shadow-2xs border border-slate-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                
                {/* Search Field */}
                <div className="relative flex-1 max-w-full sm:max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ተማሪ በስም ወይም መለያ ቁጥር ፈልግ..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-xs sm:text-sm outline-none text-slate-800"
                  />
                </div>

                {/* Mobile Scrollable Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] sm:text-xs no-scrollbar w-full sm:w-auto">
                  {(['all', 'present', 'absent', 'excused'] as const).map((filterKey) => {
                    let count = 0;
                    if (filterKey === 'all') count = activeStudents.length;
                    else if (filterKey === 'present') count = activeStudents.filter((s) => markedMap[s.studentId]?.status === 'present').length;
                    else if (filterKey === 'absent') count = activeStudents.filter((s) => markedMap[s.studentId]?.status === 'absent').length;
                    else if (filterKey === 'excused') count = activeStudents.filter((s) => markedMap[s.studentId]?.status === 'excused').length;

                    return (
                      <button
                        key={filterKey}
                        onClick={() => setAttendanceStatusFilter(filterKey)}
                        className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                          attendanceStatusFilter === filterKey
                            ? 'bg-amber-500 text-red-950 font-extrabold shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>
                          {filterKey === 'all' && 'ሁሉም'}
                          {filterKey === 'present' && 'ተገኝቷል'}
                          {filterKey === 'absent' && 'አልተገኘም'}
                          {filterKey === 'excused' && 'በምክንያት'}
                        </span>
                        <span className={`px-1 py-0.2 rounded-full text-[10px] ${
                          attendanceStatusFilter === filterKey ? 'bg-red-950 text-amber-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Student Attendance List (Mobile-First Compact Rows) */}
              <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs sm:text-sm">
                      ምንም የተማሪ መረጃ አልተገኘም።
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      const statusEntry = markedMap[student.studentId] || {};
                      const currentStatus = statusEntry.status;

                      return (
                        <div
                          key={student.studentId}
                          className="p-2.5 sm:p-3.5 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            
                            {/* Left: Student Name & Secondary Details (Single Name Display) */}
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-amber-100 text-amber-950 border border-amber-300 shrink-0">
                                {student.studentId}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                    {student.fullName}
                                  </span>
                                  {student.status === 'inactive' && (
                                    <span className="text-[9px] font-bold bg-slate-200 text-slate-600 px-1 py-0.2 rounded shrink-0">
                                      ያልተገለገለ
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                                  <span>ዕድሜ፡ {student.age}</span>
                                  {student.phoneNumber && <span>• {student.phoneNumber}</span>}
                                  {!student.phoneNumber && student.guardianPhone && (
                                    <span>• የወላጅ፡ {student.guardianPhone}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: Attendance Toggle Group & Action Menu */}
                            <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              
                              {/* 3 Status Buttons */}
                              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleSetStudentStatus(student.studentId, 'present')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 min-h-[32px] ${
                                    currentStatus === 'present'
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'text-slate-700 hover:text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>ተገኝቷል</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetStudentStatus(student.studentId, 'absent')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 min-h-[32px] ${
                                    currentStatus === 'absent'
                                      ? 'bg-red-600 text-white shadow-2xs'
                                      : 'text-slate-700 hover:text-red-700 hover:bg-red-50'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>አልተገኘም</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetStudentStatus(student.studentId, 'excused')}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 min-h-[32px] ${
                                    currentStatus === 'excused'
                                      ? 'bg-amber-600 text-white shadow-2xs'
                                      : 'text-slate-700 hover:text-amber-700 hover:bg-amber-50'
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                  <span>በምክንያት</span>
                                </button>
                              </div>

                              {/* Row Action Icons */}
                              <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1">
                                <button
                                  onClick={() => setSelectedStudentForHistory(student)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-900 hover:bg-amber-50 transition-colors"
                                  title="የመገኘት ታሪክ"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => setEditingStudent(student)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-900 hover:bg-amber-50 transition-colors"
                                  title="መረጃ አስተካክል"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleToggleStudentStatus(student)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    student.status === 'active'
                                      ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                      : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={student.status === 'active' ? 'አቦዝን' : 'አንቀሳቅስ'}
                                >
                                  {student.status === 'active' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                              </div>

                            </div>
                          </div>

                          {/* Optional Reason Input when "በምክንያት" is selected */}
                          {currentStatus === 'excused' && (
                            <div className="mt-1.5 pt-1 border-t border-amber-200/50">
                              <input
                                type="text"
                                value={statusEntry.reason || ''}
                                onChange={(e) => handleSetExcusedReason(student.studentId, e.target.value)}
                                placeholder="የመቅረት ምክንያት ያስገቡ (ለምሳሌ፡ የታመመ፣ የቤተሰብ ጉዳይ)..."
                                className="px-2.5 py-1 rounded-lg border border-amber-300 text-xs text-slate-800 bg-amber-50/70 focus:bg-white outline-none w-full sm:max-w-md"
                              />
                            </div>
                          )}

                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Sticky Action Bar on Mobile */}
              <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-xs p-3 rounded-2xl shadow-xl border border-amber-300/60 flex items-center justify-between gap-3">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 truncate">
                  የቀን {formatEthStringDate(selectedMeetingDate)} አቴንዳንስ፡
                </span>
                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-950 to-amber-950 hover:from-red-900 hover:to-amber-900 text-amber-200 font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 border border-amber-400/40 disabled:opacity-50 shrink-0"
                >
                  {savingAttendance ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>አቴንዳንስ አስቀምጥ</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: ATTENDANCE REPORTS (የአቴንዳንስ ሪፖርት) */}
          {activeMainTab === 'reports' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Reports Sub-Navigation & Export PNG Action */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                  <button
                    onClick={() => setReportSubTab('overall')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      reportSubTab === 'overall'
                        ? 'bg-amber-500 text-red-950 font-extrabold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ሀ. አጠቃላይ ሪፖርት
                  </button>

                  <button
                    onClick={() => setReportSubTab('individual')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      reportSubTab === 'individual'
                        ? 'bg-amber-500 text-red-950 font-extrabold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ለ. ነጠላ የተማሪ ሪፖርት
                  </button>

                  <button
                    onClick={() => setReportSubTab('monthly')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      reportSubTab === 'monthly'
                        ? 'bg-amber-500 text-red-950 font-extrabold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ሐ. ወርሃዊ ሪፖርት
                  </button>

                  <button
                    onClick={() => setReportSubTab('ranking')}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      reportSubTab === 'ranking'
                        ? 'bg-amber-500 text-red-950 font-extrabold shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    መ. የተማሪዎች ደረጃ (Ranking)
                  </button>
                </div>

                <button
                  onClick={() => handleExportPNG(reportSubTab)}
                  disabled={isExportingPNG}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-red-950 font-extrabold text-xs flex items-center gap-2 transition-all shadow border border-amber-400/60 disabled:opacity-50"
                >
                  {isExportingPNG ? (
                    <Loader2 className="w-4 h-4 animate-spin text-red-950" />
                  ) : (
                    <Image className="w-4 h-4" />
                  )}
                  <span>ሪፖርት በ PNG አውርድ</span>
                </button>

              </div>

              {/* Printable PNG Report Capture Area */}
              <div ref={reportCaptureRef} className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 space-y-6">
                
                {/* Clean Official Report Header in PNG */}
                <div className="border-b-2 border-amber-500/40 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <EthiopianOrthodoxCross className="w-8 h-8 text-amber-700" />
                    <div>
                      <h3 className="text-xl font-bold text-red-950 font-serif">
                        ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        የአቴንዳንስ ሪፖርት — {toEthiopianDate(new Date()).formatted}
                      </p>
                    </div>
                  </div>
                </div>

                {/* A. OVERALL REPORT */}
                {reportSubTab === 'overall' && (
                  <div className="space-y-6">
                    <h4 className="text-lg font-bold text-slate-900 font-serif border-b pb-2">
                      ሀ. አጠቃላይ የአቴንዳንስ ሪፖርት (Overall Attendance Report)
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                        <p className="text-xs font-semibold text-slate-500 uppercase">ጠቅላላ ተማሪዎች</p>
                        <h4 className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                          {activeStudents.length}
                        </h4>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                        <p className="text-xs font-semibold text-slate-500 uppercase">የስብሰባዎች ብዛት</p>
                        <h4 className="text-3xl font-extrabold text-slate-900 font-mono mt-1">
                          {totalRecordedSessionsCount}
                        </h4>
                      </div>

                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-center">
                        <p className="text-xs font-semibold text-emerald-800 uppercase">የተገኘበት ብዛት</p>
                        <h4 className="text-3xl font-extrabold text-emerald-800 font-mono mt-1">
                          {totalPresentRecordsCount}
                        </h4>
                      </div>

                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-300 text-center">
                        <p className="text-xs font-semibold text-amber-950 uppercase">አጠቃላይ የመገኘት መጠን</p>
                        <h4 className="text-3xl font-extrabold text-amber-950 font-mono mt-1">
                          {overallAttendancePercentage}%
                        </h4>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h5 className="font-bold text-sm text-slate-800 mb-3">የመገኘት ስታቲስቲክስ ክፍፍል</h5>
                      <div className="h-6 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${overallAttendancePercentage}%` }}
                          className="bg-emerald-600 h-full"
                          title="የተገኙ"
                        />
                        <div
                          style={{
                            width: `${
                              totalAllRecordsCount > 0
                                ? Math.round((totalAbsentRecordsCount / totalAllRecordsCount) * 100)
                                : 0
                            }%`,
                          }}
                          className="bg-red-600 h-full"
                          title="የቀሩ"
                        />
                        <div
                          style={{
                            width: `${
                              totalAllRecordsCount > 0
                                ? Math.round((totalExcusedRecordsCount / totalAllRecordsCount) * 100)
                                : 0
                            }%`,
                          }}
                          className="bg-amber-500 h-full"
                          title="በምክንያት"
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-600 mt-2 font-medium">
                        <span className="text-emerald-700">● የተገኙ፡ {totalPresentRecordsCount}</span>
                        <span className="text-red-700">● የቀሩ፡ {totalAbsentRecordsCount}</span>
                        <span className="text-amber-800">● በምክንያት፡ {totalExcusedRecordsCount}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* B. INDIVIDUAL STUDENT REPORT */}
                {reportSubTab === 'individual' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <h4 className="text-lg font-bold text-slate-900 font-serif">
                        ለ. ነጠላ የተማሪ ሪፖርት (Individual Student Report)
                      </h4>

                      <select
                        value={activeReportStudent?.studentId || ''}
                        onChange={(e) => setSelectedReportStudentId(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none font-bold"
                      >
                        {activeStudents.map((s) => (
                          <option key={s.studentId} value={s.studentId}>
                            {s.fullName} ({s.studentId})
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeReportStudent ? (
                      <div className="space-y-4">
                        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 flex flex-wrap justify-between items-center gap-3">
                          <div>
                            <h4 className="font-bold text-base text-slate-900">{activeReportStudent.fullName}</h4>
                            <p className="text-xs text-slate-600">
                              መለያ ቁጥር፡ <span className="font-mono font-bold text-amber-900">{activeReportStudent.studentId}</span> | ዕድሜ፡ {activeReportStudent.age} ዓመት
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-extrabold text-amber-950 font-mono">
                              {indPct}%
                            </span>
                            <p className="text-xs text-slate-500 font-medium">የመገኘት መጠን</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center text-xs">
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 font-bold">
                            የተገኙበት፡ <span className="font-mono text-base">{indPresent}</span>
                          </div>
                          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-800 font-bold">
                            የቀሩበት፡ <span className="font-mono text-base">{indAbsent}</span>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 font-bold">
                            በምክንያት፡ <span className="font-mono text-base">{indExcused}</span>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100 border rounded-xl overflow-hidden text-xs">
                          <div className="bg-slate-100 p-3 font-bold text-slate-700">የአቴንዳንስ ታሪክ በቅደም ተከተል</div>
                          {activeStudentRecords.length === 0 ? (
                            <div className="p-4 text-center text-slate-500">ምንም የተመዘገበ ታሪክ አልተገኘም።</div>
                          ) : (
                            activeStudentRecords.map((r) => (
                              <div key={r.recordId} className="p-3 flex items-center justify-between">
                                <span className="font-bold text-slate-800">{formatEthStringDate(r.meetingDate)}</span>
                                <div className="flex items-center gap-2">
                                  {r.excusedReason && (
                                    <span className="text-slate-500 italic font-normal">({r.excusedReason})</span>
                                  )}
                                  <span
                                    className={`font-bold px-2.5 py-0.5 rounded-full ${
                                      r.status === 'present'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : r.status === 'absent'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {r.status === 'present' && 'ተገኝቷል'}
                                    {r.status === 'absent' && 'አልተገኘም'}
                                    {r.status === 'excused' && 'በምክንያት'}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center py-6 text-slate-500">እባክዎን ተማሪ ይምረጡ።</p>
                    )}
                  </div>
                )}

                {/* C. MONTHLY REPORT */}
                {reportSubTab === 'monthly' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <h4 className="text-lg font-bold text-slate-900 font-serif">
                        ሐ. ወርሃዊ የአቴንዳንስ ሪፖርት (Monthly Attendance Report)
                      </h4>

                      <div className="flex items-center gap-2">
                        <select
                          value={selectedReportMonth}
                          onChange={(e) => setSelectedReportMonth(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold"
                        >
                          {ETHIOPIC_MONTHS.map((mName, idx) => (
                            <option key={mName} value={idx + 1}>
                              {mName} ({idx + 1}ኛው ወር)
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedReportYear}
                          onChange={(e) => setSelectedReportYear(Number(e.target.value))}
                          className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold font-mono"
                        >
                          {[2016, 2017, 2018, 2019, 2020, 2021, 2022].map((y) => (
                            <option key={y} value={y}>
                              {y} ዓ.ም
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-slate-700">
                            <th className="p-3">መለያ ቁጥር</th>
                            <th className="p-3">ተማሪ ስም</th>
                            <th className="p-3 text-center">የተገኙበት</th>
                            <th className="p-3 text-center">የቀሩበት</th>
                            <th className="p-3 text-center">በምክንያት</th>
                            <th className="p-3 text-center">የወሩ የመገኘት መጠን (%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {monthlyStudentStats.map((item) => (
                            <tr key={item.student.studentId} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-amber-900">{item.student.studentId}</td>
                              <td className="p-3 font-bold text-slate-800">{item.student.fullName}</td>
                              <td className="p-3 text-center font-bold text-emerald-700 font-mono">{item.present}</td>
                              <td className="p-3 text-center font-bold text-red-700 font-mono">{item.absent}</td>
                              <td className="p-3 text-center font-bold text-amber-800 font-mono">{item.excused}</td>
                              <td className="p-3 text-center font-extrabold font-mono text-slate-900">{item.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* D. RANKING REPORT */}
                {reportSubTab === 'ranking' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                      <h4 className="text-lg font-bold text-slate-900 font-serif">
                        መ. የተማሪዎች የመገኘት ደረጃ (Overall Student Ranking)
                      </h4>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRankingMode('overall')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            rankingMode === 'overall'
                              ? 'bg-amber-500 text-red-950 font-extrabold shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          የጠቅላላ ጊዜ ደረጃ
                        </button>
                        <button
                          onClick={() => setRankingMode('monthly')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            rankingMode === 'monthly'
                              ? 'bg-amber-500 text-red-950 font-extrabold shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          የወሩ ደረጃ
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {rankedStudents.length === 0 ? (
                        <p className="text-center py-6 text-slate-500 text-xs">
                          ደረጃ ለማውጣት በቂ የመገኘት መዝገብ አልተገኘም።
                        </p>
                      ) : (
                        rankedStudents.map((item, index) => {
                          const rankNum = index + 1;
                          return (
                            <div
                              key={item.student.studentId}
                              className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                                rankNum === 1
                                  ? 'bg-amber-100/80 border-amber-400 font-bold text-amber-950'
                                  : rankNum === 2
                                  ? 'bg-slate-100 border-slate-300 font-semibold text-slate-800'
                                  : rankNum === 3
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold font-mono text-xs ${
                                    rankNum === 1
                                      ? 'bg-amber-500 text-red-950'
                                      : rankNum === 2
                                      ? 'bg-slate-300 text-slate-800'
                                      : rankNum === 3
                                      ? 'bg-amber-200 text-amber-900'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {rankNum}
                                </span>
                                <div>
                                  <span className="font-bold text-sm">{item.student.fullName}</span>
                                  <span className="ml-2 font-mono text-slate-500">({item.student.studentId})</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-base font-extrabold font-mono">{item.percentage}%</span>
                                <p className="text-[10px] text-slate-500">
                                  {item.present} የተገኙ / {item.total} ቀናት
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 3: SETTINGS (ቅንብሮች) */}
          {activeMainTab === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                
                <h3 className="text-lg font-bold text-slate-900 font-serif border-b pb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-700" />
                  <span>የአስተዳዳሪ ቅንብሮች (Settings)</span>
                </h3>

                {/* Admin Profile Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-sm">
                  <h4 className="font-bold text-slate-800">1. የአስተዳዳሪ መለያ መረጃ</h4>
                  <div className="flex justify-between border-b border-slate-200 pb-2 text-xs">
                    <span className="text-slate-500">የተጠቃሚ ስም/ኢሜይል፡</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {currentUser?.email || 'superadmin'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2 text-xs">
                    <span className="text-slate-500">ሚና (Role)፡</span>
                    <span className="font-bold text-emerald-700">ዋና አስተዳዳሪ (Administrator)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">የዳታቤዝ ሁኔታ፡</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> የተገናኘ (Cloud Firestore)
                    </span>
                  </div>
                </div>

                {/* Organization Details */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 text-sm">2. የሰንበት ትምህርት ቤት መረጃ</h4>
                  <p><span className="font-semibold text-slate-600">ስም፡</span> ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት</p>
                  <p><span className="font-semibold text-slate-600">የስርዓት አይነት፡</span> የተማሪዎች ምዝገባ እና የመገኘት መዝገብ ማስተዳደሪያ</p>
                </div>

                {/* Logout Action */}
                <div className="pt-2">
                  <button
                    onClick={logout}
                    className="w-full py-3 rounded-xl bg-red-950 hover:bg-red-900 text-amber-200 font-bold text-sm shadow transition-all flex items-center justify-center gap-2 border border-amber-500/40"
                  >
                    <LogOut className="w-4 h-4 text-amber-300" />
                    <span>ከአስተዳዳሪ መለያው ውጣ (Logout)</span>
                  </button>
                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Student Attendance History Modal */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden">
            <div className="bg-red-950 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <div>
                <h3 className="font-bold text-amber-200 text-base font-serif">የተማሪ የመገኘት ታሪክ</h3>
                <p className="text-xs text-amber-100/80 mt-0.5">
                  {selectedStudentForHistory.fullName} ({selectedStudentForHistory.studentId})
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="p-1 rounded text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-2 text-xs">
              {records.filter((r) => r.studentId === selectedStudentForHistory.studentId).length === 0 ? (
                <p className="text-center py-6 text-slate-500">
                  እስካሁን ምንም የተመዘገበ የመገኘት ታሪክ አልተገኘም።
                </p>
              ) : (
                records
                  .filter((r) => r.studentId === selectedStudentForHistory.studentId)
                  .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
                  .map((rec) => (
                    <div
                      key={rec.recordId}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-800">{rec.meetingDate}</span>
                        {rec.excusedReason && (
                          <span className="ml-2 text-slate-500 italic">({rec.excusedReason})</span>
                        )}
                      </div>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full ${
                          rec.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {rec.status === 'present' && 'ተገኝቷል'}
                        {rec.status === 'absent' && 'አልተገኘም'}
                        {rec.status === 'excused' && 'በምክንያት'}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Student Info */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-md w-full overflow-hidden">
            <div className="bg-red-950 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <h3 className="font-bold text-amber-200 text-base font-serif">የተማሪ መረጃ ማስተካከያ</h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="p-5 space-y-4 text-sm">
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">ሙሉ ስም</label>
                <input
                  type="text"
                  required
                  value={editingStudent.fullName}
                  onChange={(e) => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-slate-700 mb-1">ዕድሜ</label>
                  <input
                    type="number"
                    required
                    value={editingStudent.age}
                    onChange={(e) => setEditingStudent({ ...editingStudent, age: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-700 mb-1">ጾታ</label>
                  <select
                    value={editingStudent.gender || 'ወንድ'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none bg-white"
                  >
                    <option value="ወንድ">ወንድ</option>
                    <option value="ሴት">ሴት</option>
                    <option value="ያልተጠቀሰ">ያልተጠቀሰ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">ስልክ ቁጥር</label>
                <input
                  type="tel"
                  value={editingStudent.phoneNumber || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">የወላጅ ስልክ</label>
                <input
                  type="tel"
                  value={editingStudent.guardianPhone || ''}
                  onChange={(e) => setEditingStudent({ ...editingStudent, guardianPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-red-950 font-bold text-xs shadow"
                >
                  መረጃውን አስቀምጥ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Student Add Modal */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-md w-full overflow-hidden">
            <div className="bg-red-950 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <h3 className="font-bold text-amber-200 text-base font-serif">አዲስ ተማሪ በእጅ መመዝገቢያ</h3>
              <button
                onClick={() => setShowManualAddModal(false)}
                className="p-1 rounded text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualAddStudent} className="p-5 space-y-4 text-sm">
              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  1. ሙሉ ስም <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="ሙሉ ስም ያስገቡ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-xs text-slate-700 mb-1">
                    2. ዕድሜ <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={manualAge}
                    onChange={(e) => setManualAge(e.target.value)}
                    placeholder="ዕድሜ"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-xs text-slate-700 mb-1">3. ጾታ</label>
                  <select
                    value={manualGender}
                    onChange={(e) => setManualGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none bg-white"
                  >
                    <option value="ወንድ">ወንድ</option>
                    <option value="ሴት">ሴት</option>
                    <option value="ያልተጠቀሰ">ያልተጠቀሰ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  4. ስልክ ቁጥር (አማራጭ)
                </label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="09..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  5. የወላጅ ስልክ (አማራጭ)
                </label>
                <input
                  type="tel"
                  value={manualGuardian}
                  onChange={(e) => setManualGuardian(e.target.value)}
                  placeholder="09..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  ሰርዝ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-950 hover:bg-red-900 text-amber-200 font-bold text-xs shadow border border-amber-400/40"
                >
                  ተማሪውን መዝግብ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4 Consecutive Absence Notifications Modal */}
      <AbsenceNotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        alerts={absenceAlerts}
        students={students}
        adminEmail={currentUser?.email || undefined}
        onSelectStudentHistory={(student) => {
          setSelectedStudentForHistory(student);
        }}
      />

    </div>
  );
};
