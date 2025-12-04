import { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import PlannerPageNew from './pages/PlannerPageNew';
import ForemanPageNew from './pages/ForemanPageNew';
import SubcontractorPage from './pages/SubcontractorPage';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Проверяем, есть ли сохраненный пользователь
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  // Если не авторизован, показываем форму входа
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Определяем, какую страницу показывать в зависимости от роли
  const renderRolePage = () => {
    switch (user.role) {
      case 'planner':
        return <PlannerPageNew user={user} />;
      case 'foreman':
        return <ForemanPageNew user={user} />;
      case 'subcontractor':
        return <SubcontractorPage user={user} />;
      default:
        return <div>Неизвестная роль пользователя</div>;
    }
  };

  const getRoleTitle = () => {
    const roles = {
      planner: 'Плановик',
      foreman: 'Прораб',
      subcontractor: 'Субподрядчик'
    };
    return roles[user.role] || user.role;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="brand-mark">
            <img src="/Logo.svg" alt="Murad Buildings" />
            <div>
              <div className="brand-title">Murad Buildings</div>
              <div className="brand-subtitle">Construction Control</div>
            </div>
          </div>
          <div className="user-info">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600' }}>{user.username}</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                {getRoleTitle()}
                {user.companyName && <> • {user.companyName}</>}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="btn btn-small"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        {renderRolePage()}
      </main>

      {/* Footer */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '1rem', 
        color: '#999',
        fontSize: '0.9rem'
      }}>
        © 2025 Система учета строительных работ - MVP
      </footer>
    </div>
  );
}

export default App;
