//utils/export.js - Enhanced with Cloudinary Image Downloads
import JSZip from 'jszip';
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import axios from 'axios';
import Attendance from '../models/attendance.js';
import Assessment from '../models/assessment.js';
import User from '../models/User.js';

/**
 * Download image from URL and return as buffer
 */
const downloadImage = async (url) => {
  try {
    if (!url) return null;
    
    console.log(`📥 Downloading image: ${url.substring(0, 50)}...`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`✅ Downloaded: ${response.data.byteLength} bytes`);
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`❌ Failed to download image from ${url}:`, error.message);
    return null;
  }
};

/**
 * Get file extension from URL
 */
const getImageExtension = (url) => {
  if (!url) return 'jpg';
  
  // Extract extension from URL
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match && match[1]) {
    const ext = match[1].toLowerCase();
    // Common image extensions
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return ext;
    }
  }
  
  // Default to jpg
  return 'jpg';
};

/**
 * Format date for filename (YYYY-MM-DD_HH-MM-AM/PM)
 */
const formatDateForFilename = (date) => {
  if (!date) return 'unknown';
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${year}-${month}-${day}_${String(hours).padStart(2, '0')}-${minutes}-${ampm}`;
};

/**
 * Format duration as HH:MM:SS
 */
const formatDurationHMS = (seconds) => {
  const s = Number(seconds || 0);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

/**
 * Sanitize filename (remove invalid characters)
 */
const sanitizeFilename = (filename) => {
  return filename.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
};

/**
 * Export attendance with images grouped by professor in folders
 */
export const exportAttendance = async (
  professorId = null,
  startDate = null,
  endDate = null
) => {
  try {
    console.log('📊 Export Attendance called with:', { professorId, startDate, endDate });
    
    const filter = { status: 'completed' };

    // Apply professorId filter if valid
    if (professorId && professorId !== '' && mongoose.isValidObjectId(professorId)) {
      filter.professorId = professorId;
      console.log('✓ Filtering by professor:', professorId);
    } else if (professorId && professorId !== '') {
      console.warn('⚠️ Invalid professor ID provided:', professorId);
    }

    // Apply date filtering
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) {
        filter.startTime.$gte = new Date(startDate);
        console.log('✓ Start date filter:', startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.startTime.$lte = endDateTime;
        console.log('✓ End date filter:', endDate);
      }
    }

    console.log('🔍 Final filter:', JSON.stringify(filter, null, 2));

    // Fetch attendance records
    const records = await Attendance.find(filter)
      .sort({ startTime: -1 })
      .lean();

    console.log(`📋 Found ${records.length} attendance records`);

    if (!records.length) {
      // Return empty Excel file
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
        'Start Image': '',
        'End Image': '',
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
        'Start Image': '',
        'End Image': '',
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

    // Create ZIP archive
    const zip = new JSZip();

    // Process each professor
    for (const [pid, profRecords] of Object.entries(grouped)) {
      const professor = existingProfessors.find(
        p => p._id.toString() === pid
      );

      const profName = sanitizeFilename(professor?.fullName || pid);
      console.log(`📁 Creating folder for ${profName} (${profRecords.length} records)`);

      // Create professor folder
      const profFolder = zip.folder(profName);
      
      // Create Attendance Photos subfolder
      const photosFolder = profFolder.folder('Attendance_Photos');

      // Prepare Excel data
      const excelData = [];
      
      // Download images and add to ZIP
      for (const record of profRecords) {
        const dateStr = formatDateForFilename(record.startTime);
        
        // Download start image
        let startImageFilename = '';
        if (record.startImage?.url) {
          const startBuffer = await downloadImage(record.startImage.url);
          if (startBuffer) {
            const ext = getImageExtension(record.startImage.url);
            startImageFilename = `${dateStr}_start.${ext}`;
            photosFolder.file(startImageFilename, startBuffer);
            console.log(`  ✓ Added start image: ${startImageFilename}`);
          }
        }
        
        // Download end image
        let endImageFilename = '';
        if (record.endImage?.url) {
          const endBuffer = await downloadImage(record.endImage.url);
          if (endBuffer) {
            const ext = getImageExtension(record.endImage.url);
            endImageFilename = `${dateStr}_end.${ext}`;
            photosFolder.file(endImageFilename, endBuffer);
            console.log(`  ✓ Added end image: ${endImageFilename}`);
          }
        }

        // Add row to Excel data
        excelData.push({
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
          'Start Image': startImageFilename ? `Attendance_Photos/${startImageFilename}` : '',
          'End Image': endImageFilename ? `Attendance_Photos/${endImageFilename}` : '',
          'Notes': record.notes || ''
        });
      }

      // Create Excel file
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns
      const colWidths = [
        { wch: 12 },  // Date
        { wch: 12 },  // Start Time
        { wch: 12 },  // End Time
        { wch: 15 },  // Duration
        { wch: 18 },  // Duration (seconds)
        { wch: 20 },  // Subject
        { wch: 12 },  // Section
        { wch: 15 },  // Class Room
        { wch: 12 },  // Status
        { wch: 40 },  // Start Image
        { wch: 40 },  // End Image
        { wch: 30 }   // Notes
      ];
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

      const excelFilename = `${profName}_attendance.xlsx`;
      const excelBuffer = XLSX.write(wb, {
        type: 'buffer',
        bookType: 'xlsx'
      });

      profFolder.file(excelFilename, excelBuffer);
      console.log(`  ✓ Added Excel file: ${excelFilename}`);
    }

    console.log('📦 Generating ZIP archive...');
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const filename = professorId
      ? `attendance_${professorId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.zip`
      : `attendance_all_professors_${new Date().toISOString().split('T')[0]}.zip`;

    console.log('✅ Export completed successfully:', filename);
    return { success: true, filename, buffer: zipBuffer };
    
  } catch (error) {
    console.error('❌ Export attendance error:', error);
    
    // Return error file
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
      'Start Image': '',
      'End Image': '',
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
      success: true,
      filename: `attendance_error_${new Date().toISOString().split('T')[0]}.xlsx`, 
      buffer 
    };
  }
};

/**
 * Export assessments grouped by professor (similar to attendance)
 */
export const exportAssessmentsToExcel = async (
  professorId = null,
  startDate = null,
  endDate = null
) => {
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

    console.log(`📋 Found ${assessments.length} assessments`);

    // Fetch all current professors and students
    const [currentProfessors, currentStudents] = await Promise.all([
      User.find({ userType: 'professor' }).select('_id fullName').lean(),
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

    if (validAssessments.length === 0) {
      // Return empty Excel file
      const emptyData = [{
        'Submitted On': 'No assessments found',
        'Professor': '',
        'Subject': '',
        'Student Name': '',
        'Student Role': '',
        'Average Rating': '',
        'Total Score': '',
        'Comments': ''
      }];

      const ws = XLSX.utils.json_to_sheet(emptyData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assessments');

      const filename = `assessments_no_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      console.log('✓ Returning empty Excel file');
      return { success: true, filename, buffer };
    }

    // Group assessments by professor
    const grouped = {};
    for (const assessment of validAssessments) {
      const pid = assessment.professor.toString();
      if (!grouped[pid]) grouped[pid] = [];
      grouped[pid].push(assessment);
    }

    console.log(`👥 Assessments grouped into ${Object.keys(grouped).length} professors`);

    // Create ZIP or single file based on number of professors
    if (Object.keys(grouped).length === 1 && professorId) {
      // Single professor - return single Excel file
      const profId = Object.keys(grouped)[0];
      const professor = currentProfessors.find(p => p._id.toString() === profId);
      const profAssessments = grouped[profId];

      const data = profAssessments.map(assessment => ({
        'Submitted On': assessment.submittedAt
          ? new Date(assessment.submittedAt).toLocaleString([], {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : new Date(assessment.createdAt).toLocaleString(),
        'Professor': assessment.professorName || professor?.fullName || 'N/A',
        'Subject': assessment.subject || 'N/A',
        'Student Name': assessment.studentName,
        'Student Role': assessment.studentRole,
        'Average Rating': assessment.averageRating || 0,
        'Total Score': assessment.totalScore || 0,
        'Comments': assessment.comments || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assessments');

      const filename = `${sanitizeFilename(professor?.fullName || profId)}_assessments_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      console.log('✅ Assessment export completed (single file):', filename);
      return { success: true, filename, buffer };
    }

    // Multiple professors - create ZIP with folders
    const zip = new JSZip();

    for (const [pid, profAssessments] of Object.entries(grouped)) {
      const professor = currentProfessors.find(p => p._id.toString() === pid);
      const profName = sanitizeFilename(professor?.fullName || pid);
      
      console.log(`📁 Creating assessments for ${profName} (${profAssessments.length} assessments)`);

      const data = profAssessments.map(assessment => ({
        'Submitted On': assessment.submittedAt
          ? new Date(assessment.submittedAt).toLocaleString([], {
              year: 'numeric', month: 'short', day: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : new Date(assessment.createdAt).toLocaleString(),
        'Professor': assessment.professorName || professor?.fullName || 'N/A',
        'Subject': assessment.subject || 'N/A',
        'Student Name': assessment.studentName,
        'Student Role': assessment.studentRole,
        'Average Rating': assessment.averageRating || 0,
        'Total Score': assessment.totalScore || 0,
        'Comments': assessment.comments || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      
      // Auto-size columns
      const colWidths = [
        { wch: 20 },  // Submitted On
        { wch: 20 },  // Professor
        { wch: 20 },  // Subject
        { wch: 20 },  // Student Name
        { wch: 15 },  // Student Role
        { wch: 15 },  // Average Rating
        { wch: 12 },  // Total Score
        { wch: 40 }   // Comments
      ];
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Assessments');

      const filename = `${profName}_assessments.xlsx`;
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      // Create professor folder and add file
      const profFolder = zip.folder(profName);
      profFolder.file(filename, buffer);
      
      console.log(`  ✓ Added: ${filename}`);
    }

    console.log('📦 Generating ZIP archive...');
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const filename = `assessments_all_professors_${new Date().toISOString().split('T')[0]}.zip`;

    console.log('✅ Assessment export completed:', filename);
    return { success: true, filename, buffer: zipBuffer };

  } catch (error) {
    console.error('❌ Assessment export error:', error);
    
    // Return error file
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