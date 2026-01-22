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
      filter.professor = professorId;
    }
    
    if (startDate) {
      filter.date = { ...filter.date, $gte: startDate };
    }
    
    if (endDate) {
      filter.date = { ...filter.date, $lte: endDate };
    }

    const records = await Attendance.find(filter)
      .sort({ date: -1 })
      .lean();

    const data = records.map(record => ({
      'Date': record.date,
      'Time': record.time,
      'Professor': record.professorName,
      'Subject': record.subject || 'N/A',
      'Class Name': record.className,
      'Time-in Photo': record.timeInPhoto || '',
      'Time-out Photo': record.timeOutPhoto || '',
      'Status': record.status || 'Present',
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

    const data = assessments.map(assessment => ({
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
  'Subject': assessment.subject || assessment.professor?.subject || 'N/A',
  'Student Name': assessment.studentName,
  'Student Role': assessment.studentRole,
  'Average Rating': assessment.averageRating || 0,
  'Total Score': assessment.totalScore || 0,
  'Comments': assessment.comments || ''
}));


    if (data.length === 0) {
      data.push({
        'Date': 'No data available',
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

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Attendance sheet
    const attendanceData = attendanceRecords.map(record => ({
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

    // Assessment sheet
  const assessmentData = assessmentRecords.map(assessment => ({
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