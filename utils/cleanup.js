import Attendance from '../models/Attendance.js';
import Assessment from '../models/Assessment.js';
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
    const attendanceCount = await deleteOldAttendance(lastMonthDate);
    const assessmentCount = await deleteOldAssessments(lastMonthDate);
    
    // Mark cleanup as executed
    const lastMonth = getPreviousMonthKey();
    await Archive.findOneAndUpdate(
      { month: lastMonth },
      {
        cleanupExecuted: true,
        cleanupAt: new Date()
      }
    );
    
    console.log('Monthly cleanup completed successfully!');
    return {
      success: true,
      message: `Cleanup completed. Deleted ${attendanceCount} attendance records and ${assessmentCount} assessments.`,
      archivedMonth: lastMonth
    };
  } catch (error) {
    console.error('Cleanup error:', error);
    return { success: false, error: error.message };
  }
};

// Delete old attendance records
const deleteOldAttendance = async (beforeDate) => {
  try {
    const result = await Attendance.deleteMany({
      date: { $lt: beforeDate }
    });
    
    console.log(`Deleted ${result.deletedCount} attendance records`);
    return result.deletedCount;
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

// Helper functions
const getPreviousMonthKey = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getPreviousMonthDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
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

    return {
      archiveStatus,
      daysUntilMonthEnd: daysUntilEnd,
      isCleanupWindow: inCleanupWindow,
      shouldShowReminder: shouldRemind,
      currentMonth: new Date().toISOString().slice(0, 7),
      previousMonth: getPreviousMonthKey()
    };
  } catch (error) {
    console.error('Error getting cleanup summary:', error);
    return { error: error.message };
  }
};