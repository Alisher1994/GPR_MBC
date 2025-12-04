import { useState, useEffect } from 'react';
import { auth } from '../api';

// Галерея проектов MBC
const projects = [
  {
    id: 1,
    name: 'ЖК Tabiat Residence',
    image: 'https://mbc.uz/storage/projects/8ad929b1-a5d7-4294-8501-811d77743831.webp',
    description: 'Современный жилой комплекс с уникальной архитектурой'
  },
  {
    id: 2,
    name: 'ЖК Regnum Plaza',
    image: 'https://mbc.uz/storage/projects/4c351c1d-7754-4222-beb8-1028bd5c1a8c.webp',
    description: 'Премиальный комплекс в центре города'
  },
  {
    id: 3,
    name: 'ЖК Saadiyat',
    image: 'https://mbc.uz/storage/projects/1390f5c8-43d4-4001-be28-a8f2206d3190.webp',
    description: 'Остров счастья — место, где счастливая жизнь'
  },
  {
    id: 4,
    name: 'Center One',
    image: 'https://mbc.uz/storage/archs/57e245d5-0883-4af2-9b50-ead7ddb72586.webp',
    description: 'Бизнес-центр нового поколения'
  }
];

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  // Автопереключение слайдов как в сторис
  useEffect(() => {
    const slideDuration = 5000; // 5 секунд на слайд
    const progressInterval = 50; // обновление прогресса каждые 50мс
    
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          return 0;
        }
        return prev + (100 / (slideDuration / progressInterval));
      });
    }, progressInterval);

    const slideTimer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % projects.length);
      setProgress(0);
    }, slideDuration);

    return () => {
      clearInterval(progressTimer);
      clearInterval(slideTimer);
    };
  }, []);

  // Переключение слайда по клику на индикатор
  const goToSlide = (index) => {
    setCurrentSlide(index);
    setProgress(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isRegister 
        ? await auth.register(
            formData.username,
            formData.password,
            formData.role,
            formData.companyName
          )
        : await auth.login(formData.username, formData.password);

      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="auth-container" style={{
      backgroundImage: `url(${projects[currentSlide].image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transition: 'background-image 0.8s ease-in-out'
    }}>
      {/* Overlay для затемнения */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 100%)',
        zIndex: 0
      }} />

      {/* Story-style progress bars */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        gap: '6px',
        zIndex: 10
      }}>
        {projects.map((_, index) => (
          <div
            key={index}
            onClick={() => goToSlide(index)}
            style={{
              flex: 1,
              height: '3px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: '2px',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            <div style={{
              height: '100%',
              background: '#fff',
              borderRadius: '2px',
              width: index < currentSlide ? '100%' : 
                     index === currentSlide ? `${progress}%` : '0%',
              transition: index === currentSlide ? 'none' : 'width 0.3s ease'
            }} />
          </div>
        ))}
      </div>

      {/* Project info overlay */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: '30px',
        zIndex: 10,
        color: '#fff',
        maxWidth: '400px'
      }}>
        <p style={{ 
          fontSize: '0.85rem', 
          opacity: 0.8, 
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '2px'
        }}>
          Проект
        </p>
        <h2 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          marginBottom: '1rem',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          {projects[currentSlide].name}
        </h2>
        <p style={{ 
          fontSize: '0.95rem', 
          opacity: 0.9,
          lineHeight: 1.6,
          textShadow: '0 1px 5px rgba(0,0,0,0.3)'
        }}>
          {projects[currentSlide].description}
        </p>
      </div>

      {/* Phone-style gallery preview */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '30px',
        display: 'flex',
        gap: '12px',
        zIndex: 10
      }}>
        {projects.map((project, index) => (
          <div
            key={project.id}
            onClick={() => goToSlide(index)}
            style={{
              width: index === currentSlide ? '100px' : '80px',
              height: index === currentSlide ? '140px' : '110px',
              borderRadius: index === currentSlide ? '20px' : '16px',
              overflow: 'hidden',
              cursor: 'pointer',
              border: index === currentSlide ? '3px solid #fff' : '2px solid rgba(255,255,255,0.5)',
              boxShadow: index === currentSlide 
                ? '0 8px 32px rgba(0,0,0,0.4)' 
                : '0 4px 16px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease',
              position: 'relative',
              transform: index === currentSlide ? 'translateY(-10px)' : 'none'
            }}
          >
            <img 
              src={project.image} 
              alt={project.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '8px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: '600'
            }}>
              {project.name}
            </div>
          </div>
        ))}
      </div>

      {/* Auth card */}
      <div className="auth-card" style={{ zIndex: 5, position: 'relative' }}>
        {isRegister ? (
          <h2>Регистрация</h2>
        ) : (
          <img src="/LoginLogo.svg" alt="Логотип" className="login-logo" />
        )}
        
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Имя пользователя</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Пароль</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label>Роль</label>
                <select
                  name="role"
                  value={formData.role || ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">Выберите роль</option>
                  <option value="planner">Плановик</option>
                  <option value="foreman">Прораб</option>
                  <option value="subcontractor">Субподрядчик</option>
                </select>
              </div>

              <div className="form-group">
                <label>Название компании (опционально)</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName || ''}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : (isRegister ? 'Зарегистрироваться' : 'Войти')}
          </button>
        </form>

        <p className="text-center mt-3">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#667eea', 
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </p>
      </div>
    </div>
  );
}
