import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';
import { parseXMLFile, generateXMLFromData } from '../utils/xmlParser.js';
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

// Загрузка XML файла
router.post('/upload', upload.single('xmlFile'), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { file } = req;
    const { userId } = req.body; // В реальном проекте получаем из JWT

    if (!file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    // Парсим XML
    const { objectName, workItems } = await parseXMLFile(file.path);

    await client.query('BEGIN');

    // Создаем или получаем объект
    let objectResult = await client.query(
      'INSERT INTO objects (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING id',
      [objectName]
    );

    if (objectResult.rows.length === 0) {
      objectResult = await client.query(
        'SELECT id FROM objects WHERE name = $1',
        [objectName]
      );
    }

    const objectId = objectResult.rows[0].id;

    // Сохраняем информацию о файле
    const fileResult = await client.query(
      `INSERT INTO xml_files (object_id, filename, filepath, uploaded_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [objectId, file.originalname, file.path, userId || null]
    );

    const xmlFileId = fileResult.rows[0].id;

    // Сохраняем или обновляем виды работ
    for (const item of workItems) {
      await client.query(
        `INSERT INTO work_items 
         (object_id, xml_file_id, stage, block, floor, work_type, start_date, end_date, 
          total_volume, completed_volume, unit, daily_target)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (object_id, stage, block, floor, work_type)
         DO UPDATE SET
           start_date = EXCLUDED.start_date,
           end_date = EXCLUDED.end_date,
           total_volume = EXCLUDED.total_volume,
           unit = EXCLUDED.unit,
           daily_target = EXCLUDED.daily_target,
           xml_file_id = EXCLUDED.xml_file_id,
           updated_at = CURRENT_TIMESTAMP`,
        [objectId, xmlFileId, item.stage, item.block, item.floor, item.workType,
         item.startDate, item.endDate, item.totalVolume, item.completedVolume, 
         item.unit, item.dailyTarget]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'XML файл успешно загружен',
      objectId,
      objectName,
      workItemsCount: workItems.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка загрузки XML:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Получить список объектов
router.get('/objects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, 
             COUNT(DISTINCT wi.id) as work_items_count,
             MAX(xf.uploaded_at) as last_update
      FROM objects o
      LEFT JOIN work_items wi ON o.id = wi.object_id
      LEFT JOIN xml_files xf ON o.id = xf.object_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения объектов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить детали объекта
router.get('/objects/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const objectResult = await pool.query(
      'SELECT * FROM objects WHERE id = $1',
      [id]
    );

    if (objectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Объект не найден' });
    }

    const workItemsResult = await pool.query(
      `SELECT * FROM work_items 
       WHERE object_id = $1 
       ORDER BY start_date, stage, block, floor`,
      [id]
    );

    res.json({
      object: objectResult.rows[0],
      workItems: workItemsResult.rows
    });
  } catch (error) {
    console.error('Ошибка получения деталей объекта:', error);
    res.status(500).json({ error: error.message });
  }
});

// Экспорт данных в XML для плановика
router.get('/export/:objectId', async (req, res) => {
  try {
    const { objectId } = req.params;

    const objectResult = await pool.query(
      'SELECT name FROM objects WHERE id = $1',
      [objectId]
    );

    if (objectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Объект не найден' });
    }

    const workItemsResult = await pool.query(
      'SELECT * FROM work_items WHERE object_id = $1 ORDER BY stage, block, floor',
      [objectId]
    );

    const xmlContent = await generateXMLFromData(
      objectResult.rows[0].name,
      workItemsResult.rows
    );

    res.header('Content-Type', 'application/xml');
    res.header('Content-Disposition', `attachment; filename="export-${objectId}-${Date.now()}.xml"`);
    res.send(xmlContent);

  } catch (error) {
    console.error('Ошибка экспорта XML:', error);
    res.status(500).json({ error: error.message });
  }
});

// Удалить объект и все связанные данные
router.delete('/objects/:id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Удаляем в правильном порядке из-за внешних ключей
    await client.query('DELETE FROM completed_works WHERE assignment_id IN (SELECT id FROM work_assignments WHERE work_item_id IN (SELECT id FROM work_items WHERE object_id = $1))', [id]);
    await client.query('DELETE FROM work_assignments WHERE work_item_id IN (SELECT id FROM work_items WHERE object_id = $1)', [id]);
    await client.query('DELETE FROM work_items WHERE object_id = $1', [id]);
    await client.query('DELETE FROM xml_files WHERE object_id = $1', [id]);
    await client.query('DELETE FROM objects WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ success: true, message: 'Объект успешно удален' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Ошибка удаления объекта:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

export default router;
