//utils/export.js - Fixed
import JSZip from 'jszip';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import Attendance from '../models/attendance.js';
import Assessment from '../models/assessment.js';
import User from '../models/User.js';

/**
 * Export utilities for generating Excel files
 */

export const exportAttendance = async (
  professorId = null,
  startDate = null,
  endDate = null
) => {
  try {
    console.log('📊 Export Attendance called with:', { professorId, startDate, endDate });
    
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

    // ✅ ONLY apply professorId if it's valid and not empty string
    if (professorId && professorId !== '' && mongoose.isValidObjectId(professorId)) {
      filter.professorId = professorId;
      console.log('✓ Filtering by professor:', professorId);
    } else if (professorId && professorId !== '') {
      console.warn('⚠️ Invalid professor ID provided:', professorId);
      // Don't filter by professor if ID is invalid
    }

    // ✅ date filtering (safe)
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        filter.startTime.$gte = new Date(startDate);
        console.log('✓ Start date filter:', startDate);
      }
      if (endDate) {
        // Set to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.startTime.$lte = endDateTime;
        console.log('✓ End date filter:', endDate);
      }
    }

    console.log('🔍 Final filter:', JSON.stringify(filter, null, 2));

    // Fetch attendance
    const records = await Attendance.find(filter)
      .sort({ startTime: -1 })
      .lean();

    console.log(`📝 Found ${records.length} attendance records`);

    if (!records.length) {
      // Return empty Excel file instead of error
      const emptyData = [{
        'Date': 'No records found',
        'Start Time': '',
        'End Time': '',
        'Duration': '',
        'Duration (seconds)': '',
        'Subject': '',
        'Section': '',
        'Class Room': '',
        'Status': '',
        'Start Image URL': '',
        'End Image URL': '',
        'Notes': ''
      }];

      const ws = XLSX.utils.json_to_sheet(emptyData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      const buffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: 'xlsx'
      });

      const filename = `attendance_no_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      console.log('✓ Returning empty Excel file');
      return { success: true, filename, buffer };
    }

    // Get unique professors
    const professorIds = [
      ...new Set(records.map(r => r.professorId?.toString()).filter(Boolean))
    ];

    console.log('👥 Unique professors in results:', professorIds.length);

    const existingProfessors = await User.find({
      _id: { $in: professorIds },
      userType: 'professor'
    })
      .select('_id fullName subject email')
      .lean();

    console.log('✓ Found professor details:', existingProfessors.length);

    const existingProfessorSet = new Set(
      existingProfessors.map(p => p._id.toString())
    );

    // Group attendance by professor
    const grouped = {};
    for (const rec of records) {
      const pid = rec.professorId?.toString();
      if (!pid) continue;
      if (!existingProfessorSet.has(pid)) {
        console.warn(`⚠️ Record for deleted professor ${pid}, skipping`);
        continue;
      }

      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(rec);
    }

    if (Object.keys(grouped).length === 0) {
      console.warn('⚠️ No valid professor records after filtering deleted professors');
      // Return empty file
      const emptyData = [{
        'Date': 'No valid records (professors may have been deleted)',
        'Start Time': '',
        'End Time': '',
        'Duration': '',
        'Duration (seconds)': '',
        'Subject': '',
        'Section': '',
        'Class Room': '',
        'Status': '',
        'Start Image URL': '',
        'End Image URL': '',
        'Notes': ''
      }];

      const ws = XLSX.utils.json_to_sheet(emptyData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      const buffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: 'xlsx'
      });

      const filename = `attendance_no_valid_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      return { success: true, filename, buffer };
    }

    const zip = new JSZip();

    for (const [pid, profRecords] of Object.entries(grouped)) {
      const professor = existingProfessors.find(
        p => p._id.toString() === pid
      );

      console.log(`📄 Creating Excel for ${professor?.fullName || pid} (${profRecords.length} records)`);

      const data = profRecords.map(record => ({
        'Date': record.startTime
          ? new Date(record.startTime).toLocaleDateString()
          : '',
        'Start Time': record.startTime
          ? new Date(record.startTime).toLocaleTimeString()
          : '',
        'End Time': record.endTime
          ? new Date(record.endTime).toLocaleTimeString()
          : '',
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

      const safeName = (professor?.fullName || pid)
        .replace(/[\\/:*?"<>|]/g, '_');

      const filename = `${safeName}_attendance.xlsx`; // ← Removed the pid substring

      const buffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: 'xlsx'
      });

      zip.file(filename, buffer, { binary: true }); // ← Added binary: true
    }

    console.log('📦 Generating ZIP archive...');
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    const filename = professorId
      ? `attendance_${professorId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.zip`
      : `attendance_per_professor_${new Date().toISOString().split('T')[0]}.zip`;

    console.log('✅ Export completed successfully:', filename);
    return { success: true, filename, buffer: zipBuffer };
    
  } catch (error) {
    console.error('❌ Export ZIP error:', error);
    
    // Return empty file on error instead of failing
    const errorData = [{
      'Date': 'Export Error',
      'Start Time': error.message,
      'End Time': '',
      'Duration': '',
      'Duration (seconds)': '',
      'Subject': '',
      'Section': '',
      'Class Room': '',
      'Status': '',
      'Start Image URL': '',
      'End Image URL': '',
      'Notes': ''
    }];

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Error');

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx'
    });

    return { 
      success: true, // Still return success with error info in file
      filename: `attendance_error_${new Date().toISOString().split('T')[0]}.xlsx`, 
      buffer 
    };
  }
};

// Export assessments to Excel
export const exportAssessmentsToExcel = async (professorId = null, startDate = null, endDate = null) => {
  try {
    console.log('📊 Export Assessments called with:', { professorId, startDate, endDate });
    
    const filter = {};
    
    // Filter by professor if provided
    if (professorId && professorId !== '' && mongoose.isValidObjectId(professorId)) {
      filter.professor = professorId;
      console.log('✓ Filtering by professor:', professorId);
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
        console.log('✓ Start date filter:', startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDateTime;
        console.log('✓ End date filter:', endDate);
      }
    }
    
    console.log('🔍 Assessment filter:', JSON.stringify(filter, null, 2));
    
    const assessments = await Assessment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📝 Found ${assessments.length} assessments`);

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

    console.log(`✓ Valid assessments after filtering: ${validAssessments.length}`);

    const data = validAssessments.length > 0 
      ? validAssessments.map(assessment => ({
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
        }))
      : [{
          'Submitted On': 'No assessments found',
          'Professor': '',
          'Subject': '',
          'Student Name': '',
          'Student Role': '',
          'Average Rating': '',
          'Total Score': '',
          'Comments': ''
        }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assessments');

    const filename = `assessments_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    console.log('✅ Assessment export completed:', filename);
    return { success: true, filename, buffer };

  } catch (error) {
    console.error('❌ Assessment export error:', error);
    
    // Return empty file on error
    const errorData = [{
      'Submitted On': 'Export Error',
      'Professor': error.message,
      'Subject': '',
      'Student Name': '',
      'Student Role': '',
      'Average Rating': '',
      'Total Score': '',
      'Comments': ''
    }];

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Error');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return { 
      success: true, 
      filename: `assessments_error_${new Date().toISOString().split('T')[0]}.xlsx`, 
      buffer 
    };
  }
};