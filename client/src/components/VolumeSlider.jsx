import { useState, useRef, useEffect } from 'react';

export default function VolumeSlider({ assignment, onSubmit, onClose }) {
  const [volume, setVolume] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const maxVolume = parseFloat(assignment.assigned_volume);
  const alreadyCompleted = parseFloat(assignment.completed_so_far || 0);
  const remaining = maxVolume - alreadyCompleted;
  const percentage = (volume / remaining) * 100;

  // Блокируем скролл body при монтировании
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = rect.bottom - e.clientY;
    const height = rect.height;
    const percent = Math.max(0, Math.min(100, (y / height) * 100));
    const calculatedVolume = (percent / 100) * remaining;
    
    setVolume(Math.round(calculatedVolume * 100) / 100);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    
    e.preventDefault();
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const y = rect.bottom - touch.clientY;
    const height = rect.height;
    const percent = Math.max(0, Math.min(100, (y / height) * 100));
    const calculatedVolume = (percent / 100) * remaining;
    
    setVolume(Math.round(calculatedVolume * 100) / 100);
  };

  const handleSubmit = () => {
    if (volume <= 0) {
      alert('Укажите выполненный объем');
      return;
    }
    if (volume > remaining) {
      alert(`Превышен доступный объем. Осталось: ${remaining} ${assignment.unit}`);
      return;
    }
    onSubmit(volume);
  };

  return (
    <div 
      className="modal-overlay"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      style={{ 
        touchAction: 'none',
        overscrollBehavior: 'contain',
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      <div className="modal-content" style={{ 
        maxWidth: '420px',
        touchAction: 'none',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        padding: '1.5rem',
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Заголовок */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <div>
            <h3 style={{ 
              fontSize: '1.3rem', 
              fontWeight: '600', 
              margin: '0 0 0.25rem 0',
              color: '#1c1c1e'
            }}>
              {assignment.work_type}
            </h3>
            <p style={{ 
              fontSize: '0.85rem', 
              color: '#8e8e93', 
              margin: 0,
              fontWeight: '500'
            }}>
              {assignment.section} · {assignment.floor}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(142, 142, 147, 0.12)',
              color: '#8e8e93',
              fontSize: '1.2rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(142, 142, 147, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(142, 142, 147, 0.12)'}
          >
            ✕
          </button>
        </div>

        {/* Статистика */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '0.75rem', 
          marginBottom: '1.5rem' 
        }}>
          <div style={{
            background: 'rgba(0, 122, 255, 0.08)',
            borderRadius: '12px',
            padding: '0.75rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#8e8e93', fontWeight: '500', marginBottom: '0.25rem' }}>
              Назначено
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#007aff' }}>
              {maxVolume} <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{assignment.unit}</span>
            </div>
          </div>
          <div style={{
            background: 'rgba(52, 199, 89, 0.08)',
            borderRadius: '12px',
            padding: '0.75rem',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#8e8e93', fontWeight: '500', marginBottom: '0.25rem' }}>
              Выполнено
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#34c759' }}>
              {alreadyCompleted} <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{assignment.unit}</span>
            </div>
          </div>
        </div>

        {/* Основной слайдер */}
        <div style={{ 
          display: 'flex', 
          gap: '1.5rem', 
          alignItems: 'center', 
          marginBottom: '1.5rem',
          padding: '1rem 0'
        }}>
          {/* Трек слайдера */}
          <div style={{ flex: 1, position: 'relative' }}>
            <div 
              ref={containerRef}
              style={{
                position: 'relative',
                height: '280px',
                width: '100%',
                background: 'rgba(120, 120, 128, 0.12)',
                borderRadius: '16px',
                cursor: 'ns-resize',
                userSelect: 'none',
                overflow: 'hidden',
                touchAction: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
            >
              {/* Градиентное заполнение */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${percentage}%`,
                background: 'linear-gradient(to top, #007aff, #5ac8fa)',
                transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: '16px',
                boxShadow: '0 -2px 12px rgba(0, 122, 255, 0.3)'
              }}>
                {/* Блик сверху */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '10%',
                  right: '10%',
                  height: '40%',
                  background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent)',
                  borderRadius: '16px',
                  pointerEvents: 'none'
                }}></div>
              </div>

              {/* Процентные метки */}
              {[25, 50, 75].map(mark => (
                <div key={mark} style={{
                  position: 'absolute',
                  right: '110%',
                  bottom: `${mark}%`,
                  transform: 'translateY(50%)',
                  fontSize: '0.7rem',
                  color: '#8e8e93',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}>
                  {Math.round((mark / 100) * remaining)} {assignment.unit}
                </div>
              ))}
            </div>
          </div>

          {/* Панель значения */}
          <div style={{ 
            width: '100px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '100%',
              background: 'linear-gradient(135deg, #007aff, #5ac8fa)',
              borderRadius: '16px',
              padding: '1.25rem 0.75rem',
              textAlign: 'center',
              boxShadow: '0 8px 24px rgba(0, 122, 255, 0.25)'
            }}>
              <div style={{ 
                fontSize: '0.7rem', 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontWeight: '600',
                marginBottom: '0.25rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Сегодня
              </div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                color: '#fff',
                lineHeight: 1,
                marginBottom: '0.25rem'
              }}>
                {volume}
              </div>
              <div style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: '500'
              }}>
                {assignment.unit}
              </div>
            </div>
            
            <div style={{
              width: '100%',
              background: 'rgba(120, 120, 128, 0.12)',
              borderRadius: '12px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '1.5rem', 
                fontWeight: '700', 
                color: '#007aff'
              }}>
                {Math.round(percentage)}%
              </div>
              <div style={{ 
                fontSize: '0.65rem', 
                color: '#8e8e93',
                fontWeight: '500',
                marginTop: '0.15rem'
              }}>
                от остатка
              </div>
            </div>
          </div>
        </div>

        {/* Подсказка */}
        <div style={{
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#8e8e93',
          marginBottom: '1rem',
          fontWeight: '500'
        }}>
          Двигайте полоску для выбора объема
        </div>

        {/* Кнопки */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.9rem',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(120, 120, 128, 0.12)',
              color: '#007aff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(120, 120, 128, 0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(120, 120, 128, 0.12)'}
          >
            Отмена
          </button>
          <button 
            onClick={handleSubmit}
            disabled={volume <= 0}
            style={{
              flex: 2,
              padding: '0.9rem',
              borderRadius: '12px',
              border: 'none',
              background: volume <= 0 ? 'rgba(120, 120, 128, 0.12)' : 'linear-gradient(135deg, #007aff, #5ac8fa)',
              color: volume <= 0 ? '#8e8e93' : '#fff',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: volume <= 0 ? 'not-allowed' : 'pointer',
              boxShadow: volume <= 0 ? 'none' : '0 4px 16px rgba(0, 122, 255, 0.3)',
              transition: 'all 0.2s',
              opacity: volume <= 0 ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (volume > 0) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 122, 255, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (volume > 0) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(0, 122, 255, 0.3)';
              }
            }}
          >
            Сохранить {volume > 0 && `(${volume} ${assignment.unit})`}
          </button>
        </div>
      </div>
    </div>
  );
}
