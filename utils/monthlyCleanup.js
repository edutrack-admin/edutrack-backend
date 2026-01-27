import cron from 'node-cron';
import {
  executeMonthlyCleanup,
  isCleanupWindow,
  checkArchiveStatus
} from './cleanup.js';

let cleanupJob = null;

/**
 * Automatic Monthly Cleanup Scheduler
 * Runs every hour, checks if it should execute cleanup
 */
export const startCleanupScheduler = () => {
  // Run every hour
  cleanupJob = cron.schedule('0 * * * *', async () => {
    console.log('[Cleanup Scheduler] Hourly check running...');
    
    try {
      // Check if we're in cleanup window (Day 1-3)
      if (!isCleanupWindow()) {
        console.log('[Cleanup Scheduler] Not in cleanup window (Day 1-3). Skipping.');
        return;
      }

      console.log('[Cleanup Scheduler] In cleanup window! Checking archive status...');

      // Check if archive was marked complete
      const archiveStatus = await checkArchiveStatus();
      
      if (!archiveStatus.completed) {
        console.log('[Cleanup Scheduler] Archive not marked complete. Skipping cleanup.');
        return;
      }

      console.log('[Cleanup Scheduler] Archive complete! Executing cleanup...');

      // Execute cleanup
      const result = await executeMonthlyCleanup();

      if (result.success) {
        console.log('[Cleanup Scheduler] ✓ Cleanup completed successfully!');
        console.log(`[Cleanup Scheduler] ${result.message}`);
      } else {
        console.log('[Cleanup Scheduler] Cleanup skipped or failed:', result.message);
      }
    } catch (error) {
      console.error('[Cleanup Scheduler] Error during scheduled cleanup:', error);
    }
  });

  console.log('✓ Cleanup scheduler started - checking every hour');
  console.log('  Will run cleanup on Day 1-3 of each month if archive is marked complete');
};

export const stopCleanupScheduler = () => {
  if (cleanupJob) {
    cleanupJob.stop();
    console.log('Cleanup scheduler stopped');
  }
};

// For manual testing
export const testCleanupCheck = async () => {
  console.log('Manual cleanup check triggered');
  
  const inWindow = isCleanupWindow();
  const archiveStatus = await checkArchiveStatus();
  
  console.log('Cleanup window active:', inWindow);
  console.log('Archive status:', archiveStatus);
  
  if (inWindow && archiveStatus.completed) {
    console.log('Conditions met! Would execute cleanup now...');
    const result = await executeMonthlyCleanup();
    console.log('Result:', result);
    return result;
  } else {
    return {
      success: false,
      message: 'Cleanup conditions not met',
      details: { inWindow, archiveStatus }
    };
  }
};