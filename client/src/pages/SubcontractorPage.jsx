import { useState, useEffect } from 'react';
import { subcontractor } from '../api';
import VolumeSlider from '../components/VolumeSlider';

const subcontractorTabs = [
  { id: 'assignments', label: 'Наряды' },
  { id: 'issues', label: 'Список замечаний' }
];

export default function SubcontractorPage({ user }) {
  const [assignments, setAssignments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('assignments');
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

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

  const handleSubmitWork = async (volume) => {
    const workDate = new Date().toISOString().split('T')[0];

    try {
      await subcontractor.submitWork(
        selectedAssignment.id,
        volume,
        workDate,
        null,
        user.id
      );
      alert('Выполненный объем отправлен на проверку!');
      setSelectedAssignment(null);
      loadAssignments();
      loadStatistics();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'assigned': { class: 'badge-info', text: 'Назначено' },
      'in_progress': { class: 'badge-warning', text: 'В работе' },
      'submitted': { class: 'badge-warning', text: 'На проверке' },
      'approved': { class: 'badge-success', text: 'Одобрено' },
      'rejected': { class: 'badge-danger', text: 'Отклонено' }
    };
    const badge = badges[status] || { class: '', text: status };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div>
      <div className="page-tabs">
        {subcontractorTabs.map((tab) => (
          <button
            key={tab.id}
            className={`page-tabs__button ${activeTab === tab.id ? 'page-tabs__button--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Статистика */}
      {statistics && (
        <div className="grid grid-3 mb-3">
          <div className="card">
            <h4>Всего нарядов</h4>
            <h2>{statistics.total_assignments}</h2>
          </div>
          <div className="card">
            <h4>На проверке</h4>
            <h2>{statistics.pending_approval}</h2>
          </div>
          <div className="card">
            <h4>Одобрено работ</h4>
            <h2>{statistics.approved_works}</h2>
          </div>
        </div>
      )}

      <div className="card">
        {loading && <p className="loading">Загрузка...</p>}

        {/* Наряды */}
        {activeTab === 'assignments' && (
          <>
            {assignments.length === 0 ? (
              <div className="empty-state">
                <h3>Нет нарядов</h3>
                <p>Прораб пока не назначил вам работы</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Объект / Секция</th>
                      <th>Работа</th>
                      <th>Секция</th>
                      <th>Этаж</th>
                      <th>Период</th>
                      <th>Назначено</th>
                      <th>Выполнено</th>
                      <th>Дневная норма</th>
                      <th>Статус</th>
                      <th>Действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => {
                      const remaining = assignment.assigned_volume - parseFloat(assignment.completed_so_far || 0);
                      const canSubmit = remaining > 0 && 
                        ['assigned', 'in_progress'].includes(assignment.status);

                      return (
                        <tr key={assignment.id}>
                          <td>
                            <div style={{ fontWeight: '600', color: '#1c1c1e' }}>
                              {assignment.object_name}
                            </div>
                            {assignment.section_name && (
                              <div style={{ fontSize: '0.85rem', color: '#007aff' }}>
                                {assignment.section_name}
                              </div>
                            )}
                          </td>
                          <td>{assignment.work_type}</td>
                          <td>{assignment.section}</td>
                          <td>{assignment.floor}</td>
                          <td>
                            {new Date(assignment.start_date).toLocaleDateString('ru-RU')}
                            {' - '}
                            {new Date(assignment.end_date).toLocaleDateString('ru-RU')}
                          </td>
                          <td>{assignment.assigned_volume} {assignment.unit}</td>
                          <td>{assignment.completed_so_far} {assignment.unit}</td>
                          <td>{assignment.daily_target} {assignment.unit}/день</td>
                          <td>{getStatusBadge(assignment.status)}</td>
                          <td>
                            {canSubmit ? (
                              <button
                                className="btn btn-small btn-success"
                                onClick={() => setSelectedAssignment(assignment)}
                              >
                                📊 Отметить
                              </button>
                            ) : (
                              <span style={{ color: '#999', fontSize: '0.9rem' }}>
                                {remaining <= 0 ? 'Завершено' : 'Недоступно'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'issues' && (
          <div className="empty-state">
            <h3>Список замечаний недоступен</h3>
            <p style={{ color: '#8e8e93', marginTop: '0.5rem' }}>Раздел появится в ближайшем обновлении.</p>
          </div>
        )}
      </div>

      {/* Модальное окно с ползунком */}
      {selectedAssignment && (
        <VolumeSlider
          assignment={selectedAssignment}
          onSubmit={handleSubmitWork}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  );
}
