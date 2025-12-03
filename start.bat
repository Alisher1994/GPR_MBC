@echo off
echo ========================================
echo   Система учета строительных работ
echo   Быстрый запуск
echo ========================================
echo.

:menu
echo Выберите действие:
echo.
echo 1. Первый запуск (создать таблицы БД)
echo 2. Запустить приложение
echo 3. Установить зависимости
echo 4. Запустить только backend
echo 5. Запустить только frontend
echo 6. Выход
echo.
set /p choice="Введите номер (1-6): "

if "%choice%"=="1" goto first_run
if "%choice%"=="2" goto run_app
if "%choice%"=="3" goto install_deps
if "%choice%"=="4" goto run_backend
if "%choice%"=="5" goto run_frontend
if "%choice%"=="6" goto end

echo Неверный выбор!
pause
goto menu

:first_run
echo.
echo ========================================
echo Первый запуск - создание таблиц БД
echo ========================================
echo.
echo ВНИМАНИЕ: Убедитесь, что:
echo 1. PostgreSQL установлен и запущен
echo 2. Создана база данных construction_db
echo 3. Файл .env настроен с правильным паролем
echo.
pause
npm run db:migrate
echo.
echo Таблицы созданы!
pause
goto menu

:run_app
echo.
echo ========================================
echo Запуск приложения
echo ========================================
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Нажмите Ctrl+C для остановки
echo.
npm run dev
goto menu

:install_deps
echo.
echo ========================================
echo Установка зависимостей
echo ========================================
echo.
echo Устанавливаю backend зависимости...
call npm install
echo.
echo Устанавливаю frontend зависимости...
cd client
call npm install
cd ..
echo.
echo Готово!
pause
goto menu

:run_backend
echo.
echo ========================================
echo Запуск только backend
echo ========================================
echo.
echo API: http://localhost:3000
echo.
npm run server
goto menu

:run_frontend
echo.
echo ========================================
echo Запуск только frontend
echo ========================================
echo.
echo App: http://localhost:5173
echo.
cd client
npm run dev
cd ..
goto menu

:end
echo.
echo Спасибо за использование!
echo.
exit
