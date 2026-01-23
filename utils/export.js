import XLSX from 'xlsx';
import Attendance from '../models/attendance.js';
import Assessment from '../models/assessment.js';
import User from '../models/user.js';

/**
 * Export utilities for generating Excel files
 */

// Export attendance records to Excel
export const exportAttendanceToExcel = async (professorId = null, startDate = null, endDate = null) => {
  try {
    const filter = {};

    if (professorId) {
      filter.professorId = professorId;
    }
    
    if (startDate || endDate) {
    filter.startTime = {};
    if (startDate) filter.startTime.$gte = new Date(startDate);
    if (endDate) filter.startTime.$lte = new Date(endDate);
  }

    const records = await Attendance.find(filter)
      .populate('professorId', 'fullName email')
      .sort({ date: -1 })
      .lean();

    const data = records.map(record => ({
      'Start Time': record.startTime
        ? new Date(record.startTime).toLocaleString()
        : '',
      'End Time': record.endTime
        ? new Date(record.endTime).toLocaleString()
        : '',
      'Professor ID': record.professorId || 'N/A',
      'Subject': record.subject,
      'Section': record.section,
      'Classroom': record.classRoom || '',
      'Duration (seconds)': record.duration || 0,
      'Status': record.status,
      'Notes': record.notes || ''
    }));


    if (data.length === 0) {
      data.push({
        'Date': 'No data available',
        'Time': '',
        'Professor': '',
        'Subject': '',
        'Class Name': '',
        'Time-in Photo': '',
        'Time-out Photo': '',
        'Status': '',
        'Notes': ''
      });
    }

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');

    const filename = `attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Return buffer for download
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return { success: true, filename, buffer };
  } catch (error) {
    console.error('Export error:', error);
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

// Export weekly summary
export const exportWeeklySummary = async (startDate, endDate) => {
  try {
    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 }).lean();

    const professorStats = {};

    records.forEach(record => {
      const profId = record.professor.toString();

      if (!professorStats[profId]) {
        professorStats[profId] = {
          name: record.professorName,
          subject: record.subject,
          totalClasses: 0,
          classes: []
        };
      }

      professorStats[profId].totalClasses++;
      professorStats[profId].classes.push({
        date: record.date,
        time: record.time,
        className: record.className
      });
    });

    const data = Object.values(professorStats).map(prof => ({
      'Professor': prof.name,
      'Subject': prof.subject,
      'Total Classes': prof.totalClasses,
      'Week Period': `${startDate} to ${endDate}`
    }));

    if (data.length === 0) {
      data.push({
        'Professor': 'No data available',
        'Subject': '',
        'Total Classes': '',
        'Week Period': ''
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Weekly Summary');

    const filename = `weekly_summary_${startDate}_to_${endDate}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return { success: true, filename, buffer };
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
};

// Generate monthly report
export const generateMonthlyReport = async (year, month) => {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Get attendance data
    const attendanceRecords = await Attendance.find({
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Get assessment data
    const assessmentRecords = await Assessment.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).lean();

    // ✅ Pull current active users (for export filtering)
    const [activeProfessors, activeStudents] = await Promise.all([
      User.find({ userType: 'professor' }).select('_id').lean(),
      User.find({ userType: 'student' }).select('_id').lean()
    ]);

    const validProfessorIds = new Set(activeProfessors.map(p => p._id.toString()));
    const validStudentIds = new Set(activeStudents.map(s => s._id.toString()));


    // Create workbook
    const wb = XLSX.utils.book_new();

    const validAttendanceRecords = attendanceRecords.filter(record => {
      if (!record.professor) return false;
      return validProfessorIds.has(record.professor.toString());
    });

    // Attendance sheet
    const attendanceData = validAttendanceRecords.map(record => ({
      'Date': record.date,
      'Professor': record.professorName,
      'Subject': record.subject,
      'Class': record.className,
      'Time In': record.time
    }));
    
    if (attendanceData.length === 0) {
      attendanceData.push({
        'Date': 'No data',
        'Professor': '',
        'Subject': '',
        'Class': '',
        'Time In': ''
      });
    }

    const attendanceWs = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(wb, attendanceWs, 'Attendance');

    const validAssessmentRecords = assessmentRecords.filter(a => {
      if (!a.professor || !a.student) return false;
      return (
        validProfessorIds.has(a.professor.toString()) &&
        validStudentIds.has(a.student.toString())
      );
    });
    // Assessment sheet
  const assessmentData = validAssessmentRecords.map(assessment => ({
  'Submitted On': assessment.submittedAt
    ? new Date(assessment.submittedAt).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date(assessment.createdAt).toLocaleString(),
  'Professor': assessment.professorName || assessment.professor?.fullName || 'N/A',
  'Average Rating': assessment.averageRating,
  'Student': assessment.studentName
}));

    if (assessmentData.length === 0) {
      assessmentData.push({
        'Date': 'No data',
        'Professor': '',
        'Average Rating': '',
        'Student': ''
      });
    }

    const assessmentWs = XLSX.utils.json_to_sheet(assessmentData);
    XLSX.utils.book_append_sheet(wb, assessmentWs, 'Assessments');

    const filename = `monthly_report_${year}_${String(month).padStart(2, '0')}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return { success: true, filename, buffer };
  } catch (error) {
    console.error('Report generation error:', error);
    return { success: false, error: error.message };
  }
};