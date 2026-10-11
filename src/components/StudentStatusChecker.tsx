import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student, AttendanceRecord } from '../types';
import { EthiopianOrthodoxCross } from './EthiopianOrthodoxCross';
import { Search, CheckCircle2, XCircle, Clock, Calendar, User, BookOpen, AlertCircle, Loader2, Award, RefreshCw, UserPlus } from 'lucide-react';

interface StudentStatusCheckerProps {
  initialStudentId?: string;
  onGoToRegister?: () => void;
}

export const StudentStatusChecker: React.FC<StudentStatusCheckerProps> = ({
  initialStudentId = '',
  onGoToRegister,
}) => {
  const storedDeviceStudentId = localStorage.getItem('my_student_id') || '';
  const effectiveInitialId = initialStudentId || storedDeviceStudentId;

  const [searchId, setSearchId] = useState<string>(effectiveInitialId);
  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveInitialId.trim()) {
      handleSearch(effectiveInitialId.trim());
    }
  }, [effectiveInitialId]);

  const handleSearch = async (idToSearch?: string) => {
    const targetId = (idToSearch || searchId).trim().toUpperCase();
    if (!targetId) {
      setErrorMessage('እባክዎን የተማሪ መለያ ቁጥርዎን ያስገቡ። (ለምሳሌ፡ FH-0001)');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSearched(true);
    setStudent(null);
    setAttendanceRecords([]);

    try {
      // 1. Query student by studentId
      const studentQ = query(
        collection(db, 'students'),
        where('studentId', '==', targetId)
      );
      const studentSnap = await getDocs(studentQ);

      if (studentSnap.empty) {
        setErrorMessage(`በመለያ ቁጥር "${targetId}" የተመዘገበ ተማሪ አልተገኘም። እባክዎን የመለያ ቁጥሩን በትክክል አረጋግጠው ድጋሚ ይሞክሩ።`);
        setLoading(false);
        return;
      }

      let foundStudent: Student | null = null;
      studentSnap.forEach((docSnap) => {
        foundStudent = { id: docSnap.id, ...docSnap.data() } as Student;
      });

      setStudent(foundStudent);

      // Save ID to device for future visits
      localStorage.setItem('my_student_id', targetId);

      // 2. Query attendance records for this student
      const recsQ = query(
        collection(db, 'attendanceRecords'),
        where('studentId', '==', targetId)
      );
      
      const recsSnap = await getDocs(recsQ);
      const recList: AttendanceRecord[] = [];
      recsSnap.forEach((docSnap) => {
        recList.push({ id: docSnap.id, ...docSnap.data() } as AttendanceRecord);
      });

      // Sort by date descending
      recList.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
      setAttendanceRecords(recList);
      setLoading(false);
    } catch (err: any) {
      console.warn('Status search error:', err);
      setErrorMessage('መረጃውን ለመጫን አልተቻለም። እባክዎን የኢንተርኔት ግንኙነትዎን አረጋግጠው ድጋሚ ይሞክሩ።');
      setLoading(false);
    }
  };

  const handleClearSavedDeviceStudent = () => {
    localStorage.removeItem('my_student_id');
    setStudent(null);
    setSearchId('');
    setSearched(false);
    setAttendanceRecords([]);
  };

  // Stats calculation
  const totalRecordedDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((r) => r.status === 'present').length;
  const absentDays = attendanceRecords.filter((r) => r.status === 'absent').length;
  const excusedDays = attendanceRecords.filter((r) => r.status === 'excused').length;
  const attendancePercentage =
    totalRecordedDays > 0 ? Math.round((presentDays / totalRecordedDays) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
      
      {/* Title Hero */}
      <div className="bg-gradient-to-r from-red-950 via-red-900 to-amber-950 rounded-2xl shadow-lg p-6 sm:p-8 text-white border-b-2 border-amber-500/40 text-center mb-6">
        <div className="w-12 h-12 bg-amber-500/20 border-2 border-amber-400/50 rounded-full flex items-center justify-center text-amber-300 mx-auto mb-3 shadow-inner">
          <EthiopianOrthodoxCross className="w-8 h-8 text-amber-300" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-200 font-serif">
          የተማሪ የመገኘት ሁኔታ ማረጋገጫ
        </h2>
        <p className="text-xs sm:text-sm text-amber-100/80 mt-1 max-w-lg mx-auto">
          የተማሪ መለያ ቁጥርዎን (Student ID) በማስገባት የመገኘት መዝገብዎን እና የትምህርት ሁኔታዎን በቅጽበት ይከታተሉ።
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 mb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              required
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="የተማሪ መለያ ቁጥርዎን ያስገቡ (ለምሳሌ፡ FH-0001)..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 font-mono font-bold text-sm outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-red-950 hover:bg-red-900 text-amber-200 font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 border border-amber-400/40 shrink-0 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
            ) : (
              <Search className="w-5 h-5 text-amber-300" />
            )}
            <span>ሁኔታዬን ፈልግ</span>
          </button>
        </form>

        {errorMessage && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-medium leading-relaxed">{errorMessage}</span>
              {onGoToRegister && (
                <div>
                  <button
                    onClick={onGoToRegister}
                    className="text-xs font-bold text-red-900 underline hover:text-amber-900 mt-1"
                  >
                    አዲስ ተማሪ ለመመዝገብ እዚህ ይጫኑ &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Student Profile & Attendance Record Results */}
      {student && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Profile Card */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-950 to-amber-950 p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/30">
              <div>
                <span className="text-xs font-semibold text-amber-300/90 uppercase tracking-wider">
                  የተማሪ ፕሮፋይል
                </span>
                <h3 className="text-xl font-bold text-amber-100 font-serif">
                  {student.fullName}
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="bg-amber-500/20 border border-amber-400/40 px-3.5 py-1.5 rounded-xl font-mono text-amber-200 text-sm font-extrabold">
                  {student.studentId}
                </div>
                <button
                  onClick={handleClearSavedDeviceStudent}
                  title="መለያ ቁጥር ቀይር"
                  className="px-2.5 py-1.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-amber-100 text-xs font-bold border border-amber-500/30 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ቀይር</span>
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-slate-50/50">
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <User className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold">ዕድሜ እና ጾታ</p>
                  <p className="font-bold text-slate-800">
                    {student.age} ዓመት ({student.gender || 'ያልተጠቀሰ'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <BookOpen className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold">ክፍል / ቡድን</p>
                  <p className="font-bold text-slate-800">{student.classId || 'ያልተገለጸ'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-semibold">የምዝገባ ሁኔታ</p>
                  <p className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> ንቁ ተማሪ
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase">ጠቅላላ ቀናት</p>
              <h4 className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
                {totalRecordedDays}
              </h4>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
              <p className="text-xs font-semibold text-emerald-800 uppercase">የተገኙበት</p>
              <h4 className="text-2xl font-extrabold text-emerald-800 font-mono mt-1">
                {presentDays}
              </h4>
            </div>

            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
              <p className="text-xs font-semibold text-red-800 uppercase">የቀሩበት</p>
              <h4 className="text-2xl font-extrabold text-red-800 font-mono mt-1">
                {absentDays}
              </h4>
            </div>

            <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl text-center">
              <p className="text-xs font-semibold text-amber-900 uppercase">የመገኘት መጠን</p>
              <h4 className="text-2xl font-extrabold text-amber-950 font-mono mt-1">
                {attendancePercentage}%
              </h4>
            </div>
          </div>

          {/* Detailed Timeline List */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 font-serif">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>የእሁድ ትምህርት ቤት የመገኘት ታሪክ</span>
              </h4>
              <span className="text-xs font-semibold text-slate-500">
                {attendanceRecords.length} ቀናት ተመዝግበዋል
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {attendanceRecords.length === 0 ? (
                <div className="text-center py-10 px-4 text-slate-500">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium">እስካሁን ለዚህ ተማሪ የተመዘገበ የመገኘት ታሪክ አልተገኘም።</p>
                  <p className="text-xs text-slate-400 mt-1">
                    አስተዳዳሪው የመገኘት መዝገብ ሲይዝ እዚህ በቅጽበት ይታያል።
                  </p>
                </div>
              ) : (
                attendanceRecords.map((rec) => (
                  <div
                    key={rec.id || rec.recordId}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-sm"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-800">
                        {rec.meetingDate}
                      </span>
                      {rec.classId && (
                        <span className="ml-2 text-xs text-slate-500">({rec.classId})</span>
                      )}
                    </div>

                    <div>
                      {rec.status === 'present' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>ተገኝቷል</span>
                        </span>
                      )}

                      {rec.status === 'absent' && (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-300">
                          <XCircle className="w-3.5 h-3.5 text-red-700" />
                          <span>አልተገኘም</span>
                        </span>
                      )}

                      {rec.status === 'excused' && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1 rounded-full border border-amber-300">
                          <Clock className="w-3.5 h-3.5 text-amber-800" />
                          <span>በምክንያት ቀርቷል</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sub Option: Register New Student */}
          {onGoToRegister && (
            <div className="text-center pt-2">
              <button
                onClick={onGoToRegister}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>ሌላ አዲስ ተማሪ መዝግብ</span>
              </button>
            </div>
          )}

        </div>
      )}

      {!searched && !student && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-8 text-center text-amber-950 space-y-2 max-w-lg mx-auto mt-4">
          <EthiopianOrthodoxCross className="w-8 h-8 text-amber-700 mx-auto mb-1" />
          <h4 className="font-bold text-base font-serif">የመገኘት ሁኔታዎን ያረጋግጡ</h4>
          <p className="text-xs text-amber-900/80 leading-relaxed">
            ከተመዘገቡ በኋላ የተሰጠዎትን የመለያ ቁጥር (ለምሳሌ፡ FH-0001) በላይኛው ሳጥን ውስጥ በማስገባት «ሁኔታዬን ፈልግ» የሚለውን ይጫኑ።
          </p>
        </div>
      )}

    </div>
  );
};
