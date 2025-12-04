import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';
import { parseXMLFile, generateXMLFromData, generateCompletedWorksXML } from '../utils/xmlParser.js';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.xml') {
      cb(null, true);
    } else {
      cb(new Error('Только XML файлы разрешены'));
    }
  }
});

// ========== ОБЪЕКТЫ ==========

// Получить все объекты
router.get('/objects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        u.username as created_by_name,
        COUNT(DISTINCT q.id) as queues_count
      FROM objects o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN queues q ON o.id = q.object_id
      GROUP BY o.id, u.username
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения объектов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать новый объект
router.post('/objects', async (req, res) => {
  try {
    const { name, userId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название объекта обязательно' });
    }

    const result = await pool.query(
      'INSERT INTO objects (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Ошибка создания объекта:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить объект
router.delete('/objects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Удаляем объект (каскадно удалятся очереди, секции, файлы и работы)
    await pool.query('DELETE FROM objects WHERE id = $1', [id]);

    res.json({ message: 'Объект успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления объекта:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ОЧЕРЕДИ ==========

// Получить очереди объекта
router.get('/objects/:objectId/queues', async (req, res) => {
  try {
    const { objectId } = req.params;

    const result = await pool.query(`
      SELECT 
        q.*,
        u.username as created_by_name,
        COUNT(DISTINCT s.id) as sections_count
      FROM queues q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN sections s ON q.id = s.queue_id
      WHERE q.object_id = $1
      GROUP BY q.id, u.username
      ORDER BY q.queue_number
    `, [objectId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения очередей:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать очередь
router.post('/objects/:objectId/queues', async (req, res) => {
  try {
    const { objectId } = req.params;
    const { queueNumber, queueName, userId } = req.body;

    if (!queueNumber || !queueName) {
      return res.status(400).json({ error: 'Номер и название очереди обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO queues (object_id, queue_number, queue_name, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [objectId, queueNumber, queueName, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Очередь с таким номером уже существует' });
    } else {
      console.error('Ошибка создания очереди:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Удалить очередь
router.delete('/queues/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM queues WHERE id = $1', [id]);

    res.json({ message: 'Очередь успешно удалена' });
  } catch (error) {
    console.error('Ошибка удаления очереди:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== СЕКЦИИ ==========

// Получить секции очереди
router.get('/queues/:queueId/sections', async (req, res) => {
  try {
    const { queueId } = req.params;

    const result = await pool.query(`
      SELECT 
        s.*,
        u.username as created_by_name,
        COUNT(DISTINCT xf.id) FILTER (WHERE xf.status = 'active') as active_files_count,
        MAX(xf.uploaded_at) as last_upload
      FROM sections s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN xml_files xf ON s.id = xf.section_id
      WHERE s.queue_id = $1
      GROUP BY s.id, u.username
      ORDER BY s.section_number
    `, [queueId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения секций:', error);
    res.status(500).json({ error: error.message });
  }
});

// Создать секцию
router.post('/queues/:queueId/sections', async (req, res) => {
  try {
    const { queueId } = req.params;
    const { sectionNumber, sectionName, userId } = req.body;

    if (!sectionNumber || !sectionName) {
      return res.status(400).json({ error: 'Номер и название секции обязательны' });
    }

    const result = await pool.query(
      `INSERT INTO sections (queue_id, section_number, section_name, created_by) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [queueId, sectionNumber, sectionName, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Секция с таким номером уже существует' });
    } else {
      console.error('Ошибка создания секции:', error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Удалить секцию
router.delete('/sections/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM sections WHERE id = $1', [id]);

    res.json({ message: 'Секция успешно удалена' });
  } catch (error) {
    console.error('Ошибка удаления секции:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== XML ФАЙЛЫ ==========

// Получить все XML файлы секции
router.get('/sections/:sectionId/xml-files', async (req, res) => {
  try {
    const { sectionId } = req.params;

    const result = await pool.query(`
      SELECT 
        xf.*,
        u.username as uploaded_by_name
      FROM xml_files xf
      LEFT JOIN users u ON xf.uploaded_by = u.id
      WHERE xf.section_id = $1
      ORDER BY xf.uploaded_at DESC
    `, [sectionId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения файлов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Загрузить XML файл в секцию
router.post('/sections/:sectionId/upload-xml', upload.single('xmlFile'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { sectionId } = req.params;
    const { file } = req;
    const { userId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    await client.query('BEGIN');

    // Помечаем предыдущие файлы как замененные
    await client.query(
      `UPDATE xml_files SET status = 'replaced' 
       WHERE section_id = $1 AND status = 'active'`,
      [sectionId]
    );

    // Сохраняем новый файл
    const fileStats = await fs.stat(file.path);
    const xmlFileResult = await client.query(
      `INSERT INTO xml_files (section_id, filename, filepath, file_size, uploaded_by, status) 
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [sectionId, file.originalname, file.path, fileStats.size, userId]
    );

    const xmlFileId = xmlFileResult.rows[0].id;

    // Парсим XML - получаем массив work items (только floor и workType)
    const workItems = await parseXMLFile(file.path);

    // Удаляем старые work_items для этой секции
    await client.query('DELETE FROM work_items WHERE section_id = $1', [sectionId]);

    // Вставляем новые work_items
    for (const item of workItems) {
      await client.query(
        `INSERT INTO work_items 
         (section_id, xml_file_id, floor, work_type, start_date, end_date, 
          total_volume, completed_volume, unit) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (section_id, floor, work_type)
         DO UPDATE SET
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           total_volume = EXCLUDED.total_volume,
           xml_file_id = EXCLUDED.xml_file_id,
           updated_at = CURRENT_TIMESTAMP`,
        [sectionId, xmlFileId, item.floor, item.workType,
         item.startDate, item.endDate, item.totalVolume, item.completedVolume, item.unit]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'XML файл успешно загружен',
      file: xmlFileResult.rows[0],
      itemsCount: workItems.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка загрузки XML:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Удалить XML файл
router.delete('/xml-files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Помечаем как удаленный
    await pool.query(
      `UPDATE xml_files SET status = 'deleted' WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Файл успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить работы секции (для визуализации ганта)
router.get('/sections/:sectionId/works', async (req, res) => {
  try {
    const { sectionId } = req.params;

    const result = await pool.query(
      `SELECT 
         wi.*, 
         COALESCE(SUM(cw.completed_volume), 0) AS actual_completed,
         COALESCE(SUM(wa.assigned_volume), 0) AS assigned_total,
         COUNT(DISTINCT wa.id) AS assignments_count
       FROM work_items wi
       LEFT JOIN work_assignments wa ON wi.id = wa.work_item_id
       LEFT JOIN completed_works cw ON wa.id = cw.assignment_id AND cw.status = 'approved'
       WHERE wi.section_id = $1
       GROUP BY wi.id
       ORDER BY wi.start_date, wi.floor, wi.work_type`,
      [sectionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения работ для ганта:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ЭКСПОРТ ==========

// Экспорт всех работ секции
router.get('/sections/:sectionId/export', async (req, res) => {
  try {
    const { sectionId } = req.params;

    const sectionInfo = await pool.query(
      `SELECT s.section_name, s.section_number, q.queue_name, q.queue_number, o.name AS object_name
       FROM sections s
       JOIN queues q ON s.queue_id = q.id
       JOIN objects o ON q.object_id = o.id
       WHERE s.id = $1`,
      [sectionId]
    );

    if (sectionInfo.rowCount === 0) {
      return res.status(404).json({ error: 'Секция не найдена' });
    }

    const result = await pool.query(
      `SELECT wi.*, s.section_name, s.section_number
       FROM work_items wi
       JOIN sections s ON wi.section_id = s.id
       WHERE wi.section_id = $1
       ORDER BY wi.floor, wi.work_type`,
      [sectionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Нет данных для экспорта' });
    }

    const xmlContent = await generateXMLFromData(sectionInfo.rows[0], result.rows);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=export-section-${sectionId}.xml`);
    res.send(xmlContent);

  } catch (error) {
    console.error('Ошибка экспорта:', error);
    res.status(500).json({ error: error.message });
  }
});

// Экспорт завершенных работ секции
router.get('/sections/:sectionId/export-completed', async (req, res) => {
  try {
    const { sectionId } = req.params;

    const sectionInfo = await pool.query(
      `SELECT s.section_name, s.section_number, q.queue_name, q.queue_number, o.name AS object_name
       FROM sections s
       JOIN queues q ON s.queue_id = q.id
       JOIN objects o ON q.object_id = o.id
       WHERE s.id = $1`,
      [sectionId]
    );

    if (sectionInfo.rowCount === 0) {
      return res.status(404).json({ error: 'Секция не найдена' });
    }

    const result = await pool.query(
      `SELECT wi.*, s.section_name, s.section_number
       FROM work_items wi
       JOIN sections s ON wi.section_id = s.id
       WHERE wi.section_id = $1 AND wi.completed_volume > 0
       ORDER BY wi.floor, wi.work_type`,
      [sectionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Нет завершенных работ для экспорта' });
    }

    const xmlContent = await generateCompletedWorksXML(sectionInfo.rows[0], result.rows);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename=completed-section-${sectionId}.xml`);
    res.send(xmlContent);

  } catch (error) {
    console.error('Ошибка экспорта завершенных работ:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
