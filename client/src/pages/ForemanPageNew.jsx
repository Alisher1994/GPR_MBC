import { useState, useEffect } from 'react';
import { foreman, auth } from '../api';
import KanbanBoard from '../components/KanbanBoard';
import TabIcon from '../components/TabIcon';

const foremanTabs = [
  { id: 'works', label: 'Работы', icon: 'layers' },
  { id: 'kanban', label: 'Выполнения', icon: 'kanban' }
];

export default function ForemanPageNew({ user }) {
  // Выбор объекта/очереди/секции
  const [objects, setObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [queues, setQueues] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  
  // Данные
  const [works, setWorks] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [sentAssignments, setSentAssignments] = useState([]);
  const [rejectedWorks, setRejectedWorks] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  
  // UI
  const [activeTab, setActiveTab] = useState('works');
  const [loading, setLoading] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState({});

  const columnHighlight = {
    completed: {
      header: { background: '#ecfdf3', color: '#34c759', fontWeight: 600 },
      cell: { background: '#f7fdf9' }
    },
    assigned: {
      header: { background: '#fff7ed', color: '#ff9500', fontWeight: 600 },
      cell: { background: '#fffaf3' }
    },
    remaining: {
      header: { background: '#ffeef0', color: '#ff3b30', fontWeight: 600 },
      cell: { background: '#fff6f7' }
    }
  };

  // Загрузка при монтировании
  useEffect(() => {
    loadObjects();
    loadSubcontractors();
    loadPendingApprovals();
    loadSentAssignments();
    loadRejectedWorks();
  }, []);

  // Загрузка очередей при выборе объекта
  useEffect(() => {
    if (selectedObjectId) {
      loadQueues(selectedObjectId);
    } else {
      setQueues([]);
      setSelectedQueueId('');
    }
  }, [selectedObjectId]);

  // Загрузка секций при выборе очереди
  useEffect(() => {
    if (selectedQueueId) {
      loadSections(selectedQueueId);
    } else {
      setSections([]);
      setSelectedSectionId('');
    }
  }, [selectedQueueId]);

  // Загрузка работ при выборе секции
  useEffect(() => {
    if (selectedSectionId) {
      loadWorks();
    } else {
      setWorks([]);
    }
  }, [selectedSectionId]);

  const loadObjects = async () => {
    try {
      const res = await foreman.getObjects();
      setObjects(res.data);
    } catch (err) {
      console.error('Ошибка загрузки объектов:', err);
    }
  };

  const loadQueues = async (objectId) => {
    try {
      const res = await foreman.getQueues(objectId);
      setQueues(res.data);
      setSelectedQueueId('');
    } catch (err) {
      console.error('Ошибка загрузки очередей:', err);
    }
  };

  const loadSections = async (queueId) => {
    try {
      const res = await foreman.getSections(queueId);
      setSections(res.data);
      setSelectedSectionId('');
    } catch (err) {
      console.error('Ошибка загрузки секций:', err);
    }
  };

  const loadWorks = async () => {
    if (!selectedSectionId) return;
    setLoading(true);
    try {
      const res = await foreman.getSectionWorks(selectedSectionId);
      setWorks(res.data);
    } catch (err) {
      console.error('Ошибка загрузки работ:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubcontractors = async () => {
    try {
      const res = await auth.getUsers('subcontractor');
      setSubcontractors(res.data);
    } catch (err) {
      console.error('Ошибка загрузки субподрядчиков:', err);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const res = await foreman.getPendingApprovals(user.id);
      setPendingApprovals(res.data);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const loadSentAssignments = async () => {
    try {
      const res = await foreman.getSentAssignments(user.id);
      setSentAssignments(res.data);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const loadRejectedWorks = async () => {
    try {
      const res = await foreman.getRejectedWorks(user.id);
      setRejectedWorks(res.data);
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleApproveWork = async (completedWorkId, status, adjustedVolume, notes) => {
    try {
      await foreman.approveWork(completedWorkId, user.id, status, adjustedVolume, notes);
      loadPendingApprovals();
      loadSentAssignments();
      loadRejectedWorks();
      if (selectedSectionId) loadWorks();
    } catch (err) {
      console.error('Ошибка:', err);
    }
  };

  const handleAssignWork = async (workItemId, assignments) => {
    try {
      await foreman.assignWork(workItemId, assignments, user.id);
      loadWorks();
      loadSentAssignments();
      alert('Работа успешно назначена!');
    } catch (err) {
      alert('Ошибка назначения: ' + err.message);
    }
  };

  // Группировка работ по этажам
  const worksByFloor = works.reduce((acc, work) => {
    if (!acc[work.floor]) acc[work.floor] = [];
    acc[work.floor].push(work);
    return acc;
  }, {});

  const toggleFloor = (floor) => {
    setExpandedFloors(prev => ({ ...prev, [floor]: !prev[floor] }));
  };

  // Стили
  const selectStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid #e5e5ea',
    fontSize: '0.95rem',
    minWidth: '200px',
    background: '#fff',
    cursor: 'pointer'
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f7', overflow: 'hidden' }}>
      {/* Header с селекторами */}
      <div style={{ 
        background: '#fff', 
        padding: '1rem 1.5rem', 
        borderBottom: '1px solid #e5e5ea',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', marginRight: 'auto' }}>
          Прораб
        </h1>
        
        {/* Селекторы */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedObjectId}
            onChange={(e) => setSelectedObjectId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Выберите объект</option>
            {objects.map(obj => (
              <option key={obj.id} value={obj.id}>{obj.name}</option>
            ))}
          </select>

          <select
            value={selectedQueueId}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            style={selectStyle}
            disabled={!selectedObjectId}
          >
            <option value="">Выберите очередь</option>
            {queues.map(q => (
              <option key={q.id} value={q.id}>{q.queue_name}</option>
            ))}
          </select>

          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            style={selectStyle}
            disabled={!selectedQueueId}
          >
            <option value="">Выберите секцию</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.section_name}</option>
            ))}
          </select>
        </div>

        {/* Табы */}
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
          {foremanTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === tab.id ? '#007aff' : '#f0f0f0',
                color: activeTab === tab.id ? '#fff' : '#1c1c1e',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
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

      {/* Контент */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {activeTab === 'works' && (
          <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {!selectedSectionId ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#8e8e93' }}>
                Выберите объект, очередь и секцию для просмотра работ
              </div>
            ) : loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#8e8e93' }}>
                Загрузка...
              </div>
            ) : works.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#8e8e93' }}>
                Нет работ. Загрузите XML файл через Планировщик.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {Object.entries(worksByFloor).map(([floor, floorWorks]) => (
                  <div key={floor} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    {/* Заголовок этажа */}
                    <div
                      onClick={() => toggleFloor(floor)}
                      style={{
                        padding: '1rem 1.5rem',
                        background: '#f9f9f9',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: '600'
                      }}
                    >
                      <span>🏢 {floor}</span>
                      <span style={{ color: '#8e8e93', fontSize: '0.85rem' }}>
                        {floorWorks.length} работ {expandedFloors[floor] ? '▼' : '▶'}
                      </span>
                    </div>

                    {/* Таблица работ этажа */}
                    {expandedFloors[floor] && (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>Вид работы</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>Объем</th>
                            <th style={{ ...columnHighlight.completed.header, padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Выполнено</th>
                            <th style={{ ...columnHighlight.assigned.header, padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Назначено</th>
                            <th style={{ ...columnHighlight.remaining.header, padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>Остаток</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #f0f0f0' }}>Действие</th>
                          </tr>
                        </thead>
                        <tbody>
                          {floorWorks.map(work => {
                            const remaining = work.total_volume - (work.actual_completed || 0) - (work.assigned_total || 0);
                            return (
                              <tr key={work.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                <td style={{ padding: '0.75rem' }}>{work.work_type}</td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>{work.total_volume} {work.unit}</td>
                                <td style={{ ...columnHighlight.completed.cell, padding: '0.75rem', textAlign: 'center' }}>
                                  {work.actual_completed || 0} {work.unit}
                                </td>
                                <td style={{ ...columnHighlight.assigned.cell, padding: '0.75rem', textAlign: 'center' }}>
                                  {work.assigned_total || 0} {work.unit}
                                </td>
                                <td style={{ 
                                  ...columnHighlight.remaining.cell, 
                                  padding: '0.75rem', 
                                  textAlign: 'center',
                                  color: remaining > 0 ? '#ff3b30' : '#34c759',
                                  fontWeight: '600'
                                }}>
                                  {remaining.toFixed(2)} {work.unit}
                                </td>
                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                  {remaining > 0 && (
                                    <AssignButton
                                      work={work}
                                      remaining={remaining}
                                      subcontractors={subcontractors}
                                      onAssign={handleAssignWork}
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'kanban' && (
          <KanbanBoard
            pendingApprovals={pendingApprovals}
            confirmed={sentAssignments}
            rejected={rejectedWorks}
            onApprove={handleApproveWork}
          />
        )}
      </div>
    </div>
  );
}

// Компонент кнопки назначения
function AssignButton({ work, remaining, subcontractors, onAssign }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [volume, setVolume] = useState('');

  const handleSubmit = () => {
    if (!selectedSubId || !volume) return;
    const vol = parseFloat(volume);
    if (vol <= 0 || vol > remaining) {
      alert('Некорректный объем');
      return;
    }
    onAssign(work.id, [{ subcontractorId: parseInt(selectedSubId), assignedVolume: vol }]);
    setShowModal(false);
    setSelectedSubId('');
    setVolume('');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '0.4rem 0.8rem',
          borderRadius: '8px',
          border: 'none',
          background: '#007aff',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: '500'
        }}
      >
        Назначить
      </button>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Назначить работу</h3>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              {work.work_type}<br />
              <strong>Доступно: {remaining.toFixed(2)} {work.unit}</strong>
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Субподрядчик</label>
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
              >
                <option value="">Выберите...</option>
                {subcontractors.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.username} {sub.company_name ? `(${sub.company_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Объем ({work.unit})</label>
              <input
                type="number"
                step="0.01"
                max={remaining}
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#007aff', color: '#fff', cursor: 'pointer' }}
              >
                Назначить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
