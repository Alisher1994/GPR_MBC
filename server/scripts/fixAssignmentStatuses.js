import pool from '../db/pool.js';

async function fixAssignmentStatuses() {
  try {
    const result = await pool.query(
      `UPDATE work_assignments
       SET status = 'assigned', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending'`
    );

    console.log(`✅ Updated ${result.rowCount} assignment(s) from 'pending' to 'assigned'.`);
  } catch (error) {
    console.error('❌ Failed to update assignment statuses:', error);
  } finally {
    await pool.end();
  }
}

fixAssignmentStatuses();
