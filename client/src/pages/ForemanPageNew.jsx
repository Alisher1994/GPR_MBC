import { useState, useEffect } from 'react';
import { foreman, planner, auth } from '../api';
import KanbanBoard from '../components/KanbanBoard';

export default function ForemanPageNew({ user }) {
  const [objects, setObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [works, setWorks] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [sentAssignments, setSentAssignments] = useState([]);
  const [rejectedWorks, setRejectedWorks] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [activeTab, setActiveTab] = useState('works');
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [hasUpdates, setHasUpdates] = useState(false);

  useEffect(() => {
    loadObjects();
    loadSubcontractors();
    loadPendingApprovals();
    loadSentAssignments();
    loadRejectedWorks();
  }, []);

  useEffect(() => {
    if (selectedObjectId) {
      loadSections(selectedObjectId);
    }
  }, [selectedObjectId]);

  useEffect(() => {
    if (selectedSectionId) {
      loadWorks();
      checkForUpdates();
    }
  }, [selectedSectionId]);

  const loadObjects = async () => {
    try {
      const response = await foreman.getObjects();
      setObjects(response.data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    }
  };

  const loadSections = async (objectId) => {
    try {
      const response = await foreman.getObjectSections(objectId);
      setSections(response.data);
    } catch (error) {
      console.error('Ошибка загрузки секций:', error);
    }
  };

  const loadWorks = async () => {
    if (!selectedSectionId) return;
    
    setLoading(true);
    try {
      const response = await foreman.getSectionWorks(selectedSectionId);
      setWorks(response.data);
      setLastUpdate(new Date());
      setHasUpdates(false);
    } catch (error) {
      console.error('Ошибка загрузки работ:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    if (!selectedSectionId || !lastUpdate) return;

    try {
      const response = await foreman.checkSectionUpdates(selectedSectionId, lastUpdate.toISOString());
      setHasUpdates(response.data.hasUpdates);
    } catch (error) {
      console.error('Ошибка проверки обновлений:', error);
    }
  };

  const loadSubcontractors = async () => {
    try {
      const response = await auth.getUsers('subcontractor');
      setSubcontractors(response.data);
    } catch (error) {
      console.error('Ошибка загрузки субподрядчиков:', error);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const response = await foreman.getPendingApprovals(user.id);
      setPendingApprovals(response.data);
    } catch (error) {
      console.error('Ошибка загрузки ожидающих подтверждения:', error);
    }
  };

  const loadSentAssignments = async () => {
    try {
      const response = await foreman.getSentAssignments(user.id);
      setSentAssignments(response.data);
    } catch (error) {
      console.error('Ошибка загрузки отправленных нарядов:', error);
    }
  };

  const loadRejectedWorks = async () => {
    try {
      const response = await foreman.getRejectedWorks(user.id);
      setRejectedWorks(response.data);
    } catch (error) {
      console.error('Ошибка загрузки отклоненных работ:', error);
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const toggleFloor = (key) => {
    setExpandedFloors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groupWorksByStructure = (works) => {
    const grouped = {};
    works.forEach(work => {
      const stage = work.stage || 'Без очереди';
      const section = work.section || 'Без секции';
      const floor = work.floor || 'Без этажа';
      
      if (!grouped[stage]) grouped[stage] = {};
      if (!grouped[stage][section]) grouped[stage][section] = {};
      if (!grouped[stage][section][floor]) grouped[stage][section][floor] = [];
      
      grouped[stage][section][floor].push(work);
    });
    return grouped;
  };

  const handleAssignWork = async (workItemId, workInfo) => {
    const selectedSubId = prompt(
      `Выберите субподрядчика (введите номер):\n\n${subcontractors.map((s, i) => `${i + 1}. ${s.username}${s.company_name ? ' (' + s.company_name + ')' : ''}`).join('\n')}`
    );
    
    if (!selectedSubId) return;
    
    const subIndex = parseInt(selectedSubId) - 1;
    if (subIndex < 0 || subIndex >= subcontractors.length) {
      alert('Неверный номер субподрядчика!');
      return;
    }

    const volume = prompt(`Введите объем работ для ${subcontractors[subIndex].username}:`);
    if (!volume) return;

    const assignments = [{
      subcontractorId: subcontractors[subIndex].id,
      assignedVolume: parseFloat(volume)
    }];

    try {
      await foreman.assignWork(workItemId, assignments, user.id);
      alert('Работа успешно распределена!');
      loadWorks();
      loadSentAssignments();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleApproveWork = async (completedWorkId, approve) => {
    const notes = approve ? null : prompt('Причина отклонения:');
    
    try {
      await foreman.approveWork(
        completedWorkId,
        user.id,
        approve ? 'approved' : 'rejected',
        null,
        notes
      );
      alert(approve ? 'Работа одобрена!' : 'Работа отклонена');
      loadPendingApprovals();
      loadSentAssignments();
      loadRejectedWorks();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const getSelectedObjectName = () => {
    const obj = objects.find(o => o.id === parseInt(selectedObjectId));
    return obj?.name || '';
  };

  const getSelectedSectionName = () => {
    const sec = sections.find(s => s.id === parseInt(selectedSectionId));
    return sec ? `Секция ${sec.section_number}` : '';
  };

  return (
    <div>
      <h2 className="mb-3">Панель прораба</h2>

      {/* Табы */}
      <div className="card" style={{ position: 'sticky', top: '70px', zIndex: 50, background: '#fff', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e5ea' }}>
          <button
            onClick={() => setActiveTab('works')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'works' ? '#007aff' : '#8e8e93',
              borderBottom: activeTab === 'works' ? '3px solid #007aff' : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s',
              minWidth: '140px'
            }}
          >
            📋 Работы
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'transparent',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'kanban' ? '#007aff' : '#8e8e93',
              borderBottom: activeTab === 'kanban' ? '3px solid #007aff' : '3px solid transparent',
              marginBottom: '-2px',
              transition: 'all 0.2s',
              minWidth: '140px'
            }}
          >
            📊 Выполнения
            {(pendingApprovals.length + sentAssignments.length) > 0 && (
              <span style={{
                marginLeft: '0.5rem',
                background: '#ff3b30',
                color: '#fff',
                borderRadius: '10px',
                padding: '0.15rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}>
                {pendingApprovals.length + sentAssignments.length}
              </span>
            )}
          </button>
        </div>

        {/* Вкладка "Работы" */}
        {activeTab === 'works' && (
          <>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {/* Выбор объекта */}
              <div className="form-group" style={{ flex: '1 1 300px', marginBottom: 0 }}>
                <label>Объект</label>
                <select
                  value={selectedObjectId}
                  onChange={(e) => {
                    setSelectedObjectId(e.target.value);
                    setSelectedSectionId('');
                  }}
                >
                  <option value="">-- Выберите объект --</option>
                  {objects.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                  ))}
                </select>
              </div>

              {/* Выбор секции */}
              {selectedObjectId && (
                <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                  <label>Секция</label>
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                  >
                    <option value="">-- Выберите секцию --</option>
                    {sections.map(sec => (
                      <option key={sec.id} value={sec.id}>
                        Секция {sec.section_number} - {sec.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Кнопка обновить */}
              {selectedSectionId && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={loadWorks}
                    disabled={loading}
                    style={{ 
                      marginBottom: 0, 
                      whiteSpace: 'nowrap', 
                      flexShrink: 0,
                      background: hasUpdates ? '#ff9500' : undefined
                    }}
                  >
                    {hasUpdates ? '🔄 Есть обновления!' : '🔄 Обновить'}
                  </button>
                  {lastUpdate && !hasUpdates && (
                    <span style={{ fontSize: '0.75rem', color: '#8e8e93', whiteSpace: 'nowrap', alignSelf: 'center' }}>
                      Обновлено {new Date(lastUpdate).toLocaleTimeString('ru-RU')}
                    </span>
                  )}
                </div>
              )}
            </div>

            {loading && <p className="loading">Загрузка...</p>}

            {works.length > 0 && (
              <div>
                <h3 className="mb-2">
                  Работы: {getSelectedObjectName()} / {getSelectedSectionName()}
                </h3>
                {Object.entries(groupWorksByStructure(works)).map(([stage, sections]) => (
                  <div key={stage} style={{ marginBottom: '1rem' }}>
                    <h4 style={{ background: '#e3f2fd', padding: '0.5rem', borderRadius: '4px' }}>{stage}</h4>
                    {Object.entries(sections).map(([section, floors]) => (
                      <div key={section} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
                        <div 
                          onClick={() => toggleSection(`${stage}-${section}`)}
                          style={{ 
                            background: '#f5f5f5', 
                            padding: '0.5rem', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {expandedSections[`${stage}-${section}`] ? '▼' : '▶'} {section}
                        </div>
                        {expandedSections[`${stage}-${section}`] && Object.entries(floors).map(([floor, works]) => (
                          <div key={floor} style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                            <div 
                              onClick={() => toggleFloor(`${stage}-${section}-${floor}`)}
                              style={{ 
                                background: '#fafafa', 
                                padding: '0.4rem', 
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontWeight: '500',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {expandedFloors[`${stage}-${section}-${floor}`] ? '▼' : '▶'} {floor}
                            </div>
                            {expandedFloors[`${stage}-${section}-${floor}`] && (
                              <div style={{ marginLeft: '1rem', marginTop: '0.5rem', overflowX: 'auto' }}>
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Вид работ</th>
                                      <th>Начало</th>
                                      <th>Окончание</th>
                                      <th>Объем</th>
                                      <th>Выполнено</th>
                                      <th>Назначено</th>
                                      <th>Остаток</th>
                                      <th>Действие</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {works.map((work) => {
                                      const remaining = work.total_volume - (work.actual_completed || 0) - (work.assigned_total || 0);
                                      const isCompleted = remaining <= 0;
                                      return (
                                        <tr key={work.id} style={isCompleted ? { textDecoration: 'line-through', opacity: 0.6, background: '#f0f0f0' } : {}}>
                                          <td>{work.work_type}</td>
                                          <td>{new Date(work.start_date).toLocaleDateString('ru-RU')}</td>
                                          <td>{new Date(work.end_date).toLocaleDateString('ru-RU')}</td>
                                          <td>{work.total_volume} {work.unit}</td>
                                          <td>{work.actual_completed || 0} {work.unit}</td>
                                          <td>{work.assigned_total || 0} {work.unit}</td>
                                          <td style={{ fontWeight: '600', color: remaining > 0 ? '#007aff' : '#34c759' }}>
                                            {remaining.toFixed(2)} {work.unit}
                                          </td>
                                          <td>
                                            {!isCompleted && (
                                              <button
                                                className="btn btn-small btn-success"
                                                onClick={() => handleAssignWork(work.id, work)}
                                              >
                                                Распределить
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {!selectedObjectId && (
              <div className="empty-state">
                <h3>Выберите объект для начала работы</h3>
              </div>
            )}

            {selectedObjectId && !selectedSectionId && sections.length > 0 && (
              <div className="empty-state">
                <h3>Выберите секцию</h3>
              </div>
            )}

            {selectedObjectId && selectedSectionId && works.length === 0 && !loading && (
              <div className="empty-state">
                <h3>Нет работ в выбранной секции</h3>
              </div>
            )}
          </>
        )}

        {/* Канбан доска для выполнений */}
        {activeTab === 'kanban' && (
          <KanbanBoard
            pendingApprovals={pendingApprovals}
            sentAssignments={sentAssignments}
            rejectedWorks={rejectedWorks}
            onApprove={(id) => handleApproveWork(id, true)}
            onReject={(id) => handleApproveWork(id, false)}
          />
        )}
      </div>
    </div>
  );
}
