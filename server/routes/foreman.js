import express from 'express';
import pool from '../db/pool.js';

const router = express.Router();

// Получить работы на ближайшие 1-2 недели
router.get('/upcoming-works/:objectId', async (req, res) => {
  try {
    const { objectId } = req.params;
    const { weeks = 2 } = req.query;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + (weeks * 7));

    const result = await pool.query(
      `SELECT 
         wi.*,
         COALESCE(SUM(cw.completed_volume), 0) as actual_completed,
         COUNT(DISTINCT wa.id) as assignments_count
       FROM work_items wi
       LEFT JOIN work_assignments wa ON wi.id = wa.work_item_id
       LEFT JOIN completed_works cw ON wa.id = cw.assignment_id AND cw.status = 'approved'
       WHERE wi.object_id = $1
         AND wi.start_date <= $2
         AND wi.end_date >= $3
       GROUP BY wi.id
       ORDER BY wi.start_date, wi.stage, wi.block, wi.floor`,
      [objectId, futureDate.toISOString().split('T')[0], today.toISOString().split('T')[0]]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения работ:', error);
    res.status(500).json({ error: error.message });
  }
});

// Распределить работу субподрядчикам
router.post('/assign-work', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { workItemId, assignments, foremanId } = req.body;
    // assignments: [{ subcontractorId, assignedVolume }]

    await client.query('BEGIN');

    // Проверяем, что работа существует
    const workResult = await client.query(
      'SELECT total_volume, completed_volume FROM work_items WHERE id = $1',
      [workItemId]
    );

    if (workResult.rows.length === 0) {
      throw new Error('Работа не найдена');
    }

    const { total_volume, completed_volume } = workResult.rows[0];
    const remainingVolume = total_volume - completed_volume;

    // Проверяем общий объем назначений
    const totalAssigned = assignments.reduce((sum, a) => sum + parseFloat(a.assignedVolume), 0);
    
    if (totalAssigned > remainingVolume) {
      throw new Error(`Превышен доступный объем. Осталось: ${remainingVolume}, назначено: ${totalAssigned}`);
    }

    // Создаем назначения
    const createdAssignments = [];
    for (const assignment of assignments) {
      const result = await client.query(
        `INSERT INTO work_assignments 
         (work_item_id, subcontractor_id, assigned_by, assigned_volume, status)
         VALUES ($1, $2, $3, $4, 'assigned')
         RETURNING *`,
        [workItemId, assignment.subcontractorId, foremanId, assignment.assignedVolume]
      );
      createdAssignments.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Работы успешно распределены',
      assignments: createdAssignments
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка распределения работ:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получить входящие выполненные объемы для проверки
router.get('/pending-approvals/:foremanId', async (req, res) => {
  try {
    const { foremanId } = req.params;

    const result = await pool.query(
      `SELECT 
         cw.*,
         wa.work_item_id,
         wa.assigned_volume,
         wi.work_type,
         wi.stage,
         wi.block,
         wi.floor,
         wi.unit,
         u.username as subcontractor_name,
         u.company_name
       FROM completed_works cw
       JOIN work_assignments wa ON cw.assignment_id = wa.id
       JOIN work_items wi ON wa.work_item_id = wi.id
       JOIN users u ON cw.submitted_by = u.id
       WHERE wa.assigned_by = $1 AND cw.status = 'submitted'
       ORDER BY cw.created_at DESC`,
      [foremanId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения ожидающих подтверждения работ:', error);
    res.status(500).json({ error: error.message });
  }
});

// Подтвердить или отклонить выполненный объем
router.post('/approve-work', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { completedWorkId, foremanId, status, adjustedVolume, notes } = req.body;
    // status: 'approved' или 'rejected'

    await client.query('BEGIN');

    // Обновляем статус выполненной работы
    const volume = adjustedVolume || null;
    
    await client.query(
      `UPDATE completed_works 
       SET status = $1, 
           verified_by = $2, 
           completed_volume = COALESCE($3, completed_volume),
           notes = COALESCE($4, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [status, foremanId, volume, notes, completedWorkId]
    );

    // Если одобрено, обновляем общий выполненный объем
    if (status === 'approved') {
      const workData = await client.query(
        `SELECT cw.completed_volume, wa.work_item_id
         FROM completed_works cw
         JOIN work_assignments wa ON cw.assignment_id = wa.id
         WHERE cw.id = $1`,
        [completedWorkId]
      );

      if (workData.rows.length > 0) {
        const { completed_volume, work_item_id } = workData.rows[0];
        
        await client.query(
          `UPDATE work_items 
           SET completed_volume = completed_volume + $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [completed_volume, work_item_id]
        );

        // Обновляем статус назначения
        await client.query(
          `UPDATE work_assignments wa
           SET status = 'approved', updated_at = CURRENT_TIMESTAMP
           FROM completed_works cw
           WHERE cw.id = $1 AND wa.id = cw.assignment_id`,
          [completedWorkId]
        );
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: status === 'approved' ? 'Работа одобрена' : 'Работа отклонена'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка подтверждения работы:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получить все назначения прораба
router.get('/my-assignments/:foremanId', async (req, res) => {
  try {
    const { foremanId } = req.params;

    const result = await pool.query(
      `SELECT 
         wa.*,
         wi.work_type,
         wi.stage,
         wi.block,
         wi.floor,
         wi.unit,
         wi.total_volume,
         wi.start_date,
         wi.end_date,
         u.username as subcontractor_name,
         u.company_name,
         COALESCE(SUM(cw.completed_volume), 0) as completed_so_far
       FROM work_assignments wa
       JOIN work_items wi ON wa.work_item_id = wi.id
       JOIN users u ON wa.subcontractor_id = u.id
       LEFT JOIN completed_works cw ON wa.id = cw.assignment_id AND cw.status = 'approved'
       WHERE wa.assigned_by = $1
       GROUP BY wa.id, wi.id, u.id
       ORDER BY wa.created_at DESC`,
      [foremanId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения назначений:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
