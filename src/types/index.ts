export interface Student {
  id?: string; // Firestore document ID
  studentId: string; // e.g. FH-2026-0001
  fullName: string;
  age: number;
  gender?: 'ወንድ' | 'ሴት' | 'ያልተጠቀሰ';
  phoneNumber?: string;
  guardianPhone?: string;
  classId?: string; // e.g. ሕፃናት, መካከለኛ, ወጣቶች, ዓቢይ ክፍል
  registrationDate: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceSession {
  id?: string;
  sessionId: string; // e.g. session_2026-10-11_ሕፃናት
  meetingDate: string; // YYYY-MM-DD
  classId: string;
  notes?: string;
  createdBy: string;
  createdAt?: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export interface AttendanceRecord {
  id?: string;
  recordId: string; // sessionId_studentId
  sessionId: string;
  studentId: string;
  studentName?: string;
  classId?: string;
  meetingDate: string;
  status: AttendanceStatus;
  markedBy: string;
  markedAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin';
  createdAt?: string;
}

export interface AttendanceStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  excusedToday: number;
  attendancePercentageToday: number;
}
