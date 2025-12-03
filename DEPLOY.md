# Система учета строительных работ - Инструкция по деплою

## Деплой на Railway

### 1. Подготовка

1. Создайте аккаунт на [Railway](https://railway.app)
2. Создайте репозиторий на GitHub и загрузите код:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Создание проекта на Railway

1. Войдите в Railway и нажмите "New Project"
2. Выберите "Deploy from GitHub repo"
3. Выберите ваш репозиторий
4. Railway автоматически обнаружит Dockerfile

### 3. Добавление PostgreSQL

1. В проекте нажмите "New" → "Database" → "Add PostgreSQL"
2. Railway автоматически создаст переменную `DATABASE_URL`

### 4. Настройка переменных окружения

В настройках проекта добавьте переменные:

- `DATABASE_URL` - (автоматически создастся при добавлении PostgreSQL)
- `PORT` - `3000`
- `JWT_SECRET` - ваш секретный ключ (например: `my-super-secret-key-change-this`)
- `NODE_ENV` - `production`

### 5. Деплой

Railway автоматически задеплоит приложение. После успешного деплоя:

1. Откройте Settings → Generate Domain
2. Вы получите публичный URL типа `https://your-app.railway.app`

## Локальная разработка

### Установка

```bash
# Установка зависимостей
npm install
cd client && npm install && cd ..

# Настройка окружения
cp .env.example .env
# Отредактируйте .env с вашими данными
```

### База данных

Для локальной разработки установите PostgreSQL:

1. Скачайте PostgreSQL: https://www.postgresql.org/download/
2. Создайте базу данных:

```sql
CREATE DATABASE construction_db;
```

3. Обновите `DATABASE_URL` в `.env`:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/construction_db
```

4. Создайте таблицы:

```bash
npm run db:migrate
```

### Запуск

```bash
# Режим разработки (backend + frontend одновременно)
npm run dev

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

## Первый запуск

1. Откройте приложение в браузере
2. Зарегистрируйте пользователей:
   - Плановик (для загрузки XML)
   - Прораб (для распределения работ)
   - Субподрядчики (для выполнения работ)

3. Войдите как плановик и загрузите XML файл

## Структура ролей

### Плановик
- Загружает XML файлы из Primavera P6
- Просматривает все объекты
- Экспортирует обновленные данные

### Прораб
- Формирует список работ на ближайшие недели
- Распределяет работы субподрядчикам
- Проверяет и подтверждает выполнение

### Субподрядчик
- Просматривает свои наряды
- Фиксирует выполненные объемы
- Отправляет на проверку прорабу

## Troubleshooting

### Ошибка подключения к БД

Убедитесь, что:
- PostgreSQL запущен
- `DATABASE_URL` правильно настроен
- База данных создана
- Таблицы созданы (npm run db:migrate)

### Frontend не подключается к Backend

В режиме разработки:
- Backend должен работать на порту 3000
- Frontend на порту 5173
- Vite proxy настроен автоматически

В production:
- Frontend собирается в `client/dist`
- Express отдает статические файлы

## API Endpoints

### Auth
- POST `/api/auth/register` - Регистрация
- POST `/api/auth/login` - Вход
- GET `/api/auth/users` - Список пользователей

### Planner
- POST `/api/planner/upload` - Загрузка XML
- GET `/api/planner/objects` - Список объектов
- GET `/api/planner/objects/:id` - Детали объекта
- GET `/api/planner/export/:id` - Экспорт XML

### Foreman
- GET `/api/foreman/upcoming-works/:objectId` - Ближайшие работы
- POST `/api/foreman/assign-work` - Распределить работу
- GET `/api/foreman/pending-approvals/:foremanId` - Ожидающие подтверждения
- POST `/api/foreman/approve-work` - Подтвердить/отклонить

### Subcontractor
- GET `/api/subcontractor/my-assignments/:id` - Мои наряды
- POST `/api/subcontractor/submit-work` - Сдать работу
- GET `/api/subcontractor/statistics/:id` - Статистика
