import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// Получить наряды субподрядчика
router.get('/my-assignments/:subcontractorId', async (req, res) => {
  try {
    const { subcontractorId } = req.params;
    const { status } = req.query; // фильтр по статусу

    let query = `
      SELECT 
        wa.*,
        wi.work_type,
        wi.stage,
        wi.section,
        wi.floor,
        wi.unit,
        wi.daily_target,
        wi.start_date,
        wi.end_date,
        o.name as object_name,
        COALESCE(SUM(cw.completed_volume), 0) as completed_so_far
      FROM work_assignments wa
      JOIN work_items wi ON wa.work_item_id = wi.id
      JOIN objects o ON wi.object_id = o.id
      LEFT JOIN completed_works cw ON wa.id = cw.assignment_id AND cw.status IN ('submitted', 'approved')
      WHERE wa.subcontractor_id = $1
    `;

    const params = [subcontractorId];

    if (status) {
      query += ` AND wa.status = $2`;
      params.push(status);
    }

    query += `
      GROUP BY wa.id, wi.id, o.id
      ORDER BY wi.start_date ASC, wa.created_at DESC
    `;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения нарядов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Зафиксировать выполненный объем
router.post('/submit-work', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { assignmentId, completedVolume, workDate, notes, subcontractorId } = req.body;

    await client.query('BEGIN');

    // Проверяем назначение
    const assignmentResult = await client.query(
      `SELECT wa.*, wi.total_volume, wi.unit
       FROM work_assignments wa
       JOIN work_items wi ON wa.work_item_id = wi.id
       WHERE wa.id = $1 AND wa.subcontractor_id = $2`,
      [assignmentId, subcontractorId]
    );

    if (assignmentResult.rows.length === 0) {
      throw new Error('Назначение не найдено или не принадлежит вам');
    }

    const assignment = assignmentResult.rows[0];

    // Проверяем, не превышает ли объем назначенный
    const completedResult = await client.query(
      `SELECT COALESCE(SUM(completed_volume), 0) as total_completed
       FROM completed_works
       WHERE assignment_id = $1 AND status IN ('submitted', 'approved')`,
      [assignmentId]
    );

    const totalCompleted = parseFloat(completedResult.rows[0].total_completed);
    const newTotal = totalCompleted + parseFloat(completedVolume);

    if (newTotal > assignment.assigned_volume) {
      throw new Error(`Превышен назначенный объем. Назначено: ${assignment.assigned_volume}, уже выполнено: ${totalCompleted}`);
    }

    // Сохраняем выполненный объем
    const result = await client.query(
      `INSERT INTO completed_works 
       (assignment_id, completed_volume, work_date, notes, submitted_by, status)
       VALUES ($1, $2, $3, $4, $5, 'submitted')
       RETURNING *`,
      [assignmentId, completedVolume, workDate, notes, subcontractorId]
    );

    // Обновляем статус назначения
    await client.query(
      `UPDATE work_assignments 
       SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [assignmentId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Выполненный объем отправлен на проверку',
      completedWork: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка отправки выполненного объема:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получить историю выполненных работ
router.get('/work-history/:subcontractorId', async (req, res) => {
  try {
    const { subcontractorId } = req.params;
    const { fromDate, toDate } = req.query;

    let query = `
      SELECT 
        cw.*,
        wa.assigned_volume,
        wi.work_type,
        wi.stage,
        wi.section,
        wi.floor,
        wi.unit,
        o.name as object_name,
        u.username as verified_by_name
      FROM completed_works cw
      JOIN work_assignments wa ON cw.assignment_id = wa.id
      JOIN work_items wi ON wa.work_item_id = wi.id
      JOIN objects o ON wi.object_id = o.id
      LEFT JOIN users u ON cw.verified_by = u.id
      WHERE wa.subcontractor_id = $1
    `;

    const params = [subcontractorId];

    if (fromDate) {
      query += ` AND cw.work_date >= $${params.length + 1}`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND cw.work_date <= $${params.length + 1}`;
      params.push(toDate);
    }

    query += ' ORDER BY cw.work_date DESC, cw.created_at DESC';

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения истории работ:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить статистику субподрядчика
router.get('/statistics/:subcontractorId', async (req, res) => {
  try {
    const { subcontractorId } = req.params;

    const result = await pool.query(
      `SELECT 
         COUNT(DISTINCT wa.id) as total_assignments,
         COUNT(DISTINCT CASE WHEN wa.status = 'assigned' THEN wa.id END) as pending_assignments,
         COUNT(DISTINCT CASE WHEN wa.status = 'in_progress' THEN wa.id END) as in_progress_assignments,
         COUNT(DISTINCT cw.id) as total_submissions,
         COUNT(DISTINCT CASE WHEN cw.status = 'approved' THEN cw.id END) as approved_works,
         COUNT(DISTINCT CASE WHEN cw.status = 'rejected' THEN cw.id END) as rejected_works,
         COUNT(DISTINCT CASE WHEN cw.status = 'submitted' THEN cw.id END) as pending_approval,
         COALESCE(SUM(CASE WHEN cw.status = 'approved' THEN cw.completed_volume END), 0) as total_approved_volume
       FROM work_assignments wa
       LEFT JOIN completed_works cw ON wa.id = cw.assignment_id
       WHERE wa.subcontractor_id = $1`,
      [subcontractorId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
