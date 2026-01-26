import JSZip from 'jszip';
import XLSX from 'xlsx';
import Attendance from '../models/attendance.js';
import Assessment from '../models/assessment.js';
import User from '../models/user.js';


const safeFilename = (name = 'Unknown') =>
  name.replace(/[\/\\:*?"<>|]/g, '').trim();
/**
 * Export utilities for generating Excel files
 */

export const exportAttendance = async (professorId = null, startDate = null, endDate = null) => {
  try {
    const filter = { status: 'completed' };

    const formatDurationHMS = (seconds) => {
    const s = Number(seconds || 0);
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };
    // Export only one professor
    if (professorId) {
      filter.professorId = professorId;
    }

    if (startDate) filter.startTime = { ...filter.startTime, $gte: new Date(startDate) };
    if (endDate) filter.startTime = { ...filter.startTime, $lte: new Date(endDate) };

    // Get all completed attendance records in range
    const records = await Attendance.find(filter).sort({ startTime: -1 }).lean();

    if (!records.length) {
      return { success: false, error: 'No attendance records found for this range.' };
    }

    // Optional: only include professors still existing in DB
    const professorIds = [...new Set(records.map(r => r.professorId?.toString()).filter(Boolean))];

    const existingProfessors = await User.find({
      _id: { $in: professorIds },
      userType: 'professor'
    }).select('_id fullName subject email').lean();

    const existingProfessorSet = new Set(existingProfessors.map(p => p._id.toString()));

    // Group by professorId
    const grouped = {};
    for (const rec of records) {
      const pid = rec.professorId?.toString();
      if (!pid) continue;

      // ✅ skip if professor deleted
      if (!existingProfessorSet.has(pid)) continue;

      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(rec);
    }
    if (Object.keys(grouped).length === 0) {
      return {
        success: false,
        error: 'No attendance records found for existing professors in this range.'
      };
    }


    const zip = new JSZip();

    for (const [pid, profRecords] of Object.entries(grouped)) {
      const professor = existingProfessors.find(p => p._id.toString() === pid);

      const data = profRecords.map(record => ({
        'Date': record.startTime ? new Date(record.startTime).toLocaleDateString() : '',
        'Start Time': record.startTime ? new Date(record.startTime).toLocaleTimeString() : '',
        'End Time': record.endTime ? new Date(record.endTime).toLocaleTimeString() : '',
        'Duration': formatDurationHMS(record.duration),
        'Duration (seconds)': record.duration ?? '',
        'Subject': record.subject || 'N/A',
        'Section': record.section || 'N/A',
        'Class Room': record.classRoom || '',
        'Status': record.status || '',
        'Start Image URL': record.startImage?.url || '',
        'End Image URL': record.endImage?.url || '',
        'Notes': record.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      const safeName = (professor?.fullName || pid).replace(/[\\/:*?"<>|]/g, '_');
      const filename = `${safeName}_${pid}_attendance.xlsx`;

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      zip.file(filename, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const filename = professorId
      ? `attendance_${professorId}_${new Date().toISOString().split('T')[0]}.zip`
      : `attendance_per_professor_${new Date().toISOString().split('T')[0]}.zip`;

    return { success: true, filename, buffer: zipBuffer };
  } catch (error) {
    console.error('Export ZIP error:', error);
    return { success: false, error: error.message };
  }
};

// Export assessments to Excel
export const exportAssessmentsToExcel = async (professorId = null) => {
  try {
    const filter = professorId ? { professor: professorId } : {};
    const assessments = await Assessment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (!assessments.length) {
      return { success: true, filename: `assessments_${new Date().toISOString().split('T')[0]}.xlsx`, buffer: null };
    }

    // Fetch all current professors and students once for efficiency
    const [currentProfessors, currentStudents] = await Promise.all([
      User.find({ userType: 'professor' }).select('_id').lean(),
      User.find({ userType: 'student' }).select('_id').lean()
    ]);

    const validProfessorIds = new Set(currentProfessors.map(p => p._id.toString()));
    const validStudentIds = new Set(currentStudents.map(s => s._id.toString()));

    // Filter assessments to include only those with active professor & student
    const validAssessments = assessments.filter(a =>
      validProfessorIds.has(a.professor.toString()) &&
      validStudentIds.has(a.student.toString())
    );

    const data = validAssessments.map(assessment => ({
      'Submitted On': assessment.submittedAt
        ? new Date(assessment.submittedAt).toLocaleString([], {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : new Date(assessment.createdAt).toLocaleString(),
      'Professor': assessment.professorName || 'N/A',
      'Subject': assessment.subject || 'N/A',
      'Student Name': assessment.studentName,
      'Student Role': assessment.studentRole,
      'Average Rating': assessment.averageRating || 0,
      'Total Score': assessment.totalScore || 0,
      'Comments': assessment.comments || ''
    }));

    // Handle empty export
    if (data.length === 0) {
      data.push({
        'Submitted On': 'No data available',
        'Professor': '',
        'Subject': '',
        'Student Name': '',
        'Student Role': '',
        'Average Rating': '',
        'Total Score': '',
        'Comments': ''
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assessments');

    const filename = `assessments_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return { success: true, filename, buffer };

  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
};