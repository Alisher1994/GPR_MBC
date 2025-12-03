import { useState, useEffect } from 'react';
import { planner } from '../api';

export default function PlannerPageNew({ user }) {
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [xmlFiles, setXmlFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Модальные окна
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [newObjectName, setNewObjectName] = useState('');
  const [newSectionNumber, setNewSectionNumber] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  useEffect(() => {
    loadObjects();
  }, []);

  useEffect(() => {
    if (selectedObject) {
      loadSections(selectedObject.id);
    }
  }, [selectedObject]);

  useEffect(() => {
    if (selectedSection) {
      loadXmlFiles(selectedSection.id);
    }
  }, [selectedSection]);

  const loadObjects = async () => {
    try {
      const response = await planner.getObjects();
      setObjects(response.data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      alert('Ошибка загрузки объектов');
    }
  };

  const loadSections = async (objectId) => {
    try {
      const response = await planner.getObjectSections(objectId);
      setSections(response.data);
    } catch (error) {
      console.error('Ошибка загрузки секций:', error);
      alert('Ошибка загрузки секций');
    }
  };

  const loadXmlFiles = async (sectionId) => {
    try {
      const response = await planner.getSectionXmlFiles(sectionId);
      setXmlFiles(response.data);
    } catch (error) {
      console.error('Ошибка загрузки файлов:', error);
      alert('Ошибка загрузки файлов');
    }
  };

  const handleCreateObject = async () => {
    if (!newObjectName.trim()) {
      alert('Введите название объекта');
      return;
    }

    try {
      await planner.createObject({ name: newObjectName, userId: user.id });
      setNewObjectName('');
      setShowObjectModal(false);
      loadObjects();
    } catch (error) {
      console.error('Ошибка создания объекта:', error);
      alert('Ошибка создания объекта');
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionNumber || !newSectionName.trim()) {
      alert('Введите номер и название секции');
      return;
    }

    try {
      await planner.createSection(selectedObject.id, {
        sectionNumber: parseInt(newSectionNumber),
        sectionName: newSectionName,
        userId: user.id
      });
      setNewSectionNumber('');
      setNewSectionName('');
      setShowSectionModal(false);
      loadSections(selectedObject.id);
    } catch (error) {
      console.error('Ошибка создания секции:', error);
      alert(error.response?.data?.error || 'Ошибка создания секции');
    }
  };

  const handleUploadXml = async (sectionId, file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('xmlFile', file);
      formData.append('userId', user.id);

      await planner.uploadSectionXml(sectionId, formData);
      alert('XML файл успешно загружен!');
      loadXmlFiles(sectionId);
    } catch (error) {
      console.error('Ошибка загрузки XML:', error);
      alert(error.response?.data?.error || 'Ошибка загрузки XML');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteXmlFile = async (fileId) => {
    if (!confirm('Удалить этот XML файл?')) return;

    try {
      await planner.deleteXmlFile(fileId);
      loadXmlFiles(selectedSection.id);
    } catch (error) {
      console.error('Ошибка удаления файла:', error);
      alert('Ошибка удаления файла');
    }
  };

  const handleDeleteObject = async (objectId) => {
    if (!confirm('Удалить объект со всеми секциями и файлами?')) return;

    try {
      await planner.deleteObject(objectId);
      setSelectedObject(null);
      setSelectedSection(null);
      loadObjects();
    } catch (error) {
      console.error('Ошибка удаления объекта:', error);
      alert('Ошибка удаления объекта');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Удалить секцию со всеми файлами?')) return;

    try {
      await planner.deleteSection(sectionId);
      setSelectedSection(null);
      loadSections(selectedObject.id);
    } catch (error) {
      console.error('Ошибка удаления секции:', error);
      alert('Ошибка удаления секции');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem' }}>Панель плановика</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 300px 1fr', gap: '1.5rem', minHeight: '600px' }}>
        
        {/* Колонка 1: Объекты */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>🏗️ Объекты</h3>
            <button 
              className="btn btn-primary btn-small"
              onClick={() => setShowObjectModal(true)}
            >
              + Добавить
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {objects.map(obj => (
              <div
                key={obj.id}
                onClick={() => {
                  setSelectedObject(obj);
                  setSelectedSection(null);
                }}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: selectedObject?.id === obj.id ? '#007aff' : '#f5f5f5',
                  color: selectedObject?.id === obj.id ? '#fff' : '#000',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{obj.name}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  Секций: {obj.sections_count || 0}
                </div>
                {selectedObject?.id === obj.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteObject(obj.id);
                    }}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'rgba(255,59,48,0.2)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ Удалить объект
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Колонка 2: Секции */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>📦 Секции</h3>
            {selectedObject && (
              <button 
                className="btn btn-primary btn-small"
                onClick={() => setShowSectionModal(true)}
              >
                + Добавить
              </button>
            )}
          </div>

          {!selectedObject ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#8e8e93' }}>
              ← Выберите объект
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {sections.map(section => (
                <div
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedSection?.id === section.id ? '#34c759' : '#f5f5f5',
                    color: selectedSection?.id === section.id ? '#fff' : '#000',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: '600' }}>Секция {section.section_number}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{section.section_name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    Файлов: {section.active_files_count || 0}
                  </div>
                  {selectedSection?.id === section.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSection(section.id);
                      }}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        background: 'rgba(255,59,48,0.3)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Удалить секцию
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Колонка 3: XML Файлы */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>📄 XML Файлы</h3>

          {!selectedSection ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#8e8e93' }}>
              ← Выберите секцию
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="btn btn-success" style={{ cursor: 'pointer', display: 'inline-block' }}>
                  📤 Загрузить новый XML
                  <input
                    type="file"
                    accept=".xml"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleUploadXml(selectedSection.id, e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              {loading && <p className="loading">Загрузка файла...</p>}

              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>№</th>
                      <th>Дата/Время</th>
                      <th>Название файла</th>
                      <th>Размер</th>
                      <th>Загрузил</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xmlFiles.map((file, index) => (
                      <tr key={file.id} style={{ opacity: file.status === 'active' ? 1 : 0.5 }}>
                        <td>{index + 1}</td>
                        <td>{formatDateTime(file.uploaded_at)}</td>
                        <td>{file.filename}</td>
                        <td>{formatFileSize(file.file_size)}</td>
                        <td>{file.uploaded_by_name}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            background: file.status === 'active' ? '#d1e7dd' : 
                                       file.status === 'replaced' ? '#fff3cd' : '#f8d7da',
                            color: file.status === 'active' ? '#0f5132' : 
                                   file.status === 'replaced' ? '#856404' : '#842029'
                          }}>
                            {file.status === 'active' ? '✓ Активный' : 
                             file.status === 'replaced' ? '⟲ Заменен' : '✗ Удален'}
                          </span>
                        </td>
                        <td>
                          {file.status === 'active' && (
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleDeleteXmlFile(file.id)}
                            >
                              Удалить
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {xmlFiles.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#8e8e93' }}>
                  Нет загруженных файлов
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Модалка создания объекта */}
      {showObjectModal && (
        <div className="modal-overlay" onClick={() => setShowObjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Создать новый объект</h3>
            <div className="form-group">
              <label>Название объекта</label>
              <input
                type="text"
                value={newObjectName}
                onChange={(e) => setNewObjectName(e.target.value)}
                placeholder="Например: ЖК Новая Москва"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={handleCreateObject}>Создать</button>
              <button className="btn btn-secondary" onClick={() => setShowObjectModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка создания секции */}
      {showSectionModal && (
        <div className="modal-overlay" onClick={() => setShowSectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>Создать новую секцию</h3>
            <div className="form-group">
              <label>Номер секции</label>
              <input
                type="number"
                value={newSectionNumber}
                onChange={(e) => setNewSectionNumber(e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Название секции</label>
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Например: Секция 1"
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={handleCreateSection}>Создать</button>
              <button className="btn btn-secondary" onClick={() => setShowSectionModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
