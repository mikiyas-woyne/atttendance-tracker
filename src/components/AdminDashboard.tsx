import React, { useState, useEffect } from 'react';
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
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Student, AttendanceSession, AttendanceRecord, AttendanceStatus } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Edit,
  UserMinus,
  UserCheck2,
  PlusCircle,
  Printer,
  AlertTriangle,
  ChevronRight,
  Info,
  Check,
  X,
  Loader2,
  FileSpreadsheet,
  History,
} from 'lucide-react';

const CLASS_OPTIONS = [
  'ሕፃናት (ከ4-8 ዓመት)',
  'መካከለኛ (ከ9-13 ዓመት)',
  'ወጣቶች (ከ14-18 ዓመት)',
  'ዓቢይ ክፍል (ከ19 ዓመት በላይ)',
  'ቅዱስ ዮሐንስ ክፍል',
  'ቅዱስ ዳዊት ክፍል',
];

export const AdminDashboard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'students' | 'attendance' | 'reports'>('overview');

  // Firestore Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Today Date String YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<string>('ሁሉም ክፍሎች');

  // Toast alert
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Student Search / Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [classFilter, setClassFilter] = useState<string>('ሁሉም ክፍሎች');

  // Attendance Marking State: map studentId -> AttendanceStatus
  const [markedMap, setMarkedMap] = useState<Record<string, AttendanceStatus>>({});
  const [savingAttendance, setSavingAttendance] = useState<boolean>(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'unmarked' | 'present' | 'absent' | 'excused'>('all');

  // Modals & Selection
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [showManualAddModal, setShowManualAddModal] = useState<boolean>(false);

  // Manual Add Form State
  const [manualName, setManualName] = useState<string>('');
  const [manualAge, setManualAge] = useState<string>('');
  const [manualGender, setManualGender] = useState<'ወንድ' | 'ሴት' | 'ያልተጠቀሰ'>('ወንድ');
  const [manualClass, setManualClass] = useState<string>(CLASS_OPTIONS[0]);
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualGuardian, setManualGuardian] = useState<string>('');

  // Report Date Range State
  const [reportStartDate, setReportStartDate] = useState<string>(
    new Date(Date.now() - 30 * 81000000).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState<string>(todayStr);
  const [reportClass, setReportClass] = useState<string>('ሁሉም ክፍሎች');

  // Show Toast Function
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const { isAdmin, currentUser } = useAuth();

  // 1. Subscribe to Firestore Collections
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
        console.warn('Students snapshot info:', error?.message || error);
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
        console.warn('Sessions snapshot info:', error?.message || error);
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
        console.warn('Records snapshot info:', error?.message || error);
      }
    );

    return () => {
      unsubStudents();
      unsubSessions();
      unsubRecords();
    };
  }, [isAdmin, currentUser]);

  // Sync Attendance Map when selectedMeetingDate or selectedClass or records change
  useEffect(() => {
    const todayRecords = records.filter(
      (r) =>
        r.meetingDate === selectedMeetingDate &&
        (selectedClass === 'ሁሉም ክፍሎች' || r.classId === selectedClass)
    );

    const initialMap: Record<string, AttendanceStatus> = {};
    todayRecords.forEach((r) => {
      initialMap[r.studentId] = r.status;
    });

    setMarkedMap(initialMap);
  }, [selectedMeetingDate, selectedClass, records]);

  // Calculated Statistics
  const totalStudentsCount = students.length;
  const activeStudents = students.filter((s) => s.status === 'active');
  const activeStudentsCount = activeStudents.length;

  const todayRecords = records.filter((r) => r.meetingDate === todayStr);
  const presentTodayCount = todayRecords.filter((r) => r.status === 'present').length;
  const absentTodayCount = todayRecords.filter((r) => r.status === 'absent').length;
  const percentageToday =
    activeStudentsCount > 0 ? Math.round((presentTodayCount / activeStudentsCount) * 100) : 0;

  // Filtered Students for Management Tab
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.phoneNumber && student.phoneNumber.includes(searchTerm));

    const matchesStatus =
      statusFilter === 'all' || student.status === statusFilter;

    const matchesClass =
      classFilter === 'ሁሉም ክፍሎች' || student.classId === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Action: Deactivate/Reactivate Student
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
          ? `${student.fullName} ከንቁ ተማሪዎች ዝርዝር ተወግዷል። (የቀደመ የመገኘት ታሪክ አልተሰረዘም)`
          : `${student.fullName} እንደገና ንቁ ተማሪ ሆኗል።`
      );
    } catch (err) {
      console.error(err);
      showToast('የተማሪውን ሁኔታ መቀየር አልተቻለም።', 'error');
    }
  };

  // Action: Save Edit Student Modal
  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editingStudent.id) return;

    try {
      await updateDoc(doc(db, 'students', editingStudent.id), {
        fullName: editingStudent.fullName,
        age: Number(editingStudent.age),
        gender: editingStudent.gender,
        classId: editingStudent.classId,
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

  // Action: Add Student Manually by Admin
  const handleManualAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualAge) {
      showToast('እባክዎን ስም እና ዕድሜ ያስገቡ።', 'error');
      return;
    }

    try {
      const year = new Date().getFullYear();
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const studentId = `FH-${year}-${randomDigits}`;
      const now = new Date().toISOString();

      const newStudent: Student = {
        studentId,
        fullName: manualName.trim(),
        age: parseInt(manualAge, 10),
        gender: manualGender,
        classId: manualClass,
        phoneNumber: manualPhone.trim() || '',
        guardianPhone: manualGuardian.trim() || '',
        registrationDate: new Date().toLocaleDateString('am-ET'),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, 'students'), newStudent);
      showToast(`ተማሪ ${manualName} በመለያ ቁጥር ${studentId} ተመዝግቧል።`);

      // Reset
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

  // Action: Mark All Present
  const handleMarkAllPresent = () => {
    const updatedMap = { ...markedMap };
    activeStudents.forEach((student) => {
      if (selectedClass === 'ሁሉም ክፍሎች' || student.classId === selectedClass) {
        updatedMap[student.studentId] = 'present';
      }
    });
    setMarkedMap(updatedMap);
    showToast('ሁሉም ንቁ ተማሪዎች «ተገኝቷል» ተብለው ተመርጠዋል። ለመመዝገብ «መገኘትን መዝግብ» የሚለውን ይጫኑ።');
  };

  // Action: Save Attendance Records to Firestore
  const handleSaveAttendance = async () => {
    if (!selectedMeetingDate) {
      showToast('እባክዎን የቀን መረጣ ያድርጉ።', 'error');
      return;
    }

    setSavingAttendance(true);

    try {
      const sessionId = `session_${selectedMeetingDate}_${selectedClass.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const now = new Date().toISOString();

      // Ensure session document exists
      const sessionRef = doc(db, 'attendanceSessions', sessionId);
      await setDoc(
        sessionRef,
        {
          sessionId,
          meetingDate: selectedMeetingDate,
          classId: selectedClass,
          createdBy: 'admin',
          createdAt: now,
        },
        { merge: true }
      );

      // Save each marked student record
      const activeStudentsToSave = activeStudents.filter(
        (s) => selectedClass === 'ሁሉም ክፍሎች' || s.classId === selectedClass
      );

      const batchPromises = activeStudentsToSave.map(async (student) => {
        const status = markedMap[student.studentId] || 'absent';
        const recordId = `${sessionId}_${student.studentId}`;
        const recordRef = doc(db, 'attendanceRecords', recordId);

        return setDoc(
          recordRef,
          {
            recordId,
            sessionId,
            studentId: student.studentId,
            studentName: student.fullName,
            classId: student.classId || '',
            meetingDate: selectedMeetingDate,
            status,
            markedBy: 'admin',
            markedAt: now,
            updatedAt: now,
          },
          { merge: true }
        );
      });

      await Promise.all(batchPromises);
      setSavingAttendance(false);
      showToast(`የቀን ${selectedMeetingDate} የመገኘት መዝገብ በተሳካ ሁኔታ ተመዝግቧል!`);
    } catch (err) {
      console.error('Attendance save error:', err);
      setSavingAttendance(false);
      showToast('የመገኘት መዝገብ ማስቀመጥ አልተቻለም።', 'error');
    }
  };

  // Export Student List to CSV
  const handleExportStudentsCSV = () => {
    if (students.length === 0) return;
    const headers = ['መለያ ቁጥር,ሙሉ ስም,ዕድሜ,ጾታ,ክፍል,ስልክ,የወላጅ ስልክ,ሁኔታ,የተመዘገበበት ቀን'];
    const rows = students.map((s) =>
      `"${s.studentId}","${s.fullName}",${s.age},"${s.gender || ''}","${s.classId || ''}","${s.phoneNumber || ''}","${s.guardianPhone || ''}","${s.status === 'active' ? 'ንቁ' : 'ያልተገለገለ'}","${s.registrationDate}"`
    );

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Freihaymanot_Students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Reports Data
  const filteredReportRecords = records.filter((r) => {
    const inDateRange = r.meetingDate >= reportStartDate && r.meetingDate <= reportEndDate;
    const inClass = reportClass === 'ሁሉም ክፍሎች' || r.classId === reportClass;
    return inDateRange && inClass;
  });

  const uniqueReportMeetingDates = Array.from(
    new Set(filteredReportRecords.map((r) => r.meetingDate))
  );

  const totalSessionsInReport = uniqueReportMeetingDates.length;

  const studentReportList = activeStudents
    .filter((s) => reportClass === 'ሁሉም ክፍሎች' || s.classId === reportClass)
    .map((student) => {
      const studentRecs = filteredReportRecords.filter((r) => r.studentId === student.studentId);
      const presentCount = studentRecs.filter((r) => r.status === 'present').length;
      const absentCount = studentRecs.filter((r) => r.status === 'absent').length;
      const excusedCount = studentRecs.filter((r) => r.status === 'excused').length;

      const totalRecorded = presentCount + absentCount + excusedCount;
      const pct = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0;

      return {
        student,
        presentCount,
        absentCount,
        excusedCount,
        totalRecorded,
        percentage: pct,
        isFrequentAbsentee: totalRecorded >= 2 && pct < 50,
      };
    });

  // Export Attendance Report CSV
  const handleExportAttendanceReportCSV = () => {
    if (studentReportList.length === 0) return;
    const headers = ['መለያ ቁጥር,ሙሉ ስም,ክፍል,የተገኙበት,የቀሩበት,በምክንያት,የመገኘት መጠን (%)'];
    const rows = studentReportList.map(
      (item) =>
        `"${item.student.studentId}","${item.student.fullName}","${item.student.classId || ''}",${item.presentCount},${item.absentCount},${item.excusedCount},${item.percentage}%`
    );

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Freihaymanot_Attendance_Report_${reportStartDate}_to_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Toast Notification */}
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
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Admin Dashboard Header / Tabs */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 p-6 text-white border-b-2 border-amber-500/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-amber-200 font-serif">
                የአስተዳዳሪ ማዕከል (Admin Dashboard)
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/80 mt-1">
                ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት — የተማሪዎች መረጃ እና የመገኘት መዝገብ ማስተዳደሪያ
              </p>
            </div>
            
            <button
              onClick={() => setShowManualAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-red-950 font-bold rounded-xl text-sm shadow transition-all self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              <span>አዲስ ተማሪ በእጅ መዝግብ</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
              activeSubTab === 'overview'
                ? 'border-red-900 text-red-950 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>አጠቃላይ መረጃ</span>
          </button>

          <button
            onClick={() => setActiveSubTab('students')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
              activeSubTab === 'students'
                ? 'border-red-900 text-red-950 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>የተማሪዎች መዝገብ ({totalStudentsCount})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
              activeSubTab === 'attendance'
                ? 'border-red-900 text-red-950 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>የመገኘት መዝገብ</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
              activeSubTab === 'reports'
                ? 'border-red-900 text-red-950 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>የመገኘት ሪፖርት</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-md border border-slate-200">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">የተማሪዎች መረጃ ከማዕከላዊ ዳታቤዝ እየተጫነ ነው...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      ጠቅላላ የተመዘገቡ ተማሪዎች
                    </p>
                    <h3 className="text-3xl font-extrabold text-slate-900 mt-1 font-mono">
                      {totalStudentsCount}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">({activeStudentsCount} ንቁ ተማሪዎች)</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-800">
                    <Users className="w-7 h-7" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                      ዛሬ የተገኙ
                    </p>
                    <h3 className="text-3xl font-extrabold text-emerald-700 mt-1 font-mono">
                      {presentTodayCount}
                    </h3>
                    <p className="text-xs text-emerald-600 mt-1">የዛሬ መገኘት</p>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-800">
                    <UserCheck className="w-7 h-7" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                      ዛሬ ያልተገኙ
                    </p>
                    <h3 className="text-3xl font-extrabold text-red-700 mt-1 font-mono">
                      {absentTodayCount}
                    </h3>
                    <p className="text-xs text-red-600 mt-1">የዛሬ ቀሪ</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-2xl text-red-800">
                    <UserX className="w-7 h-7" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                      የዛሬ የመገኘት መጠን
                    </p>
                    <h3 className="text-3xl font-extrabold text-amber-900 mt-1 font-mono">
                      {percentageToday}%
                    </h3>
                    <p className="text-xs text-amber-700 mt-1">የመገኘት መቶኛ</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-900">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                </div>
              </div>

              {/* Quick Actions & Recent Meetings */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recent Attendance Sessions List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 font-serif">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <span>የቅርብ ጊዜ የመገኘት መዝገብ ክፍለ-ጊዜያት</span>
                  </h3>

                  {sessions.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                      <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">እስካሁን የመገኘት መዝገብ አልተመዘገበም።</p>
                      <button
                        onClick={() => setActiveSubTab('attendance')}
                        className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-red-950 text-xs font-bold rounded-lg"
                      >
                        የዛሬ መገኘት መዝግብ
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sessions
                        .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
                        .slice(0, 5)
                        .map((sess) => {
                          const sessRecords = records.filter((r) => r.sessionId === sess.sessionId);
                          const pCount = sessRecords.filter((r) => r.status === 'present').length;
                          const aCount = sessRecords.filter((r) => r.status === 'absent').length;

                          return (
                            <div key={sess.sessionId} className="py-3 flex items-center justify-between">
                              <div>
                                <span className="text-sm font-bold text-slate-800 font-mono">
                                  {sess.meetingDate}
                                </span>
                                <span className="ml-3 text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-medium">
                                  {sess.classId}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs font-medium">
                                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                  {pCount} የተገኙ
                                </span>
                                <span className="text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                                  {aCount} የቀሩ
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedMeetingDate(sess.meetingDate);
                                    setSelectedClass(sess.classId);
                                    setActiveSubTab('attendance');
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-800"
                                  title="ይህንን ቀን ክፈት"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Quick Shortcuts */}
                <div className="bg-gradient-to-b from-red-950 to-amber-950 rounded-2xl shadow-sm p-6 text-white border border-amber-500/30">
                  <h3 className="text-lg font-bold text-amber-200 mb-4 font-serif">
                    ፈጣን ተግባራት
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setActiveSubTab('attendance')}
                      className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-red-950 font-bold text-sm shadow transition-all flex items-center justify-between"
                    >
                      <span>የዛሬ መገኘት መዝግብ</span>
                      <CheckCircle className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => setShowManualAddModal(true)}
                      className="w-full py-3 px-4 rounded-xl bg-red-900/80 hover:bg-red-800 text-amber-100 font-bold text-sm border border-amber-500/30 transition-all flex items-center justify-between"
                    >
                      <span>አዲስ ተማሪ መዝግብ</span>
                      <PlusCircle className="w-5 h-5 text-amber-300" />
                    </button>

                    <button
                      onClick={() => setActiveSubTab('reports')}
                      className="w-full py-3 px-4 rounded-xl bg-red-900/80 hover:bg-red-800 text-amber-100 font-bold text-sm border border-amber-500/30 transition-all flex items-center justify-between"
                    >
                      <span>የመገኘት ሪፖርት ተመልከት</span>
                      <FileSpreadsheet className="w-5 h-5 text-amber-300" />
                    </button>

                    <button
                      onClick={handleExportStudentsCSV}
                      className="w-full py-3 px-4 rounded-xl bg-red-900/80 hover:bg-red-800 text-amber-100 font-bold text-sm border border-amber-500/30 transition-all flex items-center justify-between"
                    >
                      <span>የተማሪዎች ዝርዝር CSV አውርድ</span>
                      <Download className="w-5 h-5 text-amber-300" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: REGISTERED STUDENTS MANAGEMENT */}
          {activeSubTab === 'students' && (
            <div className="space-y-5 animate-fade-in">
              {/* Search and Filters Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="በስም ወይም በመለያ ቁጥር ፈልግ..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm outline-none"
                  />
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    <option value="ሁሉም ክፍሎች">ሁሉም ክፍሎች</option>
                    {CLASS_OPTIONS.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                  >
                    <option value="all">ሁሉም ሁኔታዎች</option>
                    <option value="active">ንቁ ብቻ</option>
                    <option value="inactive">ያልተገለገለ ብቻ</option>
                  </select>

                  <button
                    onClick={handleExportStudentsCSV}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Student Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
                        <th className="p-3.5">መለያ ቁጥር</th>
                        <th className="p-3.5">ሙሉ ስም</th>
                        <th className="p-3.5">ዕድሜ</th>
                        <th className="p-3.5">ክፍል</th>
                        <th className="p-3.5">የተመዘገበበት ቀን</th>
                        <th className="p-3.5">ሁኔታ</th>
                        <th className="p-3.5 text-right">ተግባራት</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-slate-500">
                            ምንም የተማሪ መረጃ አልተገኘም።
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => (
                          <tr key={student.id || student.studentId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-amber-900">
                              {student.studentId}
                            </td>
                            <td className="p-3.5 font-medium">{student.fullName}</td>
                            <td className="p-3.5">{student.age} ዓመት</td>
                            <td className="p-3.5">
                              <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-md">
                                {student.classId || 'ያልተገለጸ'}
                              </span>
                            </td>
                            <td className="p-3.5 text-xs text-slate-500">{student.registrationDate}</td>
                            <td className="p-3.5">
                              {student.status === 'active' ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                                  <Check className="w-3 h-3" /> ንቁ
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200">
                                  <X className="w-3 h-3" /> ያልተገለገለ
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right space-x-1 space-x-reverse">
                              <button
                                onClick={() => setSelectedStudentForHistory(student)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                                title="የመገኘት ታሪክ ተመልከት"
                              >
                                <History className="w-3.5 h-3.5 inline mr-1" />
                                ታሪክ
                              </button>

                              <button
                                onClick={() => setEditingStudent(student)}
                                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors"
                                title="መረጃ አስተካክል"
                              >
                                <Edit className="w-3.5 h-3.5 inline mr-1" />
                                አስተካክል
                              </button>

                              <button
                                onClick={() => handleToggleStudentStatus(student)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                  student.status === 'active'
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                                title={student.status === 'active' ? 'አቦዝን' : 'እንደገና አንቀሳቅስ'}
                              >
                                {student.status === 'active' ? 'አቦዝን' : 'አንቀሳቅስ'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE TRACKING */}
          {activeSubTab === 'attendance' && (
            <div className="space-y-5 animate-fade-in">
              {/* Session Date & Class Controls */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      የስብሰባ ቀን (Date)
                    </label>
                    <input
                      type="date"
                      value={selectedMeetingDate}
                      onChange={(e) => setSelectedMeetingDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      የትምህርት ክፍል/ቡድን
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="ሁሉም ክፍሎች">ሁሉም ክፍሎች</option>
                      {CLASS_OPTIONS.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={handleMarkAllPresent}
                    className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    <span>ሁሉንም ተገኝቷል በል</span>
                  </button>

                  <button
                    onClick={handleSaveAttendance}
                    disabled={savingAttendance}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-950 to-amber-950 hover:from-red-900 hover:to-amber-900 text-amber-200 font-bold text-sm shadow-md transition-all flex items-center gap-2 border border-amber-400/40 disabled:opacity-50"
                  >
                    {savingAttendance ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>መገኘትን መዝግብ</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Pills & Count Summaries */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-600 mr-2">ማጣሪያ፡</span>
                  {(['all', 'unmarked', 'present', 'absent', 'excused'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      onClick={() => setAttendanceFilter(filterKey)}
                      className={`px-3 py-1 rounded-lg font-bold capitalize transition-all ${
                        attendanceFilter === filterKey
                          ? 'bg-amber-500 text-red-950 shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filterKey === 'all' && 'ሁሉም'}
                      {filterKey === 'unmarked' && 'ያልተመዘገቡ'}
                      {filterKey === 'present' && 'ተገኝቷል'}
                      {filterKey === 'absent' && 'አልተገኘም'}
                      {filterKey === 'excused' && 'በምክንያት'}
                    </button>
                  ))}
                </div>

                {/* Summary Badges */}
                <div className="flex items-center gap-3 font-semibold">
                  <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    ተገኝቷል፡ {Object.values(markedMap).filter((v) => v === 'present').length}
                  </span>
                  <span className="text-red-700 bg-red-100 px-2.5 py-0.5 rounded-full">
                    አልተገኘም፡ {Object.values(markedMap).filter((v) => v === 'absent').length}
                  </span>
                  <span className="text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    በምክንያት፡ {Object.values(markedMap).filter((v) => v === 'excused').length}
                  </span>
                </div>
              </div>

              {/* Attendance Marking Student List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {activeStudents
                    .filter((student) => {
                      if (selectedClass !== 'ሁሉም ክፍሎች' && student.classId !== selectedClass) return false;
                      const status = markedMap[student.studentId];
                      if (attendanceFilter === 'unmarked') return !status;
                      if (attendanceFilter === 'present') return status === 'present';
                      if (attendanceFilter === 'absent') return status === 'absent';
                      if (attendanceFilter === 'excused') return status === 'excused';
                      return true;
                    })
                    .map((student) => {
                      const currentStatus = markedMap[student.studentId];

                      return (
                        <div
                          key={student.studentId}
                          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                {student.fullName}
                              </span>
                              <span className="font-mono text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {student.studentId}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex gap-3">
                              <span>ክፍል፡ {student.classId}</span>
                              <span>ዕድሜ፡ {student.age} ዓመት</span>
                            </div>
                          </div>

                          {/* Status Toggles */}
                          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() =>
                                setMarkedMap({ ...markedMap, [student.studentId]: 'present' })
                              }
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                currentStatus === 'present'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-emerald-700'
                              }`}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>ተገኝቷል</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setMarkedMap({ ...markedMap, [student.studentId]: 'absent' })
                              }
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                currentStatus === 'absent'
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-red-700'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>አልተገኘም</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setMarkedMap({ ...markedMap, [student.studentId]: 'excused' })
                              }
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                currentStatus === 'excused'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-amber-700'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>በምክንያት</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Bottom Floating Save Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  የቀን {selectedMeetingDate} የመገኘት መዝገብን ለማስቀመጥ ወይም ለማዘመን ይጫኑ።
                </span>
                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="px-6 py-2.5 rounded-xl bg-red-950 hover:bg-red-900 text-amber-200 font-bold text-sm shadow transition-all flex items-center gap-2 border border-amber-400/40 disabled:opacity-50"
                >
                  {savingAttendance ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>መገኘትን መዝግብ</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ATTENDANCE REPORTS */}
          {activeSubTab === 'reports' && (
            <div className="space-y-6 animate-fade-in">
              {/* Report Controls */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ከቀን</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">እስከ ቀን</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ክፍል</label>
                    <select
                      value={reportClass}
                      onChange={(e) => setReportClass(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                    >
                      <option value="ሁሉም ክፍሎች">ሁሉም ክፍሎች</option>
                      {CLASS_OPTIONS.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportAttendanceReportCSV}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-300"
                  >
                    <Download className="w-4 h-4 text-emerald-700" />
                    <span>CSV ሪፖርት አውርድ</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-red-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ሪፖርት አትም</span>
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">የስብሰባዎች ብዛት</p>
                  <h4 className="text-2xl font-bold text-slate-800 font-mono">{totalSessionsInReport}</h4>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase">ተማሪዎች በሪፖርት</p>
                  <h4 className="text-2xl font-bold text-slate-800 font-mono">{studentReportList.length}</h4>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-red-600 font-semibold uppercase">በተደጋጋሚ የቀሩ ተማሪዎች (&lt;50%)</p>
                  <h4 className="text-2xl font-bold text-red-700 font-mono">
                    {studentReportList.filter((s) => s.isFrequentAbsentee).length}
                  </h4>
                </div>
              </div>

              {/* Attendance Report Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm font-serif">
                    የተማሪዎች የመገኘት መጠን ሪፖርት ({reportStartDate} እስከ {reportEndDate})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                        <th className="p-3.5">መለያ ቁጥር</th>
                        <th className="p-3.5">ሙሉ ስም</th>
                        <th className="p-3.5">ክፍል</th>
                        <th className="p-3.5 text-center">የተገኙበት</th>
                        <th className="p-3.5 text-center">የቀሩበት</th>
                        <th className="p-3.5 text-center">በምክንያት</th>
                        <th className="p-3.5 text-center">የመገኘት መጠን (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentReportList.map((item) => (
                        <tr
                          key={item.student.studentId}
                          className={`hover:bg-slate-50 ${
                            item.isFrequentAbsentee ? 'bg-red-50/50' : ''
                          }`}
                        >
                          <td className="p-3.5 font-mono font-bold text-amber-900">
                            {item.student.studentId}
                          </td>
                          <td className="p-3.5 font-medium flex items-center gap-2">
                            <span>{item.student.fullName}</span>
                            {item.isFrequentAbsentee && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300"
                                title="በተደጋጋሚ የቀረ ተማሪ"
                              >
                                <AlertTriangle className="w-3 h-3" /> በተደጋጋሚ የቀረ
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-xs text-slate-600">{item.student.classId}</td>
                          <td className="p-3.5 text-center text-emerald-700 font-bold font-mono">
                            {item.presentCount}
                          </td>
                          <td className="p-3.5 text-center text-red-700 font-bold font-mono">
                            {item.absentCount}
                          </td>
                          <td className="p-3.5 text-center text-amber-800 font-bold font-mono">
                            {item.excusedCount}
                          </td>
                          <td className="p-3.5 text-center font-extrabold font-mono">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs ${
                                item.percentage >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.percentage >= 50
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {item.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: Student Attendance History */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-lg w-full overflow-hidden">
            <div className="bg-red-950 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <div>
                <h3 className="font-bold text-amber-200 text-base">የተማሪ የመገኘት ታሪክ</h3>
                <p className="text-xs text-amber-100/80">
                  {selectedStudentForHistory.fullName} ({selectedStudentForHistory.studentId})
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="p-1 rounded text-amber-200 hover:text-white hover:bg-red-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-2">
              {records.filter((r) => r.studentId === selectedStudentForHistory.studentId).length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-500">
                  እስካሁን ምንም የተመዘገበ የመገኘት ታሪክ አልተገኘም።
                </p>
              ) : (
                records
                  .filter((r) => r.studentId === selectedStudentForHistory.studentId)
                  .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
                  .map((rec) => (
                    <div
                      key={rec.recordId}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-mono font-bold text-slate-800">{rec.meetingDate}</span>
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full ${
                          rec.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'absent'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rec.status === 'present' && 'ተገኝቷል'}
                        {rec.status === 'absent' && 'አልተገኘም'}
                        {rec.status === 'excused' && 'በምክንያት ቀርቷል'}
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
              <h3 className="font-bold text-amber-200 text-base">የተማሪ መረጃ ማስተካከያ</h3>
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
                <label className="block font-bold text-xs text-slate-700 mb-1">ክፍል</label>
                <select
                  value={editingStudent.classId || CLASS_OPTIONS[0]}
                  onChange={(e) => setEditingStudent({ ...editingStudent, classId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none bg-white"
                >
                  {CLASS_OPTIONS.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
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
                  ለወጣቶችን መረጃ አስቀምጥ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Student Registration by Admin */}
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
                <label className="block font-bold text-xs text-slate-700 mb-1">4. ክፍል</label>
                <select
                  value={manualClass}
                  onChange={(e) => setManualClass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-800 outline-none bg-white"
                >
                  {CLASS_OPTIONS.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-xs text-slate-700 mb-1">
                  5. ስልክ ቁጥር (አማራጭ)
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
                  6. የወላጅ ስልክ (አማራጭ)
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

    </div>
  );
};
