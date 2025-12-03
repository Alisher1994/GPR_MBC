import { useState, useEffect } from 'react';
import { foreman, planner, auth } from '../api';

export default function ForemanPage({ user }) {
  const [objects, setObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [upcomingWorks, setUpcomingWorks] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [sentAssignments, setSentAssignments] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [activeTab, setActiveTab] = useState('works');
  const [loading, setLoading] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState({});
  const [expandedFloors, setExpandedFloors] = useState({});

  useEffect(() => {
    loadObjects();
    loadSubcontractors();
    loadPendingApprovals();
    loadSentAssignments();
  }, []);

  const loadObjects = async () => {
    try {
      const response = await planner.getObjects();
      setObjects(response.data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
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

  const loadUpcomingWorks = async () => {
    if (!selectedObjectId) return;
    
    setLoading(true);
    try {
      const response = await foreman.getUpcomingWorks(selectedObjectId, 2);
      setUpcomingWorks(response.data);
    } catch (error) {
      console.error('Ошибка загрузки работ:', error);
    } finally {
      setLoading(false);
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

  const toggleBlock = (blockName) => {
    setExpandedBlocks(prev => ({ ...prev, [blockName]: !prev[blockName] }));
  };

  const toggleFloor = (key) => {
    setExpandedFloors(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const groupWorksByStructure = (works) => {
    const grouped = {};
    works.forEach(work => {
      const stage = work.stage || 'Без очереди';
      const block = work.block || 'Без блока';
      const floor = work.floor || 'Без этажа';
      
      if (!grouped[stage]) grouped[stage] = {};
      if (!grouped[stage][block]) grouped[stage][block] = {};
      if (!grouped[stage][block][floor]) grouped[stage][block][floor] = [];
      
      grouped[stage][block][floor].push(work);
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
      loadUpcomingWorks();
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
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div>
      <h2 className="mb-3">Панель прораба</h2>

      {/* Табы */}
      <div className="card">
        <div className="flex gap-1 mb-3">
          <button
            className={`btn btn-small ${activeTab === 'works' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('works')}
          >
            Работы
          </button>
          <button
            className={`btn btn-small ${activeTab === 'incoming' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('incoming')}
          >
            Входящие ({pendingApprovals.length})
          </button>
          <button
            className={`btn btn-small ${activeTab === 'sent' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('sent')}
          >
            Отправленные ({sentAssignments.length})
          </button>
        </div>

        {/* Вкладка "Работы" */}
        {activeTab === 'works' && (
          <>
            <div className="form-group">
              <label>Выберите объект</label>
              <select
                value={selectedObjectId}
                onChange={(e) => setSelectedObjectId(e.target.value)}
              >
                <option value="">-- Выберите объект --</option>
                {objects.map(obj => (
                  <option key={obj.id} value={obj.id}>{obj.name}</option>
                ))}
              </select>
            </div>

            {selectedObjectId && (
              <button
                className="btn btn-primary mb-3"
                onClick={loadUpcomingWorks}
                disabled={loading}
              >
                Сформировать список работ (2 недели)
              </button>
            )}

            {loading && <p className="loading">Загрузка...</p>}

            {upcomingWorks.length > 0 && (
              <div>
                <h3 className="mb-2">Работы на ближайшие 2 недели</h3>
                {Object.entries(groupWorksByStructure(upcomingWorks)).map(([stage, blocks]) => (
                  <div key={stage} style={{ marginBottom: '1rem' }}>
                    <h4 style={{ background: '#e3f2fd', padding: '0.5rem', borderRadius: '4px' }}>{stage}</h4>
                    {Object.entries(blocks).map(([block, floors]) => (
                      <div key={block} style={{ marginLeft: '1rem', marginBottom: '0.5rem' }}>
                        <div 
                          onClick={() => toggleBlock(`${stage}-${block}`)}
                          style={{ 
                            background: '#f5f5f5', 
                            padding: '0.5rem', 
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}
                        >
                          {expandedBlocks[`${stage}-${block}`] ? '▼' : '▶'} {block}
                        </div>
                        {expandedBlocks[`${stage}-${block}`] && Object.entries(floors).map(([floor, works]) => (
                          <div key={floor} style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                            <div 
                              onClick={() => toggleFloor(`${stage}-${block}-${floor}`)}
                              style={{ 
                                background: '#fafafa', 
                                padding: '0.4rem', 
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontWeight: '500'
                              }}
                            >
                              {expandedFloors[`${stage}-${block}-${floor}`] ? '▼' : '▶'} {floor}
                            </div>
                            {expandedFloors[`${stage}-${block}-${floor}`] && (
                              <div style={{ marginLeft: '1rem', marginTop: '0.5rem', overflowX: 'auto' }}>
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Вид работ</th>
                                      <th>Начало</th>
                                      <th>Окончание</th>
                                      <th>Объем</th>
                                      <th>Выполнено</th>
                                      <th>Назначений</th>
                                      <th>Действие</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {works.map((work) => (
                                      <tr key={work.id}>
                                        <td>{work.work_type}</td>
                                        <td>{new Date(work.start_date).toLocaleDateString('ru-RU')}</td>
                                        <td>{new Date(work.end_date).toLocaleDateString('ru-RU')}</td>
                                        <td>{work.total_volume} {work.unit}</td>
                                        <td>{work.actual_completed} {work.unit}</td>
                                        <td>{work.assignments_count}</td>
                                        <td>
                                          <button
                                            className="btn btn-small btn-success"
                                            onClick={() => handleAssignWork(work.id, work)}
                                          >
                                            Распределить
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
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
          </>
        )}

        {/* Вкладка "Входящие" */}
        {activeTab === 'incoming' && (
          <>
            <h3 className="mb-2">Выполненные объемы для проверки</h3>
            {pendingApprovals.length === 0 ? (
              <div className="empty-state">
                <h3>Нет ожидающих подтверждения работ</h3>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Субподрядчик</th>
                      <th>Работа</th>
                      <th>Блок/Этаж</th>
                      <th>Дата</th>
                      <th>Выполнено</th>
                      <th>Примечания</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingApprovals.map((approval) => (
                      <tr key={approval.id}>
                        <td>
                          {approval.subcontractor_name}
                          {approval.company_name && <><br/><small>{approval.company_name}</small></>}
                        </td>
                        <td>{approval.work_type}</td>
                        <td>{approval.block} / {approval.floor}</td>
                        <td>{new Date(approval.work_date).toLocaleDateString('ru-RU')}</td>
                        <td>{approval.completed_volume} {approval.unit}</td>
                        <td>{approval.notes || '-'}</td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-small btn-success"
                              onClick={() => handleApproveWork(approval.id, true)}
                            >
                              ✓ Подтвердить
                            </button>
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleApproveWork(approval.id, false)}
                            >
                              ✗ Отклонить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Вкладка "Отправленные" */}
        {activeTab === 'sent' && (
          <>
            <h3 className="mb-2">Отправленные наряды</h3>
            {sentAssignments.length === 0 ? (
              <div className="empty-state">
                <h3>Нет отправленных нарядов</h3>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Субподрядчик</th>
                      <th>Работа</th>
                      <th>Блок/Этаж</th>
                      <th>Дата назначения</th>
                      <th>Назначено</th>
                      <th>Выполнено</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          {assignment.subcontractor_name}
                          {assignment.company_name && <><br/><small>{assignment.company_name}</small></>}
                        </td>
                        <td>{assignment.work_type}</td>
                        <td>{assignment.block} / {assignment.floor}</td>
                        <td>{new Date(assignment.assigned_at).toLocaleDateString('ru-RU')}</td>
                        <td>{assignment.assigned_volume} {assignment.unit}</td>
                        <td>{assignment.completed_volume || 0} {assignment.unit}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            background: assignment.status === 'pending' ? '#fff3cd' : 
                                       assignment.status === 'in_progress' ? '#cfe2ff' : '#d1e7dd',
                            color: assignment.status === 'pending' ? '#856404' : 
                                  assignment.status === 'in_progress' ? '#084298' : '#0f5132'
                          }}>
                            {assignment.status === 'pending' ? 'Ожидает' : 
                             assignment.status === 'in_progress' ? 'В работе' : 'Завершено'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Список субподрядчиков для справки */}
      <div className="card">
        <h3 className="card-title">Доступные субподрядчики</h3>
        <div className="grid grid-3">
          {subcontractors.map((sub, idx) => (
            <div key={sub.id} style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <strong>#{idx + 1}</strong> - {sub.username}
              {sub.company_name && <><br/><small>{sub.company_name}</small></>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
