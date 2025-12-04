import pool from './pool.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const recreateTables = async (retries = 5, delay = 3000) => {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set - skipping database setup');
    return;
  }

  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📊 Connecting to database (attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        console.log('✅ Connected!');
        console.log('🗑️  Dropping old tables...');

        // Удаляем все таблицы в правильном порядке (от зависимых к независимым)
        await client.query('DROP TABLE IF EXISTS completed_works CASCADE');
        await client.query('DROP TABLE IF EXISTS work_assignments CASCADE');
        await client.query('DROP TABLE IF EXISTS work_items CASCADE');
        await client.query('DROP TABLE IF EXISTS xml_files CASCADE');
        await client.query('DROP TABLE IF EXISTS sections CASCADE');
        await client.query('DROP TABLE IF EXISTS queues CASCADE');
        await client.query('DROP TABLE IF EXISTS objects CASCADE');
        
        console.log('✓ Old tables dropped');
        console.log('🔨 Creating new tables...');

        // Таблица пользователей (не удаляем, чтобы сохранить логины)
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
        console.log('✓ Users table');

        // Таблица объектов
        await client.query(`
          CREATE TABLE objects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✓ Objects table');

        // Таблица очередей (этапов)
        await client.query(`
          CREATE TABLE queues (
            id SERIAL PRIMARY KEY,
            object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,
            queue_number INTEGER NOT NULL,
            queue_name VARCHAR(255) NOT NULL,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(object_id, queue_number)
          )
        `);
        console.log('✓ Queues table');

        // Таблица секций (теперь привязана к очереди)
        await client.query(`
          CREATE TABLE sections (
            id SERIAL PRIMARY KEY,
            queue_id INTEGER REFERENCES queues(id) ON DELETE CASCADE,
            section_number INTEGER NOT NULL,
            section_name VARCHAR(255) NOT NULL,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(queue_id, section_number)
          )
        `);
        console.log('✓ Sections table');

        // Таблица XML файлов
        await client.query(`
          CREATE TABLE xml_files (
            id SERIAL PRIMARY KEY,
            section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
            filename VARCHAR(255) NOT NULL,
            filepath VARCHAR(500) NOT NULL,
            file_size INTEGER,
            uploaded_by INTEGER REFERENCES users(id),
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'replaced', 'deleted'))
          )
        `);
        console.log('✓ XML files table');

        // Таблица работ (только этажи и виды работ, так как секции создаются вручную)
        await client.query(`
          CREATE TABLE work_items (
            id SERIAL PRIMARY KEY,
            section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
            xml_file_id INTEGER REFERENCES xml_files(id) ON DELETE SET NULL,
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
            UNIQUE(section_id, floor, work_type)
          )
        `);
        console.log('✓ Work items table');

        // Таблица назначений
        await client.query(`
          CREATE TABLE work_assignments (
            id SERIAL PRIMARY KEY,
            work_item_id INTEGER REFERENCES work_items(id) ON DELETE CASCADE,
            subcontractor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            foreman_id INTEGER REFERENCES users(id),
            assigned_volume NUMERIC(12, 2) NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✓ Work assignments table');

        // Таблица выполненных работ
        await client.query(`
          CREATE TABLE completed_works (
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
        console.log('✓ Completed works table');

        // Индексы
        await client.query(`
          CREATE INDEX idx_work_items_dates ON work_items(start_date, end_date);
          CREATE INDEX idx_work_assignments_status ON work_assignments(status);
          CREATE INDEX idx_completed_works_date ON completed_works(work_date);
          CREATE INDEX idx_queues_object ON queues(object_id);
          CREATE INDEX idx_sections_queue ON sections(queue_id);
          CREATE INDEX idx_xml_files_section ON xml_files(section_id);
        `);
        console.log('✓ Indexes created');

        await client.query('COMMIT');
        console.log('✅ Database recreated successfully!');
        console.log('📝 Note: Old data was removed. Users are preserved.');
        return;
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Error (attempt ${attempt}/${retries}):`, error.message);
        lastError = error;
      } finally {
        client.release();
      }
    } catch (connectionError) {
      console.error(`❌ Connection failed (attempt ${attempt}/${retries}):`, connectionError.message);
      lastError = connectionError;
    }

    if (attempt < retries) {
      console.log(`⏳ Waiting ${delay / 1000} seconds...`);
      await sleep(delay);
    }
  }

  console.error('❌ Failed after all attempts');
  throw lastError;
};

// Запуск при прямом вызове
if (import.meta.url === `file://${process.argv[1]}`) {
  recreateTables()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Failed:', err);
      process.exit(1);
    });
}

export default recreateTables;
