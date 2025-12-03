import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const router = express.Router();

// Регистрация пользователя (упрощенная для MVP)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, companyName } = req.body;

    // Валидация
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Заполните все обязательные поля' });
    }

    if (!['planner', 'foreman', 'subcontractor'].includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const result = await pool.query(
      `INSERT INTO users (username, password, role, company_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, role, company_name, created_at`,
      [username, hashedPassword, role, companyName]
    );

    const user = result.rows[0];

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        companyName: user.company_name
      },
      token
    });

  } catch (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
    }
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: error.message });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Введите имя пользователя и пароль' });
    }

    // Находим пользователя
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    const user = result.rows[0];

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
    }

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Вход выполнен успешно',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        companyName: user.company_name
      },
      token
    });

  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получить список пользователей (для выбора субподрядчиков)
router.get('/users', async (req, res) => {
  try {
    const { role } = req.query;

    let query = 'SELECT id, username, role, company_name, created_at FROM users';
    const params = [];

    if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    }

    query += ' ORDER BY username';

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
