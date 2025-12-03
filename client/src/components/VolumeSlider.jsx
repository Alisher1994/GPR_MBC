import { useState, useRef } from 'react';

export default function VolumeSlider({ assignment, onSubmit, onClose }) {
  const [volume, setVolume] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const maxVolume = parseFloat(assignment.assigned_volume);
  const alreadyCompleted = parseFloat(assignment.completed_so_far || 0);
  const remaining = maxVolume - alreadyCompleted;
  const percentage = (volume / remaining) * 100;

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
    >
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Отметить выполнение</h3>
          <button className="btn btn-small btn-secondary" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p><strong>{assignment.work_type}</strong></p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            {assignment.block} / {assignment.floor}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <small style={{ color: '#666' }}>Назначено</small>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0.25rem 0' }}>
              {maxVolume} {assignment.unit}
            </p>
          </div>
          <div>
            <small style={{ color: '#666' }}>Выполнено ранее</small>
            <p style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0.25rem 0', color: '#28a745' }}>
              {alreadyCompleted} {assignment.unit}
            </p>
          </div>
        </div>

        {/* Контейнер-банка */}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <div 
              ref={containerRef}
              style={{
                position: 'relative',
                height: '300px',
                width: '100%',
                border: '3px solid #333',
                borderRadius: '10px',
                background: '#f5f5f5',
                cursor: 'ns-resize',
                userSelect: 'none',
                overflow: 'hidden'
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={() => setIsDragging(true)}
            >
              {/* Заполнение */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${percentage}%`,
                background: 'linear-gradient(to top, #28a745, #5cb85c)',
                transition: isDragging ? 'none' : 'height 0.3s ease',
                borderRadius: '0 0 7px 7px'
              }}>
                {/* Волны */}
                <div style={{
                  position: 'absolute',
                  top: '-5px',
                  left: 0,
                  right: 0,
                  height: '10px',
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: '50%'
                }}></div>
              </div>

              {/* Метки на стенках */}
              {[25, 50, 75, 100].map(mark => (
                <div key={mark} style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${mark}%`,
                  height: '1px',
                  background: '#999',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{
                    position: 'absolute',
                    right: '105%',
                    fontSize: '0.75rem',
                    color: '#666'
                  }}>
                    {Math.round((mark / 100) * remaining)}
                  </span>
                </div>
              ))}

              {/* Ползунок */}
              <div style={{
                position: 'absolute',
                bottom: `${percentage}%`,
                left: '-15px',
                right: '-15px',
                height: '30px',
                transform: 'translateY(50%)',
                pointerEvents: 'none'
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#007bff',
                  border: '3px solid #fff',
                  borderRadius: '15px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}>
                  {volume} {assignment.unit}
                </div>
              </div>
            </div>
            <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
              Двигайте ползунок вверх/вниз
            </p>
          </div>

          <div style={{ width: '120px' }}>
            <div style={{ 
              padding: '1rem', 
              background: '#e3f2fd', 
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <small style={{ color: '#666' }}>Сегодня</small>
              <h2 style={{ margin: '0.5rem 0', color: '#007bff' }}>{volume}</h2>
              <small style={{ color: '#666' }}>{assignment.unit}</small>
              <div style={{ 
                marginTop: '0.5rem', 
                paddingTop: '0.5rem', 
                borderTop: '1px solid #bbb',
                fontSize: '0.85rem'
              }}>
                {Math.round((volume / remaining) * 100)}%
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Отмена
          </button>
          <button 
            className="btn btn-success" 
            onClick={handleSubmit}
            disabled={volume <= 0}
            style={{ flex: 2 }}
          >
            💾 Сохранить ({volume} {assignment.unit})
          </button>
        </div>
      </div>
    </div>
  );
}
