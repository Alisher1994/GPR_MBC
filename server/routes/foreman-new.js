import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// Получить объекты с секциями
router.get('/objects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        COUNT(DISTINCT s.id) as sections_count
      FROM objects o
      LEFT JOIN sections s ON o.id = s.object_id
      GROUP BY o.id
      ORDER BY o.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения объектов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить секции объекта
router.get('/objects/:objectId/sections', async (req, res) => {
  try {
    const { objectId } = req.params;

    const result = await pool.query(`
      SELECT 
        s.*,
        MAX(xf.uploaded_at) as last_updated
      FROM sections s
      LEFT JOIN xml_files xf ON s.id = xf.section_id AND xf.status = 'active'
      WHERE s.object_id = $1
      GROUP BY s.id
      ORDER BY s.section_number
    `, [objectId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения секций:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить работы секции (для текущего периода)
router.get('/sections/:sectionId/works', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { weeks = 2 } = req.query;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + (weeks * 7));

    const result = await pool.query(
      `SELECT 
         wi.*,
         COALESCE(SUM(cw.completed_volume), 0) as actual_completed,
         COUNT(DISTINCT wa.id) as assignments_count,
         COALESCE(SUM(wa.assigned_volume), 0) as assigned_total
       FROM work_items wi
       LEFT JOIN work_assignments wa ON wi.id = wa.work_item_id
       LEFT JOIN completed_works cw ON wa.id = cw.assignment_id AND cw.status = 'approved'
       WHERE wi.section_id = $1
         AND wi.start_date <= $2
         AND wi.end_date >= $3
       GROUP BY wi.id
       ORDER BY wi.start_date, wi.floor, wi.work_type`,
      [sectionId, futureDate.toISOString().split('T')[0], today.toISOString().split('T')[0]]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения работ:', error);
    res.status(500).json({ error: error.message });
  }
});

// Проверить наличие обновлений секции
router.get('/sections/:sectionId/check-updates', async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { lastChecked } = req.query;

    const result = await pool.query(
      `SELECT 
         MAX(uploaded_at) as last_upload,
         COUNT(*) FILTER (WHERE uploaded_at > $2) as new_uploads
       FROM xml_files
       WHERE section_id = $1 AND status = 'active'`,
      [sectionId, lastChecked || '1970-01-01']
    );

    res.json({
      hasUpdates: result.rows[0].new_uploads > 0,
      lastUpload: result.rows[0].last_upload
    });
  } catch (error) {
    console.error('Ошибка проверки обновлений:', error);
    res.status(500).json({ error: error.message });
  }
});

// Распределить работу субподрядчикам
router.post('/assign-work', async (req, res) => {
  try {
    const { workItemId, assignments, foremanId } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'Необходимо указать назначения' });
    }

    // Получаем информацию о работе
    const workItem = await pool.query('SELECT * FROM work_items WHERE id = $1', [workItemId]);
    
    if (workItem.rows.length === 0) {
      return res.status(404).json({ error: 'Работа не найдена' });
    }

    const work = workItem.rows[0];

    // Проверяем доступный объем
    const existingAssignments = await pool.query(
      'SELECT COALESCE(SUM(assigned_volume), 0) as total FROM work_assignments WHERE work_item_id = $1',
      [workItemId]
    );

    const alreadyAssigned = parseFloat(existingAssignments.rows[0].total);
    const totalAssigned = assignments.reduce((sum, a) => sum + parseFloat(a.assignedVolume), 0);
    const remaining = work.total_volume - work.completed_volume - alreadyAssigned;

    if (totalAssigned > remaining) {
      return res.status(400).json({ 
        error: `Превышен доступный объем. Доступно: ${remaining.toFixed(2)}, назначено: ${totalAssigned.toFixed(2)}`,
        details: {
          totalVolume: work.total_volume,
          completedVolume: work.completed_volume,
          alreadyAssigned: alreadyAssigned,
          remaining: remaining,
          attemptedToAssign: totalAssigned
        }
      });
    }

    // Создаем назначения
    const results = [];
    for (const assignment of assignments) {
      const result = await pool.query(
        `INSERT INTO work_assignments 
         (work_item_id, subcontractor_id, foreman_id, assigned_volume, assigned_at, status)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'pending')
         RETURNING *`,
        [workItemId, assignment.subcontractorId, foremanId, assignment.assignedVolume]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json({ 
      message: 'Работа успешно распределена',
      assignments: results
    });

  } catch (error) {
    console.error('Ошибка распределения работы:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить ожидающие подтверждения работы
router.get('/pending-approvals/:foremanId', async (req, res) => {
  try {
    const { foremanId } = req.params;

    const result = await pool.query(
      `SELECT 
         cw.*,
         wi.work_type,
         wi.floor,
         wi.unit,
         u.username as subcontractor_name,
         u.company_name,
         wa.assigned_volume,
         s.section_name,
         o.name as object_name
       FROM completed_works cw
       JOIN work_assignments wa ON cw.assignment_id = wa.id
       JOIN work_items wi ON wa.work_item_id = wi.id
       JOIN sections s ON wi.section_id = s.id
       JOIN objects o ON s.object_id = o.id
       JOIN users u ON wa.subcontractor_id = u.id
       WHERE wa.foreman_id = $1 AND cw.status = 'pending'
       ORDER BY cw.work_date DESC`,
      [foremanId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения ожидающих подтверждения:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить отправленные наряды
router.get('/sent-assignments/:foremanId', async (req, res) => {
  try {
    const { foremanId } = req.params;

    const result = await pool.query(
      `SELECT 
         wa.*,
         wi.work_type,
         wi.floor,
         wi.unit,
         wi.total_volume,
         u.username as subcontractor_name,
         u.company_name,
         COALESCE(SUM(cw.completed_volume), 0) as completed_volume,
         s.section_name,
         o.name as object_name
       FROM work_assignments wa
       JOIN work_items wi ON wa.work_item_id = wi.id
       JOIN sections s ON wi.section_id = s.id
       JOIN objects o ON s.object_id = o.id
       JOIN users u ON wa.subcontractor_id = u.id
       LEFT JOIN completed_works cw ON wa.id = cw.assignment_id AND cw.status = 'approved'
       WHERE wa.foreman_id = $1
       GROUP BY wa.id, wi.id, u.id, s.id, o.id
       ORDER BY wa.assigned_at DESC`,
      [foremanId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения отправленных нарядов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Подтвердить или отклонить работу
router.post('/approve-work', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { completedWorkId, foremanId, status, adjustedVolume, notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    await client.query('BEGIN');

    // Обновляем статус работы
    const volumeToUse = adjustedVolume !== undefined ? adjustedVolume : null;
    
    await client.query(
      `UPDATE completed_works 
       SET status = $1, 
           approved_by = $2, 
           approved_at = CURRENT_TIMESTAMP,
           adjusted_volume = $3,
           notes = $4
       WHERE id = $5`,
      [status, foremanId, volumeToUse, notes, completedWorkId]
    );

    // Если одобрено, обновляем completed_volume в work_items
    if (status === 'approved') {
      const workInfo = await client.query(
        `SELECT wa.work_item_id, cw.completed_volume, cw.adjusted_volume
         FROM completed_works cw
         JOIN work_assignments wa ON cw.assignment_id = wa.id
         WHERE cw.id = $1`,
        [completedWorkId]
      );

      if (workInfo.rows.length > 0) {
        const { work_item_id, completed_volume, adjusted_volume } = workInfo.rows[0];
        const volumeToAdd = adjusted_volume !== null ? adjusted_volume : completed_volume;

        await client.query(
          'UPDATE work_items SET completed_volume = completed_volume + $1 WHERE id = $2',
          [volumeToAdd, work_item_id]
        );
      }
    }

    await client.query('COMMIT');

    res.json({ message: `Работа ${status === 'approved' ? 'одобрена' : 'отклонена'}` });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка подтверждения работы:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
