import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Student } from '../types';
import { EthiopianOrthodoxCross } from './EthiopianOrthodoxCross';
import { CheckCircle2, AlertCircle, Loader2, UserPlus, ShieldAlert, Copy, Check, ArrowRight } from 'lucide-react';

const ADULTS_CLASS_NAME = 'ዓቢይ ክፍል (የአዋቂዎች)';

interface StudentRegistrationFormProps {
  onViewStatus?: (studentId: string) => void;
}

export const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({ onViewStatus }) => {
  const [showForm, setShowForm] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'ወንድ' | 'ሴት' | 'ያልተጠቀሰ'>('ወንድ');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [guardianPhone, setGuardianPhone] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);
  const [registeredStudent, setRegisteredStudent] = useState<Student | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate Sequential ID starting from 0001 (e.g. FH-0001, FH-0002...)
  const generateSequentialStudentId = async (): Promise<string> => {
    try {
      const snap = await getDocs(collection(db, 'students'));
      let maxNumber = 0;

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.studentId && typeof data.studentId === 'string') {
          const matches = data.studentId.match(/(\d+)$/);
          if (matches && matches[1]) {
            const num = parseInt(matches[1], 10);
            if (!isNaN(num) && num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      });

      const nextNum = maxNumber + 1;
      const formattedNum = String(nextNum).padStart(4, '0');
      return `FH-${formattedNum}`;
    } catch (e) {
      console.warn('Error computing sequential ID, using fallback:', e);
      const random = Math.floor(1 + Math.random() * 9999);
      return `FH-${String(random).padStart(4, '0')}`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDuplicateWarning(false);

    const trimmedName = fullName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('እባክዎን ትክክለኛ ሙሉ ስም ያስገቡ።');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 100) {
      setErrorMessage('እባክዎን ትክክለኛ ዕድሜ ያስገቡ (ከ1 - 100)።');
      return;
    }

    setLoading(true);

    try {
      if (phoneNumber.trim() || guardianPhone.trim()) {
        const phoneToMatch = phoneNumber.trim() || guardianPhone.trim();
        const dupQuery = query(
          collection(db, 'students'),
          where('fullName', '==', trimmedName)
        );
        const dupSnap = await getDocs(dupQuery);
        let exists = false;
        dupSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.phoneNumber === phoneToMatch || data.guardianPhone === phoneToMatch) {
            exists = true;
          }
        });

        if (exists && !duplicateWarning) {
          setDuplicateWarning(true);
          setErrorMessage('በዚህ ስም እና ስልክ ቁጥር አስቀድሞ የተመዘገበ ተማሪ አለ። እርግጠኛ ከሆኑ «ምዝገባዬን አስገባ» የሚለውን ድጋሚ ይጫኑ።');
          setLoading(false);
          return;
        }
      }

      const assignedId = await generateSequentialStudentId();
      const now = new Date().toISOString();

      const newStudentData: Student = {
        studentId: assignedId,
        fullName: trimmedName,
        age: parsedAge,
        gender,
        phoneNumber: phoneNumber.trim() || '',
        guardianPhone: guardianPhone.trim() || '',
        classId: ADULTS_CLASS_NAME,
        registrationDate: new Date().toLocaleDateString('am-ET'),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, 'students'), newStudentData);

      localStorage.setItem('my_student_id', assignedId);

      setRegisteredStudent(newStudentData);
      setLoading(false);
    } catch (err: any) {
      console.error('Registration error:', err);
      setLoading(false);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'students');
      } catch (fErr: any) {
        setErrorMessage('ምዝገባውን ማስገባት አልተቻለም። እባክዎን የበይነመረብ ግንኙነትዎን አረጋግጠው ድጋሚ ይሞክሩ።');
      }
    }
  };

  const handleCopyId = () => {
    if (registeredStudent) {
      navigator.clipboard.writeText(registeredStudent.studentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setRegisteredStudent(null);
    setFullName('');
    setAge('');
    setGender('ወንድ');
    setPhoneNumber('');
    setGuardianPhone('');
    setErrorMessage(null);
    setDuplicateWarning(false);
    setShowForm(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Success View */}
      {registeredStudent ? (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-500/30 overflow-hidden text-center p-6 sm:p-8 animate-fade-in">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2 font-serif">
            ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል!
          </h2>
          <p className="text-slate-600 mb-6">
            እንኳን ወደ ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት በደህና መጡ። የተማሪ መለያ ቁጥርዎ ከዚህ በታች ተሰጥቶዎታል።
          </p>

          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-6 max-w-md mx-auto shadow-sm">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
              የተማሪ መለያ ቁጥር (Student ID)
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-extrabold text-amber-950 font-mono tracking-wider">
                {registeredStudent.studentId}
              </span>
              <button
                onClick={handleCopyId}
                className="p-2 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 transition-colors"
                title="መለያ ቁጥሩን ገልብጥ"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-700" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-amber-800/90 mt-2">
              * ይህ መለያ ቁጥር በዚህ ስልክዎ ላይ ተቀምጧል። ድጋሚ ድረ-ገጹን ሲከፍቱ ቀጥታ የመገኘት ሁኔታዎ ይታያል።
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-left max-w-md mx-auto text-sm space-y-2 mb-6">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500">ሙሉ ስም፡</span>
              <span className="font-semibold text-slate-800">{registeredStudent.fullName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500">ዕድሜ፡</span>
              <span className="font-semibold text-slate-800">{registeredStudent.age} ዓመት</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="text-slate-500">ክፍል፡</span>
              <span className="font-semibold text-slate-800">{registeredStudent.classId}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onViewStatus && (
              <button
                onClick={() => onViewStatus(registeredStudent.studentId)}
                className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-red-950 font-extrabold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 border border-amber-400/60"
              >
                <span>የእኔን የመገኘት ሁኔታ ተመልከት</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all border border-slate-300"
            >
              ሌላ ተማሪ መዝግብ
            </button>
          </div>
        </div>
      ) : !showForm ? (
        /* Welcome Hero Card */
        <div className="bg-gradient-to-b from-white via-amber-50/30 to-amber-100/40 rounded-3xl shadow-xl border border-amber-200/60 overflow-hidden text-center p-6 sm:p-10">
          <div className="inline-flex p-3 rounded-2xl bg-red-950/10 text-red-950 mb-4 border border-amber-500/20">
            <EthiopianOrthodoxCross className="w-10 h-10 text-amber-700" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-red-950 mb-3 font-serif">
            እንኳን ወደ ፍሬ ሃይማኖት ሰንበት ትምህርት ቤት በደህና መጡ
          </h2>
          
          <p className="text-slate-700 text-base sm:text-lg max-w-xl mx-auto mb-6 leading-relaxed">
            በኦርቶዶክሳዊት ተዋሕዶ ቤተ ክርስቲያን እምነትና ሥርዓት ለመማር እና የመገኘት መዝገብ ለመከታተል አሁኑኑ ይመዝገቡ።
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-850 text-amber-200 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all border-2 border-amber-400/50"
          >
            <UserPlus className="w-6 h-6 text-amber-300" />
            <span>ተመዝገብ</span>
          </button>
        </div>
      ) : (
        /* Registration Form */
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-950 to-amber-950 text-white p-6 border-b border-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-amber-200 font-serif">የተማሪዎች ምዝገባ ቅጽ</h2>
                <p className="text-xs text-amber-100/80 mt-1">
                  እባክዎን አስፈላጊውን መረጃ በትክክል ይሙሉ
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-xs text-amber-300 hover:underline px-2.5 py-1 rounded bg-red-900/50"
              >
                ተመለስ
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMessage && (
              <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                duplicateWarning
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}>
                {duplicateWarning ? (
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="text-sm font-medium leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* 1. Full Name */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                1. ሙሉ ስም <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="ለምሳሌ፡ አበበ ከበደ ወልደማሪያም"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 text-sm outline-none transition-all"
              />
            </div>

            {/* 2. Age & Gender Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  2. ዕድሜ <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="ለምሳሌ፡ 25"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  3. ጾታ (አማራጭ)
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 text-sm outline-none bg-white transition-all"
                >
                  <option value="ወንድ">ወንድ</option>
                  <option value="ሴት">ሴት</option>
                  <option value="ያልተጠቀሰ">ያልተጠቀሰ</option>
                </select>
              </div>
            </div>

            {/* 3. Student Phone & Additional Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  4. ስልክ ቁጥር (አማራጭ)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="09..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1">
                  5. ተጨማሪ አድራሻ / ስልክ (አማራጭ)
                </label>
                <input
                  type="tel"
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder="09..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-slate-800 text-sm outline-none transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-850 text-amber-200 font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 border border-amber-400/30 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-amber-300" />
                    <span>ምዝገባው በመከናወን ላይ ነው...</span>
                  </>
                ) : (
                  <span>ምዝገባዬን አስገባ</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
