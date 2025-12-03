import pool from './pool.js';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Таблица пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('planner', 'foreman', 'subcontractor')),
        company_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица объектов
    await client.query(`
      CREATE TABLE IF NOT EXISTS objects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица XML файлов
    await client.query(`
      CREATE TABLE IF NOT EXISTS xml_files (
        id SERIAL PRIMARY KEY,
        object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(500) NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица видов работ (из XML)
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_items (
        id SERIAL PRIMARY KEY,
        object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,
        xml_file_id INTEGER REFERENCES xml_files(id) ON DELETE SET NULL,
        stage VARCHAR(255) NOT NULL,
        block VARCHAR(255) NOT NULL,
        floor VARCHAR(255) NOT NULL,
        work_type VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_volume NUMERIC(12, 2) NOT NULL,
        completed_volume NUMERIC(12, 2) DEFAULT 0,
        unit VARCHAR(50) NOT NULL,
        daily_target NUMERIC(12, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(object_id, stage, block, floor, work_type)
      )
    `);

    // Таблица нарядов (распределение работ субподрядчикам)
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_assignments (
        id SERIAL PRIMARY KEY,
        work_item_id INTEGER REFERENCES work_items(id) ON DELETE CASCADE,
        subcontractor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id),
        assigned_volume NUMERIC(12, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'submitted', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Таблица выполненных объемов
    await client.query(`
      CREATE TABLE IF NOT EXISTS completed_works (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES work_assignments(id) ON DELETE CASCADE,
        completed_volume NUMERIC(12, 2) NOT NULL,
        work_date DATE NOT NULL,
        notes TEXT,
        submitted_by INTEGER REFERENCES users(id),
        verified_by INTEGER REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Индексы для оптимизации запросов
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_work_items_dates ON work_items(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_work_assignments_status ON work_assignments(status);
      CREATE INDEX IF NOT EXISTS idx_completed_works_date ON completed_works(work_date);
    `);

    await client.query('COMMIT');
    console.log('✅ Таблицы базы данных успешно созданы');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка создания таблиц:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Запуск миграции при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
  createTables()
    .then(() => {
      console.log('Миграция завершена');
      process.exit(0);
    })
    .catch(err => {
      console.error('Миграция не удалась:', err);
      process.exit(1);
    });
}

export default createTables;
