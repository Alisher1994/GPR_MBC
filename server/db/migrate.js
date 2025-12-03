import pool from './pool.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createTables = async (retries = 5, delay = 3000) => {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  Skipping database setup - DATABASE_URL not set');
    return;
  }

  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📊 Attempting to connect to database (attempt ${attempt}/${retries})...`);
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        console.log('✅ Database connection successful!');
        console.log('🔧 Running database migrations...');

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
        console.log('✓ Users table ready');

        // Проверка и создание таблицы objects
        const objectsTableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'objects'
          )
        `);

        if (objectsTableExists.rows[0].exists) {
          console.log('⚙️  Objects table exists, checking columns...');
          
          // Проверка и добавление колонки created_by
          const createdByExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'objects' AND column_name = 'created_by'
            )
          `);
          
          if (!createdByExists.rows[0].exists) {
            console.log('📝 Adding created_by column...');
            await client.query(`ALTER TABLE objects ADD COLUMN created_by INTEGER REFERENCES users(id)`);
          }
          
          // Проверка и добавление колонки created_at
          const createdAtExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'objects' AND column_name = 'created_at'
            )
          `);
          
          if (!createdAtExists.rows[0].exists) {
            console.log('📝 Adding created_at column...');
            await client.query(`ALTER TABLE objects ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
          }
          
          // Проверка и добавление колонки updated_at
          const updatedAtExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'objects' AND column_name = 'updated_at'
            )
          `);
          
          if (!updatedAtExists.rows[0].exists) {
            console.log('📝 Adding updated_at column...');
            await client.query(`ALTER TABLE objects ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
          }
        } else {
          console.log('📝 Creating objects table...');
          await client.query(`
            CREATE TABLE objects (
              id SERIAL PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              created_by INTEGER REFERENCES users(id),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
        }
        console.log('✓ Objects table ready');

        console.log('✓ Objects table ready');

        // Таблица секций
        await client.query(`
          CREATE TABLE IF NOT EXISTS sections (
            id SERIAL PRIMARY KEY,
            object_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,
            section_number INTEGER NOT NULL,
            section_name VARCHAR(255) NOT NULL,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(object_id, section_number)
          )
        `);
        console.log('✓ Sections table ready');

        // Таблица XML файлов
        await client.query(`
          CREATE TABLE IF NOT EXISTS xml_files (
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
        console.log('✓ XML files table ready');

        // Проверка и миграция work_items
        const workItemsTableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'work_items'
          )
        `);

        if (workItemsTableExists.rows[0].exists) {
          console.log('⚙️  Work_items table exists, checking structure...');
          
          // Проверка наличия section_id
          const sectionIdExists = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'work_items' AND column_name = 'section_id'
            )
          `);
          
          if (!sectionIdExists.rows[0].exists) {
            console.log('📝 Migrating work_items to new structure...');
            
            // Добавляем section_id и xml_file_id
            await client.query(`
              ALTER TABLE work_items 
              ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
              ADD COLUMN xml_file_id INTEGER REFERENCES xml_files(id) ON DELETE SET NULL
            `);
            
            // Удаляем старое ограничение уникальности если есть
            await client.query(`
              DO $$ 
              BEGIN
                IF EXISTS (
                  SELECT 1 FROM pg_constraint 
                  WHERE conname = 'work_items_object_id_stage_section_floor_work_type_key'
                ) THEN
                  ALTER TABLE work_items DROP CONSTRAINT work_items_object_id_stage_section_floor_work_type_key;
                END IF;
              END $$;
            `);
            
            // Добавляем новое ограничение
            await client.query(`
              ALTER TABLE work_items 
              ADD CONSTRAINT work_items_section_id_stage_section_floor_work_type_key 
              UNIQUE(section_id, stage, section, floor, work_type)
            `);
            
            console.log('✓ Work_items migrated successfully');
          }
        } else {
          console.log('📝 Creating work_items table...');
          await client.query(`
            CREATE TABLE work_items (
              id SERIAL PRIMARY KEY,
              section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
              xml_file_id INTEGER REFERENCES xml_files(id) ON DELETE SET NULL,
              stage VARCHAR(255) NOT NULL,
              section VARCHAR(255) NOT NULL,
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
              UNIQUE(section_id, stage, section, floor, work_type)
            )
          `);
        }
        console.log('✓ Work_items table ready');

        console.log('✓ Work_items table ready');

        // Таблица нарядов (распределение работ субподрядчикам)
        await client.query(`
          CREATE TABLE IF NOT EXISTS work_assignments (
            id SERIAL PRIMARY KEY,
            work_item_id INTEGER REFERENCES work_items(id) ON DELETE CASCADE,
            subcontractor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            foreman_id INTEGER REFERENCES users(id),
            assigned_volume NUMERIC(12, 2) NOT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✓ Work_assignments table ready');

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
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        console.log('✓ Completed_works table ready');

        // Индексы для оптимизации запросов
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_work_items_dates ON work_items(start_date, end_date);
          CREATE INDEX IF NOT EXISTS idx_work_assignments_status ON work_assignments(status);
          CREATE INDEX IF NOT EXISTS idx_completed_works_date ON completed_works(work_date);
          CREATE INDEX IF NOT EXISTS idx_sections_object ON sections(object_id);
          CREATE INDEX IF NOT EXISTS idx_xml_files_section ON xml_files(section_id);
        `);
        console.log('✓ Indexes created');

        await client.query('COMMIT');
        console.log('✅ Database migration completed successfully!');
        return; // Успешное завершение
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Ошибка создания таблиц (попытка ${attempt}/${retries}):`, error.message);
    lastError = error;
  } finally {
    client.release();
  }
    } catch (connectionError) {
      console.error(`❌ Не удалось подключиться к базе данных (попытка ${attempt}/${retries}):`, connectionError.message);
      lastError = connectionError;
    }

    if (attempt < retries) {
      console.log(`⏳ Ожидание ${delay / 1000} секунд перед следующей попыткой...`);
      await sleep(delay);
    }
  }

  // Если все попытки исчерпаны
  console.error('❌ Не удалось подключиться к базе данных после всех попыток');
  throw lastError;
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
