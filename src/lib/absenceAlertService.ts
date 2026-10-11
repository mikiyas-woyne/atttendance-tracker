import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Student, AttendanceSession, AttendanceRecord, AbsenceAlert } from '../types';

/**
 * Detects active students with 4 consecutive recorded absences across scheduled sessions
 * and automatically creates persistent Firestore alerts without duplicate creation.
 */
export async function detectAndCreateAbsenceAlerts(
  students: Student[],
  sessions: AttendanceSession[],
  records: AttendanceRecord[],
  existingAlerts: AbsenceAlert[]
): Promise<void> {
  if (!students.length || !sessions.length || !records.length) return;

  // 1. Sort sessions chronologically ascending by meetingDate
  const sortedSessions = [...sessions].sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));

  // 2. Map existing alerts by alertId for fast duplicate checks
  const existingAlertIds = new Set(existingAlerts.map((a) => a.alertId || a.id));

  // 3. Map records for O(1) lookup: sessionId_studentId AND meetingDate_studentId
  const recordMap: Record<string, AttendanceRecord> = {};
  records.forEach((rec) => {
    if (rec.sessionId && rec.studentId) {
      recordMap[`${rec.sessionId}_${rec.studentId}`] = rec;
    }
    if (rec.meetingDate && rec.studentId) {
      recordMap[`${rec.meetingDate}_${rec.studentId}`] = rec;
    }
  });

  // 4. Check active students
  const activeStudents = students.filter((s) => s.status === 'active');

  for (const student of activeStudents) {
    let consecutiveDates: string[] = [];

    for (const session of sortedSessions) {
      // Find attendance record for this student in this session
      const rec =
        recordMap[`${session.id}_${student.studentId}`] ||
        recordMap[`${session.sessionId}_${student.studentId}`] ||
        recordMap[`${session.meetingDate}_${student.studentId}`];

      if (rec) {
        if (rec.status === 'absent') {
          consecutiveDates.push(session.meetingDate);

          // Trigger on 4 consecutive recorded absences
          if (consecutiveDates.length === 4) {
            const lastMissedDate = consecutiveDates[3];
            const alertId = `alert_${student.studentId}_${lastMissedDate}`;

            // Check if alert for this episode already exists
            if (!existingAlertIds.has(alertId)) {
              existingAlertIds.add(alertId); // Prevent duplicate writes in loop

              const newAlert: AbsenceAlert = {
                alertId,
                studentId: student.studentId,
                studentName: student.fullName,
                consecutiveCount: 4,
                latestMissedDate: lastMissedDate,
                missedDates: [...consecutiveDates],
                status: 'unread',
                phoneNumber: student.phoneNumber || '',
                guardianPhone: student.guardianPhone || '',
                createdAt: new Date().toISOString(),
              };

              try {
                await setDoc(doc(db, 'absenceAlerts', alertId), newAlert, { merge: true });
              } catch (err) {
                console.warn('Error saving absence alert:', err);
              }
            }

            // Reset streak after generating an alert so future episodes can be detected
            consecutiveDates = [];
          }
        } else if (rec.status === 'present' || rec.status === 'excused') {
          // Reset streak if student is present or excused
          consecutiveDates = [];
        }
      }
      // If unrecorded session, streak is preserved (unrecorded meeting is not counted as an absence)
    }
  }
}

/**
 * Marks a notification alert as read in Firestore
 */
export async function markAlertAsRead(alertId: string): Promise<void> {
  const path = `absenceAlerts/${alertId}`;
  try {
    await updateDoc(doc(db, 'absenceAlerts', alertId), {
      status: 'read',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Marks a notification alert as resolved with optional admin notes
 */
export async function markAlertAsResolved(
  alertId: string,
  notes?: string,
  adminEmail?: string
): Promise<void> {
  const path = `absenceAlerts/${alertId}`;
  try {
    await updateDoc(doc(db, 'absenceAlerts', alertId), {
      status: 'resolved',
      notes: notes || '',
      resolvedAt: new Date().toISOString(),
      resolvedBy: adminEmail || 'admin',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
