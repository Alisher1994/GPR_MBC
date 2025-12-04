export default function KanbanBoard({ pendingApprovals, sentAssignments, rejectedWorks, onApprove, onReject }) {
  const assigned = sentAssignments.filter(item => item.status === 'assigned');
  const inProgress = sentAssignments.filter(item => item.status === 'in_progress');
  const confirmed = sentAssignments.filter(item => item.status === 'completed');

  const sections = [
    {
      id: 'assigned',
      title: 'Распределено',
      subtitle: 'Передано субподрядчикам',
      color: '#5ac8fa',
      icon: '📦',
      type: 'assignment',
      items: assigned
    },
    {
      id: 'in-progress',
      title: 'В процессе',
      subtitle: 'Субподрядчики работают',
      color: '#ffcc00',
      icon: '⚙️',
      type: 'assignment',
      items: inProgress
    },
    {
      id: 'checking',
      title: 'Проверка',
      subtitle: 'Ожидают подтверждения',
      color: '#ff9500',
      icon: '📥',
      type: 'pending',
      items: pendingApprovals
    },
    {
      id: 'confirmed',
      title: 'Подтверждение',
      subtitle: 'Одобрено и передано',
      color: '#34c759',
      icon: '📤',
      type: 'assignment',
      items: confirmed
    },
    {
      id: 'rejected',
      title: 'Отказ',
      subtitle: 'Требует повторной отправки',
      color: '#ff3b30',
      icon: '⚠️',
      type: 'rejected',
      items: rejectedWorks
    }
  ];

  const renderEmptyState = () => (
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
  );

  const renderProgress = (item) => {
    const assignedVolume = parseFloat(item.assigned_volume) || 0;
    const completedVolume = parseFloat(item.completed_volume) || 0;
    const percent = assignedVolume > 0 ? Math.min(100, Math.round((completedVolume / assignedVolume) * 100)) : 0;

    return (
      <div style={{
        background: 'rgba(120, 120, 128, 0.08)',
        borderRadius: '8px',
        padding: '0.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ color: '#8e8e93' }}>Прогресс</span>
          <span style={{ fontWeight: '600', color: '#007aff' }}>{percent}%</span>
        </div>
        <div style={{ height: '4px', background: 'rgba(120, 120, 128, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #007aff, #5ac8fa)'
          }}></div>
        </div>
      </div>
    );
  };

  const renderAssignmentItem = (item, accent) => (
    <div
      key={item.id}
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid rgba(120, 120, 128, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      <div>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1c1c1e' }}>{item.work_type}</h4>
        <div style={{ fontSize: '0.8rem', color: '#007aff', fontWeight: '600' }}>
          {item.object_name} / {item.section_name}
        </div>
        {item.floor && (
          <div style={{ fontSize: '0.8rem', color: '#8e8e93' }}>{item.floor}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8e8e93' }}>Субподрядчик:</span>
          <span style={{ fontWeight: '600', color: '#1c1c1e' }}>{item.subcontractor_name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8e8e93' }}>Назначено:</span>
          <span style={{ fontWeight: '600', color: accent }}>{item.assigned_volume} {item.unit}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8e8e93' }}>Выполнено:</span>
          <span style={{ fontWeight: '600', color: '#34c759' }}>{item.completed_volume || 0} {item.unit}</span>
        </div>
      </div>

      {renderProgress(item)}
    </div>
  );

  const renderPendingItem = (item) => (
    <div
      key={item.id}
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid rgba(255, 149, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      <div>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1c1c1e' }}>{item.work_type}</h4>
        <div style={{ fontSize: '0.8rem', color: '#007aff', fontWeight: '600' }}>
          {item.object_name} / {item.section_name}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8e8e93' }}>Субподрядчик:</span>
          <span style={{ fontWeight: '600', color: '#1c1c1e' }}>{item.subcontractor_name}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8e8e93' }}>Выполнено:</span>
          <span style={{ fontWeight: '600', color: '#34c759' }}>{item.completed_volume} {item.unit}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8e8e93' }}>Дата:</span>
          <span style={{ fontWeight: '500' }}>{new Date(item.work_date).toLocaleDateString('ru-RU')}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => onApprove(item.id)}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #34c759, #30d158)',
            color: '#fff',
            fontWeight: '600',
            cursor: 'pointer'
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
            border: '1px solid rgba(255, 59, 48, 0.4)',
            background: 'rgba(255, 59, 48, 0.08)',
            color: '#ff3b30',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          ✗ Отклонить
        </button>
      </div>
    </div>
  );

  const renderRejectedItem = (item) => (
    <div
      key={item.id}
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid rgba(255, 59, 48, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}
    >
      <div>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1c1c1e' }}>{item.work_type}</h4>
        <div style={{ fontSize: '0.8rem', color: '#007aff', fontWeight: '600' }}>
          {item.object_name} / {item.section_name}
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: '#8e8e93' }}>
        {item.notes || 'Причина не указана'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span>Выполнено:</span>
        <span style={{ fontWeight: '600', color: '#ff3b30' }}>{item.completed_volume} {item.unit}</span>
      </div>
    </div>
  );

  const renderItems = (section) => {
    if (section.items.length === 0) {
      return renderEmptyState();
    }

    if (section.type === 'pending') {
      return section.items.map(renderPendingItem);
    }

    if (section.type === 'rejected') {
      return section.items.map(renderRejectedItem);
    }

    const accent = section.id === 'assigned' ? '#5ac8fa' : section.id === 'in-progress' ? '#ff9500' : '#34c759';
    return section.items.map((item) => renderAssignmentItem(item, accent));
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '1rem',
      padding: '1rem 0',
      width: '100%'
    }}>
      {sections.map((section) => (
        <div
          key={section.id}
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '1.25rem',
            minHeight: '320px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: `3px solid ${section.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{section.icon}</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{section.title}</h3>
              <span style={{
                marginLeft: 'auto',
                background: section.color,
                color: '#fff',
                borderRadius: '12px',
                padding: '0.2rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}>
                {section.items.length}
              </span>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#8e8e93' }}>{section.subtitle}</p>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
            {renderItems(section)}
          </div>
        </div>
      ))}
    </div>
  );
}
