-- Скрипт для создания тестовых пользователей
-- Пароль для всех: "password123"

INSERT INTO users (username, password, role, company_name) VALUES
  ('planner1', '$2a$10$rOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5q', 'planner', 'Отдел планирования'),
  ('foreman1', '$2a$10$rOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5q', 'foreman', 'ГенПодряд Строй'),
  ('sub1', '$2a$10$rOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5q', 'subcontractor', 'СтройАльянс ООО'),
  ('sub2', '$2a$10$rOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5qZqZqZqZqOYJvH8YnQZ5q', 'subcontractor', 'МонтажСервис ООО');

-- Примечание: Используйте регистрацию через интерфейс для создания реальных пользователей
-- Этот скрипт только для справки
