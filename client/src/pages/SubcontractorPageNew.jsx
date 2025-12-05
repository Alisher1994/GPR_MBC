import { useState, useEffect } from 'react';
import { subcontractor } from '../api';
import TabIcon from '../components/TabIcon';

const subcontractorTabs = [
  { id: 'assignments', label: 'Наряды', icon: 'list' },
  { id: 'issues', label: 'Список замечаний', icon: 'clipboard' }
];

export default function SubcontractorPageNew({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('assignments');
  const [loading, setLoading] = useState(false);
  
  // Для модалки фиксации объема
  const [selectedWork, setSelectedWork] = useState(null);
  const [volumeToSubmit, setVolumeToSubmit] = useState('');
  const [submittingWork, setSubmittingWork] = useState(false);
  
  // Для inline редактирования
  const [editingVolumeId, setEditingVolumeId] = useState(null);
  const [editedVolume, setEditedVolume] = useState('');
  
  // Для сворачивания/раскрытия
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});

  useEffect(() => {
    loadAssignments();
    loadStatistics();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const response = await subcontractor.getMyAssignments(user.id);
      setAssignments(response.data);
    } catch (error) {
      console.error('Ошибка загрузки нарядов:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await subcontractor.getStatistics(user.id);
      setStatistics(response.data);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const handleSubmitWork = async () => {
    if (!volumeToSubmit || parseFloat(volumeToSubmit) <= 0) {
      alert('Введите корректный объем');
      return;
    }

    const workDate = new Date().toISOString().split('T')[0];
    setSubmittingWork(true);

    try {
      await subcontractor.submitWork(
        selectedWork.id,
        parseFloat(volumeToSubmit),
        workDate,
        null,
        user.id
      );
      alert('Выполненный объем отправлен на проверку!');
      setSelectedWork(null);
      setVolumeToSubmit('');
      loadAssignments();
      loadStatistics();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmittingWork(false);
    }
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleFloor = (floorKey) => {
    setExpandedFloors(prev => ({ ...prev, [floorKey]: !prev[floorKey] }));
  };

  const openVolumeModal = (assignment) => {
    const remaining = assignment.assigned_volume - parseFloat(assignment.completed_so_far || 0);
    setSelectedWork(assignment);
    setVolumeToSubmit(remaining.toString());
  };

  // Группировка по секциям и этажам
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const sectionKey = assignment.section_name || 'Без секции';
    const floorKey = assignment.floor || 'Без этажа';
    
    if (!acc[sectionKey]) {
      acc[sectionKey] = {};
    }
    if (!acc[sectionKey][floorKey]) {
      acc[sectionKey][floorKey] = [];
    }
    acc[sectionKey][floorKey].push(assignment);
    
    return acc;
  }, {});

  const getStatusColor = (status) => {
    const colors = {
      'assigned': '#007aff',
      'in_progress': '#ff9500',
      'submitted': '#ffcc00',
      'approved': '#34c759',
      'rejected': '#ff3b30'
    };
    return colors[status] || '#8e8e93';
  };

  const getStatusText = (status) => {
    const texts = {
      'assigned': 'Назначено',
      'in_progress': 'В работе',
      'submitted': 'На проверке',
      'approved': 'Одобрено',
      'rejected': 'Отклонено'
    };
    return texts[status] || status;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f7', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem' }}>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
            Субподрядчик
          </h1>

          {/* Статистика */}
          {statistics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#007aff' }}>{statistics.total_assignments}</div>
                <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>Всего</div>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ff9500' }}>{statistics.pending_approval}</div>
                <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>Проверка</div>
              </div>
              <div style={{ background: '#f9f9f9', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#34c759' }}>{statistics.approved_works}</div>
                <div style={{ fontSize: '0.75rem', color: '#8e8e93', marginTop: '0.25rem' }}>Одобрено</div>
              </div>
            </div>
          )}

          {/* Табы */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {subcontractorTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: activeTab === tab.id ? '#007aff' : '#f0f0f0',
                  color: activeTab === tab.id ? '#fff' : '#1c1c1e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}
              >
                <TabIcon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Контент */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 1rem 1rem' }}>
        {activeTab === 'assignments' && (
          loading ? (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: '#8e8e93' }}>
              Загрузка...
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#1c1c1e' }}>Нет нарядов</h3>
              <p style={{ color: '#8e8e93', marginTop: '0.5rem' }}>Прораб пока не назначил вам работы</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(groupedAssignments).map(([sectionName, floors]) => {
                const sectionKey = sectionName;
                const isSectionExpanded = expandedSections[sectionKey] !== false;

                return (
                  <div key={sectionKey}>
                    {/* Заголовок секции */}
                    <div
                      onClick={() => toggleSection(sectionKey)}
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: '600',
                        fontSize: '1rem',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                      }}
                    >
                      <span>📁 {sectionName}</span>
                      {isSectionExpanded ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                        </svg>
                      )}
                    </div>

                    {/* Этажи внутри секции */}
                    {isSectionExpanded && (
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Object.entries(floors).map(([floorName, works]) => {
                          const floorKey = `${sectionKey}-${floorName}`;
                          const isFloorExpanded = expandedFloors[floorKey] !== false;

                          return (
                            <div key={floorKey} style={{ marginLeft: '1rem' }}>
                              {/* Заголовок этажа */}
                              <div
                                onClick={() => toggleFloor(floorKey)}
                                style={{
                                  background: '#f9f9f9',
                                  borderRadius: '10px',
                                  padding: '0.75rem 1rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontWeight: '600',
                                  fontSize: '0.9rem',
                                  color: '#1c1c1e'
                                }}
                              >
                                <span>🏢 {floorName}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#8e8e93' }}>
                                  {works.length} работ
                                  {isFloorExpanded ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                                    </svg>
                                  )}
                                </span>
                              </div>

                              {/* Карточки работ */}
                              {isFloorExpanded && (
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {works.map(work => {
                                    const remaining = work.assigned_volume - parseFloat(work.completed_so_far || 0);
                                    const canSubmit = remaining > 0 && ['assigned', 'in_progress'].includes(work.status);
                                    const progress = work.assigned_volume > 0 ? (parseFloat(work.completed_so_far || 0) / work.assigned_volume * 100) : 0;

                                    return (
                                      <div
                                        key={work.id}
                                        onClick={() => canSubmit && openVolumeModal(work)}
                                        style={{
                                          background: '#fff',
                                          borderRadius: '12px',
                                          padding: '1rem',
                                          cursor: canSubmit ? 'pointer' : 'default',
                                          border: `2px solid ${canSubmit ? getStatusColor(work.status) : '#e5e5ea'}`,
                                          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                          transition: 'all 0.2s ease'
                                        }}
                                      >
                                        {/* Название работы */}
                                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: '600', color: '#1c1c1e' }}>
                                          {work.work_type}
                                        </h4>

                                        {/* Информация */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#8e8e93' }}>Период:</span>
                                            <span style={{ fontWeight: '500' }}>
                                              {new Date(work.start_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} - {new Date(work.end_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#8e8e93' }}>Назначено:</span>
                                            <span style={{ fontWeight: '600', color: '#007aff' }}>{work.assigned_volume} {work.unit}</span>
                                          </div>

                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#8e8e93' }}>Выполнено:</span>
                                            <span
                                              onClick={(e) => {
                                                if (canSubmit) {
                                                  e.stopPropagation();
                                                  setEditingVolumeId(work.id);
                                                  setEditedVolume(work.completed_so_far || '0');
                                                }
                                              }}
                                              style={{
                                                fontWeight: '600',
                                                color: '#34c759',
                                                cursor: canSubmit ? 'pointer' : 'default',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '6px',
                                                background: editingVolumeId === work.id ? '#f0f0f0' : 'transparent'
                                              }}
                                            >
                                              {editingVolumeId === work.id ? (
                                                <input
                                                  type="number"
                                                  value={editedVolume}
                                                  onChange={(e) => setEditedVolume(e.target.value)}
                                                  onBlur={() => {
                                                    setEditingVolumeId(null);
                                                    // Здесь можно добавить сохранение
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  autoFocus
                                                  style={{
                                                    width: '60px',
                                                    border: '1px solid #007aff',
                                                    borderRadius: '4px',
                                                    padding: '0.15rem 0.3rem',
                                                    fontSize: '0.85rem',
                                                    textAlign: 'right'
                                                  }}
                                                />
                                              ) : (
                                                `${work.completed_so_far || 0} ${work.unit}`
                                              )}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#8e8e93' }}>Остаток:</span>
                                            <span style={{ fontWeight: '600', color: remaining > 0 ? '#ff3b30' : '#34c759' }}>
                                              {remaining.toFixed(2)} {work.unit}
                                            </span>
                                          </div>

                                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#8e8e93' }}>Дневная норма:</span>
                                            <span style={{ fontWeight: '500' }}>{work.daily_target} {work.unit}/день</span>
                                          </div>
                                        </div>

                                        {/* Прогресс-бар */}
                                        <div style={{ marginTop: '0.75rem' }}>
                                          <div style={{
                                            height: '6px',
                                            background: '#f0f0f0',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                          }}>
                                            <div style={{
                                              height: '100%',
                                              width: `${Math.min(100, progress)}%`,
                                              background: progress >= 100 ? '#34c759' : 'linear-gradient(90deg, #007aff, #5ac8fa)',
                                              transition: 'width 0.3s ease'
                                            }} />
                                          </div>
                                          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#8e8e93', textAlign: 'right' }}>
                                            {progress.toFixed(0)}%
                                          </div>
                                        </div>

                                        {/* Статус */}
                                        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span
                                            style={{
                                              padding: '0.35rem 0.75rem',
                                              borderRadius: '8px',
                                              fontSize: '0.8rem',
                                              fontWeight: '600',
                                              background: `${getStatusColor(work.status)}15`,
                                              color: getStatusColor(work.status)
                                            }}
                                          >
                                            {getStatusText(work.status)}
                                          </span>
                                          {canSubmit && (
                                            <div style={{ fontSize: '0.8rem', color: '#007aff', fontWeight: '500' }}>
                                              Нажмите для фиксации →
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'issues' && (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
            <h3 style={{ margin: 0, color: '#1c1c1e' }}>Список замечаний недоступен</h3>
            <p style={{ color: '#8e8e93', marginTop: '0.5rem' }}>Раздел появится в ближайшем обновлении.</p>
          </div>
        )}
      </div>

      {/* Модалка фиксации объема */}
      {selectedWork && (
        <div
          onClick={() => setSelectedWork(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: '600' }}>
              Фиксация выполненного объема
            </h3>

            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '12px' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{selectedWork.work_type}</div>
              <div style={{ fontSize: '0.85rem', color: '#8e8e93' }}>
                {selectedWork.floor} • {selectedWork.section_name}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500', color: '#1c1c1e' }}>
                Выполненный объем ({selectedWork.unit})
              </label>
              <input
                type="number"
                step="0.01"
                value={volumeToSubmit}
                onChange={(e) => setVolumeToSubmit(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e5ea',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  textAlign: 'center'
                }}
                placeholder="0.00"
              />
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#8e8e93', textAlign: 'center' }}>
                Максимум: {(selectedWork.assigned_volume - parseFloat(selectedWork.completed_so_far || 0)).toFixed(2)} {selectedWork.unit}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedWork(null)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid #e5e5ea',
                  background: '#fff',
                  color: '#1c1c1e',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmitWork}
                disabled={submittingWork}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: submittingWork ? '#8e8e93' : 'linear-gradient(135deg, #007aff, #5ac8fa)',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: submittingWork ? 'not-allowed' : 'pointer'
                }}
              >
                {submittingWork ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
