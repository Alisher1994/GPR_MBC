import { useState, useEffect, useRef } from 'react';
import { planner } from '../api';
import Gantt from 'frappe-gantt';
import '../styles/frappe-gantt.css';
import TabIcon from '../components/TabIcon';

export default function PlannerPageNew({ user }) {
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Модальные окна
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [newObjectName, setNewObjectName] = useState('');
  const [newQueueNumber, setNewQueueNumber] = useState('');
  const [newQueueName, setNewQueueName] = useState('');
  const [newSectionNumber, setNewSectionNumber] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  
  // Gantt
  const [exporting, setExporting] = useState(null);
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [ganttWorks, setGanttWorks] = useState([]);
  const [ganttLoading, setGanttLoading] = useState(false);

  const ganttContainerRef = useRef(null);
  const ganttInstanceRef = useRef(null);

  // Стили
  const pageStyle = {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#f5f5f7',
    overflow: 'hidden'
  };

  const headerStyle = {
    padding: '1rem 1.5rem',
    background: '#fff',
    borderBottom: '1px solid #e5e5ea',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const columnsContainerStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
    padding: '1rem',
    flex: 1,
    overflow: 'hidden'
  };

  const columnStyle = {
    background: '#fff',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  };

  const columnHeaderStyle = {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const columnListStyle = {
    flex: 1,
    overflowY: 'auto',
    padding: '0.75rem'
  };

  const itemStyle = (isSelected) => ({
    padding: '1rem',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    background: isSelected ? 'linear-gradient(135deg, #007aff, #5ac8fa)' : '#f9f9f9',
    color: isSelected ? '#fff' : '#1c1c1e',
    transition: 'all 0.2s ease',
    boxShadow: isSelected ? '0 4px 12px rgba(0,122,255,0.3)' : 'none'
  });

  const badgeStyle = {
    background: '#e5e5ea',
    color: '#1c1c1e',
    borderRadius: '8px',
    padding: '0.15rem 0.5rem',
    fontSize: '0.8rem',
    fontWeight: '600'
  };

  const addButtonStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: 'none',
    background: 'transparent',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    fontSize: '1.25rem',
    fontWeight: '300',
    color: '#007aff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const actionPanelStyle = {
    background: '#fff',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e5ea',
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    flexWrap: 'wrap'
  };

  const actionButtonStyle = (color) => ({
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    border: 'none',
    background: color,
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  });

  // Загрузка данных
  useEffect(() => {
    loadObjects();
  }, []);

  useEffect(() => {
    if (selectedObject) {
      loadQueues(selectedObject.id);
    } else {
      setQueues([]);
      setSelectedQueue(null);
    }
  }, [selectedObject]);

  useEffect(() => {
    if (selectedQueue) {
      loadSections(selectedQueue.id);
    } else {
      setSections([]);
      setSelectedSection(null);
    }
  }, [selectedQueue]);

  const loadObjects = async () => {
    try {
      const res = await planner.getObjects();
      setObjects(res.data);
    } catch (err) {
      setError('Ошибка загрузки объектов');
    }
  };

  const loadQueues = async (objectId) => {
    try {
      const res = await planner.getQueues(objectId);
      setQueues(res.data);
      setSelectedQueue(null);
    } catch (err) {
      setError('Ошибка загрузки очередей');
    }
  };

  const loadSections = async (queueId) => {
    try {
      const res = await planner.getSections(queueId);
      setSections(res.data);
      setSelectedSection(null);
    } catch (err) {
      setError('Ошибка загрузки секций');
    }
  };

  // CRUD операции
  const handleCreateObject = async () => {
    if (!newObjectName.trim()) return;
    try {
      await planner.createObject({ name: newObjectName, userId: user.id });
      setNewObjectName('');
      setShowObjectModal(false);
      loadObjects();
    } catch (err) {
      setError('Ошибка создания объекта');
    }
  };

  const handleDeleteObject = async (id) => {
    if (!window.confirm('Удалить объект со всеми очередями и секциями?')) return;
    try {
      await planner.deleteObject(id);
      setSelectedObject(null);
      loadObjects();
    } catch (err) {
      setError('Ошибка удаления');
    }
  };

  const handleCreateQueue = async () => {
    if (!newQueueNumber || !newQueueName.trim()) return;
    try {
      await planner.createQueue(selectedObject.id, {
        queueNumber: parseInt(newQueueNumber),
        queueName: newQueueName,
        userId: user.id
      });
      setNewQueueNumber('');
      setNewQueueName('');
      setShowQueueModal(false);
      loadQueues(selectedObject.id);
    } catch (err) {
      setError('Ошибка создания очереди');
    }
  };

  const handleDeleteQueue = async (id) => {
    if (!window.confirm('Удалить очередь со всеми секциями?')) return;
    try {
      await planner.deleteQueue(id);
      setSelectedQueue(null);
      loadQueues(selectedObject.id);
    } catch (err) {
      setError('Ошибка удаления');
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionNumber || !newSectionName.trim()) return;
    try {
      await planner.createSection(selectedQueue.id, {
        sectionNumber: parseInt(newSectionNumber),
        sectionName: newSectionName,
        userId: user.id
      });
      setNewSectionNumber('');
      setNewSectionName('');
      setShowSectionModal(false);
      loadSections(selectedQueue.id);
    } catch (err) {
      setError('Ошибка создания секции');
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Удалить секцию и все работы?')) return;
    try {
      await planner.deleteSection(id);
      setSelectedSection(null);
      loadSections(selectedQueue.id);
    } catch (err) {
      setError('Ошибка удаления');
    }
  };

  // XML операции
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSection) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('xmlFile', file);
      formData.append('userId', user.id);
      await planner.uploadXML(selectedSection.id, formData);
      loadSections(selectedQueue.id);
      alert('XML файл успешно загружен!');
    } catch (err) {
      setError('Ошибка загрузки XML');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleExportSection = async (type) => {
    if (!selectedSection) return;
    setExporting(type);
    try {
      const res = type === 'full' 
        ? await planner.exportSection(selectedSection.id)
        : await planner.exportCompleted(selectedSection.id);
      
      const blob = new Blob([res.data], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'full' ? 'export' : 'completed'}-${selectedSection.section_name}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Ошибка экспорта');
    } finally {
      setExporting(null);
    }
  };

  const handleShowGantt = async () => {
    if (!selectedSection) return;
    setGanttLoading(true);
    try {
      const res = await planner.getSectionWorks(selectedSection.id);
      setGanttWorks(res.data);
      setShowGanttModal(true);
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setGanttLoading(false);
    }
  };

  // Gantt инициализация
  useEffect(() => {
    if (showGanttModal && ganttWorks.length > 0 && ganttContainerRef.current) {
      ganttContainerRef.current.innerHTML = '';
      
      const tasks = ganttWorks.map((work, idx) => ({
        id: `task-${work.id}`,
        name: `${work.floor}: ${work.work_type}`,
        start: work.start_date,
        end: work.end_date,
        progress: work.total_volume > 0 
          ? Math.min(100, Math.round((work.actual_completed / work.total_volume) * 100))
          : 0,
        custom_class: idx % 2 === 0 ? 'bar-blue' : 'bar-green'
      }));

      ganttInstanceRef.current = new Gantt(ganttContainerRef.current, tasks, {
        view_mode: 'Week',
        date_format: 'YYYY-MM-DD',
        language: 'ru',
        custom_popup_html: (task) => `
          <div class="gantt-popup">
            <h4>${task.name}</h4>
            <p>Прогресс: ${task.progress}%</p>
          </div>
        `
      });
    }
  }, [showGanttModal, ganttWorks]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
          Планировщик ГПР
        </h1>
        {error && (
          <div style={{ color: '#ff3b30', fontSize: '0.9rem' }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: '0.5rem', cursor: 'pointer' }}>✕</button>
          </div>
        )}
      </div>

      {/* 3 колонки */}
      <div style={columnsContainerStyle}>
        {/* Колонка 1: Объекты */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Объекты
              <span style={badgeStyle}>{objects.length}</span>
            </h3>
            <button style={addButtonStyle} onClick={() => setShowObjectModal(true)}>+</button>
          </div>
          <div style={columnListStyle}>
            {objects.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8e8e93', padding: '2rem' }}>
                Нет объектов
              </div>
            ) : (
              objects.map(obj => (
                <div
                  key={obj.id}
                  style={itemStyle(selectedObject?.id === obj.id)}
                  onClick={() => setSelectedObject(obj)}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{obj.name}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Очередей: {obj.queues_count || 0}</span>
                    {selectedObject?.id === obj.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteObject(obj.id); }}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Колонка 2: Очереди */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Очереди
              {queues.length > 0 && <span style={badgeStyle}>{queues.length}</span>}
            </h3>
            {selectedObject && (
              <button style={{ ...addButtonStyle, color: '#34c759' }} onClick={() => setShowQueueModal(true)}>+</button>
            )}
          </div>
          <div style={columnListStyle}>
            {!selectedObject ? (
              <div style={{ textAlign: 'center', color: '#8e8e93', padding: '2rem' }}>
                ← Выберите объект
              </div>
            ) : queues.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8e8e93', padding: '2rem' }}>
                Нет очередей
              </div>
            ) : (
              queues.map(queue => (
                <div
                  key={queue.id}
                  style={{ ...itemStyle(selectedQueue?.id === queue.id), background: selectedQueue?.id === queue.id ? 'linear-gradient(135deg, #34c759, #30d158)' : '#f9f9f9' }}
                  onClick={() => setSelectedQueue(queue)}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{queue.queue_name}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Секций: {queue.sections_count || 0}</span>
                    {selectedQueue?.id === queue.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteQueue(queue.id); }}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Колонка 3: Секции */}
        <div style={columnStyle}>
          <div style={columnHeaderStyle}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Секции
              {sections.length > 0 && <span style={badgeStyle}>{sections.length}</span>}
            </h3>
            {selectedQueue && (
              <button style={{ ...addButtonStyle, color: '#ff9500' }} onClick={() => setShowSectionModal(true)}>+</button>
            )}
          </div>
          <div style={columnListStyle}>
            {!selectedQueue ? (
              <div style={{ textAlign: 'center', color: '#8e8e93', padding: '2rem' }}>
                ← Выберите очередь
              </div>
            ) : sections.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8e8e93', padding: '2rem' }}>
                Нет секций
              </div>
            ) : (
              sections.map(section => (
                <div
                  key={section.id}
                  style={{ ...itemStyle(selectedSection?.id === section.id), background: selectedSection?.id === section.id ? 'linear-gradient(135deg, #ff9500, #ffcc00)' : '#f9f9f9' }}
                  onClick={() => setSelectedSection(section)}
                >
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{section.section_name}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8, display: 'flex', justifyContent: 'space-between' }}>
                    <span>XML: {section.active_files_count || 0}</span>
                    {selectedSection?.id === section.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', color: '#fff', padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Панель действий (показываем при выборе секции) */}
      {selectedSection && (
        <div style={actionPanelStyle}>
          <button
            style={actionButtonStyle('#5856d6')}
            onClick={handleShowGantt}
            disabled={ganttLoading}
          >
            <TabIcon name="chart" size={18} />
            {ganttLoading ? 'Загрузка...' : 'График Ганта'}
          </button>
          
          <label style={{ ...actionButtonStyle('#ff9500'), cursor: loading ? 'not-allowed' : 'pointer' }}>
            <TabIcon name="folder" size={18} />
            {loading ? 'Загрузка...' : 'Импорт XML'}
            <input
              type="file"
              accept=".xml"
              onChange={handleFileUpload}
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
          
          <button
            style={actionButtonStyle('#34c759')}
            onClick={() => handleExportSection('actual')}
            disabled={exporting !== null}
          >
            <TabIcon name="check" size={18} />
            {exporting === 'actual' ? 'Экспорт...' : 'Экспорт фактов'}
          </button>
          
          <button
            style={actionButtonStyle('#007aff')}
            onClick={() => handleExportSection('full')}
            disabled={exporting !== null}
          >
            <TabIcon name="download" size={18} />
            {exporting === 'full' ? 'Экспорт...' : 'Экспорт XML'}
          </button>
        </div>
      )}

      {/* Модальное окно: Новый объект */}
      {showObjectModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Новый объект</h3>
            <input
              type="text"
              placeholder="Название объекта"
              value={newObjectName}
              onChange={(e) => setNewObjectName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', boxSizing: 'border-box' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowObjectModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                Отмена
              </button>
              <button onClick={handleCreateObject} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#007aff', color: '#fff', cursor: 'pointer' }}>
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Новая очередь */}
      {showQueueModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Новая очередь</h3>
            <input
              type="number"
              placeholder="Номер очереди"
              value={newQueueNumber}
              onChange={(e) => setNewQueueNumber(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', boxSizing: 'border-box' }}
              autoFocus
            />
            <input
              type="text"
              placeholder="Название очереди (например: 1 очередь)"
              value={newQueueName}
              onChange={(e) => setNewQueueName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowQueueModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                Отмена
              </button>
              <button onClick={handleCreateQueue} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#34c759', color: '#fff', cursor: 'pointer' }}>
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Новая секция */}
      {showSectionModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Новая секция</h3>
            <input
              type="number"
              placeholder="Номер секции"
              value={newSectionNumber}
              onChange={(e) => setNewSectionNumber(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', boxSizing: 'border-box' }}
              autoFocus
            />
            <input
              type="text"
              placeholder="Название секции"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '1rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSectionModal(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>
                Отмена
              </button>
              <button onClick={handleCreateSection} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: '#ff9500', color: '#fff', cursor: 'pointer' }}>
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: График Ганта */}
      {showGanttModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ 
            background: '#fff', 
            borderRadius: '16px', 
            padding: '1.5rem', 
            width: '95%', 
            maxWidth: '1400px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>
                График работ: {selectedSection?.section_name}
              </h3>
              <button 
                onClick={() => setShowGanttModal(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer',
                  color: '#8e8e93'
                }}
              >
                ✕
              </button>
            </div>
            
            {ganttWorks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#8e8e93' }}>
                Нет данных для отображения. Загрузите XML файл.
              </div>
            ) : (
              <div ref={ganttContainerRef} style={{ minHeight: '400px' }} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
