import pool from './pool.js';

async function testConnection() {
  try {
    console.log('🔍 Проверка подключения к базе данных...');
    
    // Простой запрос
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Подключение успешно! Время на сервере:', result.rows[0].now);
    
    // Проверка таблицы objects
    console.log('\n📋 Проверка таблицы objects...');
    const objectsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'objects'
      )
    `);
    
    if (objectsCheck.rows[0].exists) {
      console.log('✅ Таблица objects существует');
      
      const objectsCount = await pool.query('SELECT COUNT(*) FROM objects');
      console.log(`   Количество записей: ${objectsCount.rows[0].count}`);
    } else {
      console.log('❌ Таблица objects НЕ существует!');
      console.log('⚠️  Необходимо выполнить миграцию базы данных');
    }
    
    // Проверка таблицы sections
    console.log('\n📦 Проверка таблицы sections...');
    const sectionsCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'sections'
      )
    `);
    
    if (sectionsCheck.rows[0].exists) {
      console.log('✅ Таблица sections существует');
      
      const sectionsCount = await pool.query('SELECT COUNT(*) FROM sections');
      console.log(`   Количество записей: ${sectionsCount.rows[0].count}`);
    } else {
      console.log('❌ Таблица sections НЕ существует!');
    }
    
    // Проверка таблицы xml_files
    console.log('\n📄 Проверка таблицы xml_files...');
    const xmlCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'xml_files'
      )
    `);
    
    if (xmlCheck.rows[0].exists) {
      console.log('✅ Таблица xml_files существует');
      
      // Проверка структуры
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'xml_files'
        ORDER BY ordinal_position
      `);
      
      console.log('   Колонки:', columns.rows.map(c => c.column_name).join(', '));
      
      const xmlCount = await pool.query('SELECT COUNT(*) FROM xml_files');
      console.log(`   Количество записей: ${xmlCount.rows[0].count}`);
    } else {
      console.log('❌ Таблица xml_files НЕ существует!');
    }
    
    // Проверка work_items
    console.log('\n⚙️  Проверка таблицы work_items...');
    const workItemsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'work_items' 
      AND column_name IN ('section_id', 'object_id')
    `);
    
    console.log('   Найденные колонки:', workItemsCheck.rows.map(c => c.column_name).join(', '));
    
    if (workItemsCheck.rows.some(c => c.column_name === 'section_id')) {
      console.log('✅ Колонка section_id существует (новая структура)');
    }
    
    if (workItemsCheck.rows.some(c => c.column_name === 'object_id')) {
      console.log('⚠️  Колонка object_id все еще существует (старая структура)');
    }
    
    console.log('\n✅ Проверка завершена!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Полный текст ошибки:', error);
    process.exit(1);
  }
}

testConnection();
