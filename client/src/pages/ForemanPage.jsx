import { useState, useEffect } from 'react';
import { foreman, planner, auth } from '../api';

export default function ForemanPage({ user }) {
  const [objects, setObjects] = useState([]);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [upcomingWorks, setUpcomingWorks] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [activeTab, setActiveTab] = useState('works'); // 'works', 'approvals', 'my-assignments'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadObjects();
    loadSubcontractors();
    loadPendingApprovals();
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

  const handleAssignWork = async (workItemId) => {
    const selectedSubs = prompt('Введите ID субподрядчиков через запятую:');
    if (!selectedSubs) return;

    const subIds = selectedSubs.split(',').map(id => id.trim());
    const volume = prompt('Введите объем для каждого субподрядчика:');
    if (!volume) return;

    const assignments = subIds.map(subId => ({
      subcontractorId: parseInt(subId),
      assignedVolume: parseFloat(volume)
    }));

    try {
      await foreman.assignWork(workItemId, assignments, user.id);
      alert('Работа успешно распределена!');
      loadUpcomingWorks();
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
            className={`btn btn-small ${activeTab === 'approvals' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('approvals')}
          >
            Входящие ({pendingApprovals.length})
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
              <div style={{ overflowX: 'auto' }}>
                <h3 className="mb-2">Работы на ближайшие 2 недели</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Очередь</th>
                      <th>Блок</th>
                      <th>Этаж</th>
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
                    {upcomingWorks.map((work) => (
                      <tr key={work.id}>
                        <td>{work.stage}</td>
                        <td>{work.block}</td>
                        <td>{work.floor}</td>
                        <td>{work.work_type}</td>
                        <td>{new Date(work.start_date).toLocaleDateString('ru-RU')}</td>
                        <td>{new Date(work.end_date).toLocaleDateString('ru-RU')}</td>
                        <td>{work.total_volume} {work.unit}</td>
                        <td>{work.actual_completed} {work.unit}</td>
                        <td>{work.assignments_count}</td>
                        <td>
                          <button
                            className="btn btn-small btn-success"
                            onClick={() => handleAssignWork(work.id)}
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
          </>
        )}

        {/* Вкладка "Входящие" */}
        {activeTab === 'approvals' && (
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
      </div>

      {/* Список субподрядчиков для справки */}
      <div className="card">
        <h3 className="card-title">Доступные субподрядчики</h3>
        <div className="grid grid-3">
          {subcontractors.map(sub => (
            <div key={sub.id} style={{ padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <strong>ID: {sub.id}</strong> - {sub.username}
              {sub.company_name && <><br/><small>{sub.company_name}</small></>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
