-- Проверка структуры базы данных после миграции

-- Проверка таблицы objects
SELECT 
  'objects' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'objects'
ORDER BY ordinal_position;

-- Проверка таблицы sections
SELECT 
  'sections' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sections'
ORDER BY ordinal_position;

-- Проверка таблицы xml_files
SELECT 
  'xml_files' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'xml_files'
ORDER BY ordinal_position;

-- Проверка таблицы work_items
SELECT 
  'work_items' as table_name,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'work_items'
WHERE column_name IN ('section_id', 'object_id')
ORDER BY ordinal_position;

-- Проверка индексов и ограничений
SELECT
  tc.table_name, 
  tc.constraint_name, 
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('objects', 'sections', 'xml_files', 'work_items')
ORDER BY tc.table_name, tc.constraint_type;
