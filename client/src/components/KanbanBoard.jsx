import { useState } from 'react';

export default function KanbanBoard({ pendingApprovals, sentAssignments, onApprove, onReject }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedFrom, setDraggedFrom] = useState(null);

  const handleDragStart = (item, column) => {
    setDraggedItem(item);
    setDraggedFrom(column);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (column) => {
    if (!draggedItem || draggedFrom === column) {
      setDraggedItem(null);
      setDraggedFrom(null);
      return;
    }

    // Логика перетаскивания из Входящих в Отправленные (одобрение)
    if (draggedFrom === 'incoming' && column === 'sent') {
      onApprove(draggedItem.id);
    }

    setDraggedItem(null);
    setDraggedFrom(null);
  };

  const columns = [
    {
      id: 'incoming',
      title: 'Входящие',
      subtitle: 'На проверке',
      items: pendingApprovals,
      color: '#ff9500',
      icon: '📥'
    },
    {
      id: 'sent',
      title: 'Отправленные',
      subtitle: 'Назначено субподрядчикам',
      items: sentAssignments,
      color: '#007aff',
      icon: '📤'
    }
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
      gap: '1.5rem',
      padding: '1rem 0'
    }}>
      {columns.map(column => (
        <div
          key={column.id}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(column.id)}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '1.25rem',
            minHeight: '400px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Заголовок колонки */}
          <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: `3px solid ${column.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{column.icon}</span>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600', color: '#1c1c1e' }}>
                {column.title}
              </h3>
              <span style={{
                marginLeft: 'auto',
                background: column.color,
                color: '#fff',
                borderRadius: '12px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.85rem',
                fontWeight: '600'
              }}>
                {column.items.length}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#8e8e93', fontWeight: '500' }}>
              {column.subtitle}
            </p>
          </div>

          {/* Список карточек */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {column.items.length === 0 ? (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8e8e93',
                textAlign: 'center',
                padding: '2rem 1rem'
              }}>
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>📋</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>Пусто</p>
                </div>
              </div>
            ) : (
              column.items.map(item => (
                <div
                  key={item.id}
                  draggable={column.id === 'incoming'}
                  onDragStart={() => handleDragStart(item, column.id)}
                  style={{
                    background: draggedItem?.id === item.id ? 'rgba(0, 122, 255, 0.08)' : '#fff',
                    borderRadius: '12px',
                    padding: '1rem',
                    border: '1px solid rgba(120, 120, 128, 0.2)',
                    cursor: column.id === 'incoming' ? 'grab' : 'default',
                    transition: 'all 0.2s',
                    boxShadow: draggedItem?.id === item.id ? '0 4px 12px rgba(0, 122, 255, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
                    transform: draggedItem?.id === item.id ? 'scale(1.02)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    if (column.id === 'incoming') {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (draggedItem?.id !== item.id) {
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {/* Заголовок работы */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <h4 style={{ 
                      margin: '0 0 0.25rem 0', 
                      fontSize: '1rem', 
                      fontWeight: '600',
                      color: '#1c1c1e'
                    }}>
                      {item.work_type}
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: '#8e8e93', fontWeight: '500' }}>
                      {item.block} · {item.floor}
                    </div>
                  </div>

                  {/* Информация */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    {column.id === 'incoming' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#8e8e93' }}>Субподрядчик:</span>
                          <span style={{ fontWeight: '600', color: '#1c1c1e' }}>
                            {item.subcontractor_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#8e8e93' }}>Выполнено:</span>
                          <span style={{ 
                            fontWeight: '700', 
                            color: '#34c759',
                            fontSize: '0.95rem'
                          }}>
                            {item.completed_volume} {item.unit}
                          </span>
                        </div>
                        {item.work_date && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{ color: '#8e8e93' }}>Дата:</span>
                            <span style={{ fontWeight: '500', color: '#1c1c1e' }}>
                              {new Date(item.work_date).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#8e8e93' }}>Субподрядчик:</span>
                          <span style={{ fontWeight: '600', color: '#1c1c1e' }}>
                            {item.subcontractor_name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#8e8e93' }}>Назначено:</span>
                          <span style={{ fontWeight: '600', color: '#007aff' }}>
                            {item.assigned_volume} {item.unit}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: '#8e8e93' }}>Выполнено:</span>
                          <span style={{ fontWeight: '600', color: '#34c759' }}>
                            {item.completed_volume || 0} {item.unit}
                          </span>
                        </div>
                        <div style={{ 
                          background: 'rgba(120, 120, 128, 0.08)',
                          borderRadius: '6px',
                          padding: '0.4rem',
                          marginTop: '0.25rem'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            fontSize: '0.75rem',
                            marginBottom: '0.25rem'
                          }}>
                            <span style={{ color: '#8e8e93', fontWeight: '500' }}>Прогресс</span>
                            <span style={{ fontWeight: '600', color: '#007aff' }}>
                              {Math.round(((item.completed_volume || 0) / item.assigned_volume) * 100)}%
                            </span>
                          </div>
                          <div style={{ 
                            height: '4px', 
                            background: 'rgba(120, 120, 128, 0.2)',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, ((item.completed_volume || 0) / item.assigned_volume) * 100)}%`,
                              background: 'linear-gradient(90deg, #007aff, #5ac8fa)',
                              borderRadius: '2px',
                              transition: 'width 0.3s'
                            }}></div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Кнопки для входящих */}
                  {column.id === 'incoming' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button
                        onClick={() => onApprove(item.id)}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #34c759, #30d158)',
                          color: '#fff',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(52, 199, 89, 0.3)',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(52, 199, 89, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 8px rgba(52, 199, 89, 0.3)';
                        }}
                      >
                        ✓ Одобрить
                      </button>
                      <button
                        onClick={() => onReject(item.id)}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'rgba(255, 59, 48, 0.1)',
                          color: '#ff3b30',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(255, 59, 48, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(255, 59, 48, 0.1)';
                        }}
                      >
                        ✗ Отклонить
                      </button>
                    </div>
                  )}

                  {/* Статус для отправленных */}
                  {column.id === 'sent' && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textAlign: 'center',
                      background: item.status === 'pending' ? 'rgba(255, 149, 0, 0.1)' : 
                                 item.status === 'in_progress' ? 'rgba(0, 122, 255, 0.1)' : 
                                 'rgba(52, 199, 89, 0.1)',
                      color: item.status === 'pending' ? '#ff9500' : 
                             item.status === 'in_progress' ? '#007aff' : 
                             '#34c759'
                    }}>
                      {item.status === 'pending' ? 'Ожидает' : 
                       item.status === 'in_progress' ? 'В работе' : 
                       'Завершено'}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Подсказка для перетаскивания */}
          {column.id === 'incoming' && column.items.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(0, 122, 255, 0.08)',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: '#007aff',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              💡 Перетащите карточку вправо для одобрения
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
