import { useState, useEffect } from 'react';
import { planner } from '../api';

export default function PlannerPage({ user }) {
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadObjects();
  }, []);

  const loadObjects = async () => {
    try {
      const response = await planner.getObjects();
      setObjects(response.data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('xmlFile', file);
    formData.append('userId', user.id);

    setLoading(true);
    setMessage('');

    try {
      const response = await planner.uploadXML(formData);
      setMessage(`Успешно! Загружен объект: ${response.data.objectName}, работ: ${response.data.workItemsCount}`);
      loadObjects();
    } catch (error) {
      setMessage(`Ошибка: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleExport = async (objectId) => {
    try {
      const response = await planner.exportXML(objectId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export-${objectId}-${Date.now()}.xml`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Ошибка экспорта: ' + (error.response?.data?.error || error.message));
    }
  };

  const viewObjectDetails = async (objectId) => {
    try {
      const response = await planner.getObjectDetails(objectId);
      setSelectedObject(response.data);
    } catch (error) {
      alert('Ошибка загрузки деталей: ' + error.message);
    }
  };

  const handleDeleteObject = async (objectId, objectName) => {
    if (!confirm(`Вы уверены, что хотите удалить объект "${objectName}"?\n\nЭто удалит все работы, назначения и выполненные объемы!`)) {
      return;
    }

    try {
      await planner.deleteObject(objectId);
      alert('Объект успешно удален');
      loadObjects();
      if (selectedObject?.object.id === objectId) {
        setSelectedObject(null);
      }
    } catch (error) {
      alert('Ошибка удаления: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div>
      <h2 className="mb-3">Панель плановика</h2>

      {/* Загрузка XML */}
      <div className="card">
        <h3 className="card-title">Загрузить XML из Primavera P6</h3>
        <div className="form-group">
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            disabled={loading}
          />
        </div>
        {loading && <p className="loading">Загрузка...</p>}
        {message && (
          <div className={`alert ${message.includes('Ошибка') ? 'alert-error' : 'alert-success'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Список объектов */}
      <div className="card">
        <h3 className="card-title">Объекты</h3>
        {objects.length === 0 ? (
          <div className="empty-state">
            <h3>Нет объектов</h3>
            <p>Загрузите XML файл для начала работы</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Кол-во работ</th>
                <th>Последнее обновление</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((obj) => (
                <tr key={obj.id}>
                  <td>
                    {obj.name}
                    {obj.has_updates && (
                      <span style={{
                        marginLeft: '0.5rem',
                        padding: '0.2rem 0.5rem',
                        background: '#ffc107',
                        color: '#000',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        Есть изменения
                      </span>
                    )}
                  </td>
                  <td>{obj.work_items_count}</td>
                  <td>{obj.last_update ? new Date(obj.last_update).toLocaleString('ru-RU') : '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => viewObjectDetails(obj.id)}
                      >
                        Детали
                      </button>
                      <button
                        className="btn btn-small btn-success"
                        onClick={() => handleExport(obj.id)}
                        title="Скачать актуальную версию XML с выполненными объемами"
                      >
                        📥 Скачать XML
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDeleteObject(obj.id, obj.name)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Детали объекта */}
      {selectedObject && (
        <div className="card">
          <div className="flex justify-between items-center mb-2">
            <h3 className="card-title">Детали: {selectedObject.object.name}</h3>
            <button
              className="btn btn-small btn-secondary"
              onClick={() => setSelectedObject(null)}
            >
              Закрыть
            </button>
          </div>
          
          {selectedObject.workItems.length === 0 ? (
            <p>Нет работ</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
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
                    <th>Ед. изм.</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedObject.workItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.stage}</td>
                      <td>{item.block}</td>
                      <td>{item.floor}</td>
                      <td>{item.work_type}</td>
                      <td>{new Date(item.start_date).toLocaleDateString('ru-RU')}</td>
                      <td>{new Date(item.end_date).toLocaleDateString('ru-RU')}</td>
                      <td>{item.total_volume}</td>
                      <td>{item.completed_volume}</td>
                      <td>{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
