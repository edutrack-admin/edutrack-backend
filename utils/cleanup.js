import { v2 as cloudinary } from 'cloudinary';
import Attendance from '../models/attendance.js';
import Assessment from '../models/assessment.js';
import Archive from '../models/archive.js';

/**
 * Admin-Only Monthly Cleanup System
 * Deletes attendance and assessments after archiving
 */

// Check if admin has completed archive for previous month
export const checkArchiveStatus = async () => {
  try {
    const lastMonth = getPreviousMonthKey();
    const archive = await Archive.findOne({ month: lastMonth });
    
    if (!archive) {
      return {
        completed: false,
        message: 'Archive not started for previous month'
      };
    }

    return {
      completed: archive.archiveCompleted || false,
      exportedToSheets: archive.exportedToSheets || false,
      printedReports: archive.printedReports || false,
      completedBy: archive.completedBy,
      completedByName: archive.completedByName,
      completedAt: archive.completedAt
    };
  } catch (error) {
    console.error('Error checking archive status:', error);
    return { completed: false, error: error.message };
  }
};

// Admin marks archive as complete
export const markArchiveComplete = async (adminId, adminName) => {
  try {
    const lastMonth = getPreviousMonthKey();
    
    const archive = await Archive.findOneAndUpdate(
      { month: lastMonth },
      {
        month: lastMonth,
        archiveCompleted: true,
        exportedToSheets: true,
        printedReports: true,
        completedBy: adminId,
        completedByName: adminName,
        completedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return { success: true, message: 'Archive marked as complete' };
  } catch (error) {
    console.error('Error marking archive complete:', error);
    return { success: false, error: error.message };
  }
};

// Main cleanup function
export const executeMonthlyCleanup = async () => {
  try {
    console.log('Checking if cleanup should run...');
    
    const archiveStatus = await checkArchiveStatus();
    
    if (!archiveStatus.completed) {
      console.log('Cleanup aborted: Archive not marked complete');
      return {
        success: false,
        message: 'Admin has not completed the archive process.',
        requiresAdmin: true
      };
    }

    console.log('Admin archive confirmed. Starting cleanup...');
    
    const lastMonthDate = getPreviousMonthDate();
    
    // Delete old data
    const attendanceResult = await deleteOldAttendance(lastMonthDate);
    const assessmentCount = await deleteOldAssessments(lastMonthDate);
    
    // Mark cleanup as executed
    const lastMonth = getPreviousMonthKey();
    await Archive.findOneAndUpdate(
      { month: lastMonth },
      {
        cleanupExecuted: true,
        cleanupAt: new Date(),
        deletedRecords: {
          attendance: attendanceResult.count,
          assessments: assessmentCount,
          images: attendanceResult.imagesDeleted
        }
      }
    );
    
    console.log('Monthly cleanup completed successfully!');
    return {
      success: true,
      message: `Cleanup completed. Deleted ${attendanceResult.count} attendance records, ${assessmentCount} assessments, and ${attendanceResult.imagesDeleted} cloudinary images.`,
      archivedMonth: lastMonth,
      details: {
        attendanceRecords: attendanceResult.count,
        assessments: assessmentCount,
        cloudinaryImages: attendanceResult.imagesDeleted
      }
    };
  } catch (error) {
    console.error('Cleanup error:', error);
    return { success: false, error: error.message };
  }
};

// Delete old attendance records
const deleteOldAttendance = async (beforeDate) => {
  try {
    console.log('Fetching attendance records to delete...');
    
    // First, get all attendance records that will be deleted
    const recordsToDelete = await Attendance.find({
      startTime: { $lt: new Date(beforeDate) }
    });
    
    console.log(`Found ${recordsToDelete.length} attendance records to delete`);
    
    let imagesDeleted = 0;
    const imageDeleteErrors = [];
    
    // Delete images from Cloudinary
    for (const record of recordsToDelete) {
      try {
        // Delete start image
        if (record.startImage?.publicId) {
          await cloudinary.uploader.destroy(record.startImage.publicId);
          imagesDeleted++;
          console.log(`Deleted start image: ${record.startImage.publicId}`);
        }
        
        // Delete end image
        if (record.endImage?.publicId) {
          await cloudinary.uploader.destroy(record.endImage.publicId);
          imagesDeleted++;
          console.log(`Deleted end image: ${record.endImage.publicId}`);
        }
      } catch (imgError) {
        console.error(`Error deleting images for record ${record._id}:`, imgError);
        imageDeleteErrors.push({
          recordId: record._id,
          error: imgError.message
        });
        // Continue even if image deletion fails
      }
    }
    
    // Now delete the attendance records from MongoDB
    const result = await Attendance.deleteMany({
      startTime: { $lt: new Date(beforeDate) }
    });
    
    console.log(`Deleted ${result.deletedCount} attendance records`);
    console.log(`Deleted ${imagesDeleted} images from Cloudinary`);
    
    if (imageDeleteErrors.length > 0) {
      console.warn(`${imageDeleteErrors.length} images failed to delete:`, imageDeleteErrors);
    }
    
    return {
      count: result.deletedCount,
      imagesDeleted,
      imageErrors: imageDeleteErrors.length
    };
  } catch (error) {
    console.error('Error deleting attendance:', error);
    throw error;
  }
};

// Delete old assessments
const deleteOldAssessments = async (beforeDate) => {
  try {
    const result = await Assessment.deleteMany({
      createdAt: { $lt: new Date(beforeDate) }
    });
    
    console.log(`Deleted ${result.deletedCount} assessments`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error deleting assessments:', error);
    throw error;
  }
};

// NEW: Clear ALL data but keep user accounts
export const clearAllDataKeepAccounts = async (adminId, adminName) => {
  try {
    console.log('Starting full data cleanup (keeping user accounts)...');
    
    // 1. Get ALL attendance records to delete their images
    const allAttendance = await Attendance.find({});
    console.log(`Found ${allAttendance.length} attendance records to clean`);
    
    let totalImagesDeleted = 0;
    
    // Delete all Cloudinary images
    for (const record of allAttendance) {
      try {
        if (record.startImage?.publicId) {
          await cloudinary.uploader.destroy(record.startImage.publicId);
          totalImagesDeleted++;
        }
        if (record.endImage?.publicId) {
          await cloudinary.uploader.destroy(record.endImage.publicId);
          totalImagesDeleted++;
        }
      } catch (imgError) {
        console.error(`Error deleting images for record ${record._id}:`, imgError);
      }
    }
    
    // 2. Delete ALL attendance records
    const attendanceResult = await Attendance.deleteMany({});
    
    // 3. Delete ALL assessments
    const assessmentResult = await Assessment.deleteMany({});
    
    // 4. Delete ALL archives
    const archiveResult = await Archive.deleteMany({});
    
    console.log('Full cleanup completed!');
    console.log(`- Deleted ${attendanceResult.deletedCount} attendance records`);
    console.log(`- Deleted ${assessmentResult.deletedCount} assessments`);
    console.log(`- Deleted ${archiveResult.deletedCount} archives`);
    console.log(`- Deleted ${totalImagesDeleted} Cloudinary images`);
    
    return {
      success: true,
      message: 'All data cleared successfully. User accounts preserved.',
      deleted: {
        attendance: attendanceResult.deletedCount,
        assessments: assessmentResult.deletedCount,
        archives: archiveResult.deletedCount,
        cloudinaryImages: totalImagesDeleted
      },
      clearedBy: adminName,
      clearedAt: new Date()
    };
  } catch (error) {
    console.error('Error in full data cleanup:', error);
    return { success: false, error: error.message };
  }
};

// Helper functions
const getPreviousMonthKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getPreviousMonthDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const isCleanupWindow = () => {
  const today = new Date().getDate();
  return today >= 1 && today <= 3;
};

export const shouldRemindAdmin = () => {
  const today = new Date().getDate();
  return today >= 25;
};

export const getDaysUntilMonthEnd = () => {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return lastDay - today.getDate();
};

export const getCleanupSummary = async () => {
  try {
    const archiveStatus = await checkArchiveStatus();
    const daysUntilEnd = getDaysUntilMonthEnd();
    const inCleanupWindow = isCleanupWindow();
    const shouldRemind = shouldRemindAdmin();
    const currentAttendance = await Attendance.countDocuments({});
    const currentAssessments = await Assessment.countDocuments({});

    return {
      archiveStatus,
      daysUntilMonthEnd: daysUntilEnd,
      isCleanupWindow: inCleanupWindow,
      shouldShowReminder: shouldRemind,
      currentMonth: new Date().toISOString().slice(0, 7),
      previousMonth: getPreviousMonthKey(),
      currentData: {
        attendance: currentAttendance,
        assessments: currentAssessments
      }
    };
  } catch (error) {
    console.error('Error getting cleanup summary:', error);
    return { error: error.message };
  }
};