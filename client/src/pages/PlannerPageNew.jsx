import { useState, useEffect } from 'react';
import { planner } from '../api';

export default function PlannerPageNew({ user }) {
  const [objects, setObjects] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [xmlFiles, setXmlFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    } else {
      setSections([]);
      setSelectedSection(null);
    }
  }, [selectedObject]);

  useEffect(() => {
    if (selectedSection) {
      loadXmlFiles(selectedSection.id);
    } else {
      setXmlFiles([]);
    }
  }, [selectedSection]);

  const loadObjects = async () => {
    try {
      setError(null);
      const response = await planner.getObjects();
      setObjects(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      setError('Не удалось загрузить объекты. Проверьте подключение к серверу.');
    }
  };

  const loadSections = async (objectId) => {
    try {
      const response = await planner.getObjectSections(objectId);
      setSections(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки секций:', error);
      alert('Ошибка загрузки секций');
    }
  };

  const loadXmlFiles = async (sectionId) => {
    try {
      const response = await planner.getSectionXmlFiles(sectionId);
      setXmlFiles(response.data || []);
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
      await planner.createObject({ name: newObjectName.trim(), userId: user.id });
      setNewObjectName('');
      setShowObjectModal(false);
      loadObjects();
    } catch (error) {
      console.error('Ошибка создания объекта:', error);
      alert(error.response?.data?.error || 'Ошибка создания объекта');
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
        sectionName: newSectionName.trim(),
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', user.id);

    setLoading(true);
    try {
      await planner.uploadSectionXml(selectedSection.id, formData);
      loadXmlFiles(selectedSection.id);
      e.target.value = '';
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      alert(error.response?.data?.error || 'Ошибка загрузки файла');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteObject = async (objectId) => {
    if (!confirm('Удалить объект и все его секции?')) return;

    try {
      await planner.deleteObject(objectId);
      setSelectedObject(null);
      loadObjects();
    } catch (error) {
      console.error('Ошибка удаления объекта:', error);
      alert('Ошибка удаления объекта');
    }
  };

  const handleDeleteSection = async (sectionId) => {
    if (!confirm('Удалить секцию и все её файлы?')) return;

    try {
      await planner.deleteSection(sectionId);
      setSelectedSection(null);
      loadSections(selectedObject.id);
    } catch (error) {
      console.error('Ошибка удаления секции:', error);
      alert('Ошибка удаления секции');
    }
  };

  const handleReplaceFile = async (fileId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      setLoading(true);
      try {
        await planner.uploadSectionXml(selectedSection.id, formData);
        loadXmlFiles(selectedSection.id);
      } catch (error) {
        alert('Ошибка замены файла');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Удалить файл?')) return;

    try {
      await planner.deleteSectionXmlFile(fileId);
      loadXmlFiles(selectedSection.id);
    } catch (error) {
      alert('Ошибка удаления файла');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem', fontWeight: '700', color: '#1c1c1e' }}>
          📋 Панель плановика
        </h2>

        {error && (
          <div style={{
            background: '#ff3b30',
            color: '#fff',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '320px 320px 1fr', 
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          
          {/* КОЛОНКА 1: ОБЪЕКТЫ */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🏗️ Объекты
                <span style={{ 
                  background: '#e5e5ea', 
                  color: '#1c1c1e',
                  borderRadius: '8px',
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {objects.length}
                </span>
              </h3>
              <button 
                className="btn btn-primary btn-small"
                onClick={() => setShowObjectModal(true)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  borderRadius: '10px'
                }}
              >
                + Добавить
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {objects.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem 1rem', 
                  color: '#8e8e93',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>🏗️</div>
                  Нет объектов.<br/>Создайте первый объект.
                </div>
              ) : (
                objects.map(obj => (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedObject(obj)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: selectedObject?.id === obj.id 
                        ? 'linear-gradient(135deg, #007aff, #5ac8fa)' 
                        : '#f9f9f9',
                      color: selectedObject?.id === obj.id ? '#fff' : '#1c1c1e',
                      transition: 'all 0.2s ease',
                      border: selectedObject?.id === obj.id ? '2px solid #007aff' : '2px solid transparent',
                      boxShadow: selectedObject?.id === obj.id 
                        ? '0 4px 12px rgba(0,122,255,0.3)' 
                        : '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>
                      {obj.name}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      opacity: 0.9,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>📦 Секций: {obj.sections_count || 0}</span>
                      {selectedObject?.id === obj.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteObject(obj.id);
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* КОЛОНКА 2: СЕКЦИИ */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📦 Секции
                {sections.length > 0 && (
                  <span style={{ 
                    background: '#e5e5ea', 
                    color: '#1c1c1e',
                    borderRadius: '8px',
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    {sections.length}
                  </span>
                )}
              </h3>
              {selectedObject && (
                <button 
                  className="btn btn-primary btn-small"
                  onClick={() => setShowSectionModal(true)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    borderRadius: '10px'
                  }}
                >
                  + Добавить
                </button>
              )}
            </div>

            {!selectedObject ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem', 
                color: '#8e8e93',
                fontSize: '0.9rem'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>👈</div>
                Выберите объект слева
              </div>
            ) : sections.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '2rem 1rem', 
                color: '#8e8e93',
                fontSize: '0.9rem'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: 0.3 }}>📦</div>
                Нет секций.<br/>Создайте первую секцию.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {sections.map(section => (
                  <div
                    key={section.id}
                    onClick={() => setSelectedSection(section)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: selectedSection?.id === section.id 
                        ? 'linear-gradient(135deg, #34c759, #30d158)' 
                        : '#f9f9f9',
                      color: selectedSection?.id === section.id ? '#fff' : '#1c1c1e',
                      transition: 'all 0.2s ease',
                      border: selectedSection?.id === section.id ? '2px solid #34c759' : '2px solid transparent',
                      boxShadow: selectedSection?.id === section.id 
                        ? '0 4px 12px rgba(52,199,89,0.3)' 
                        : '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '1rem' }}>
                      Секция {section.section_number}
                    </div>
                    <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                      {section.section_name}
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      opacity: 0.9,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>📄 Файлов: {section.active_files_count || 0}</span>
                      {selectedSection?.id === section.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(section.id);
                          }}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* КОЛОНКА 3: XML ФАЙЛЫ */}
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #f0f0f0'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📄 XML Файлы
                {xmlFiles.length > 0 && (
                  <span style={{ 
                    background: '#e5e5ea', 
                    color: '#1c1c1e',
                    borderRadius: '8px',
                    padding: '0.15rem 0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    {xmlFiles.length}
                  </span>
                )}
              </h3>
              {selectedSection && (
                <label 
                  className="btn btn-success btn-small"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? '⏳ Загрузка...' : '📤 Загрузить XML'}
                  <input
                    type="file"
                    accept=".xml"
                    onChange={handleFileUpload}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>

            {!selectedSection ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 1rem', 
                color: '#8e8e93',
                fontSize: '0.9rem'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '0.5rem', opacity: 0.3 }}>👈</div>
                Выберите секцию слева
              </div>
            ) : xmlFiles.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem 1rem', 
                color: '#8e8e93',
                fontSize: '0.9rem'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '0.5rem', opacity: 0.3 }}>📄</div>
                Нет файлов.<br/>Загрузите XML файл.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e5ea' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#8e8e93' }}>№</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#8e8e93' }}>Дата / Время</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#8e8e93' }}>Название файла</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#8e8e93' }}>Размер</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#8e8e93' }}>Кем добавлен</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#8e8e93' }}>Статус</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', fontSize: '0.9rem', color: '#8e8e93' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xmlFiles.map((file, index) => (
                      <tr 
                        key={file.id} 
                        style={{ 
                          borderBottom: '1px solid #f0f0f0',
                          background: file.status === 'active' ? 'rgba(52,199,89,0.05)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{index + 1}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{formatDateTime(file.uploaded_at)}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.9rem', fontWeight: '500' }}>{file.filename}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#8e8e93' }}>{formatFileSize(file.file_size)}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{file.uploaded_by_name || '-'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: file.status === 'active' ? '#34c759' : 
                                       file.status === 'replaced' ? '#ff9500' : '#ff3b30',
                            color: '#fff'
                          }}>
                            {file.status === 'active' ? '✓ Активен' : 
                             file.status === 'replaced' ? 'Заменён' : 'Удалён'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {file.status === 'active' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleReplaceFile(file.id)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.8rem',
                                  background: '#007aff',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                🔄 Заменить
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.8rem',
                                  background: '#ff3b30',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно: Создание объекта */}
      {showObjectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '600' }}>
              🏗️ Создать новый объект
            </h3>
            <div className="form-group">
              <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Название объекта</label>
              <input
                type="text"
                value={newObjectName}
                onChange={(e) => setNewObjectName(e.target.value)}
                placeholder="Например: ЖК Восход"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e5ea',
                  fontSize: '1rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateObject()}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleCreateObject}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', fontWeight: '600', borderRadius: '10px' }}
              >
                ✓ Создать
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowObjectModal(false);
                  setNewObjectName('');
                }}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', fontWeight: '600', borderRadius: '10px' }}
              >
                ✗ Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Создание секции */}
      {showSectionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: '600' }}>
              📦 Создать новую секцию
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Номер секции</label>
              <input
                type="number"
                value={newSectionNumber}
                onChange={(e) => setNewSectionNumber(e.target.value)}
                placeholder="1"
                min="1"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e5ea',
                  fontSize: '1rem'
                }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Название секции</label>
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="Например: Секция №1"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e5ea',
                  fontSize: '1rem'
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateSection()}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                className="btn btn-primary"
                onClick={handleCreateSection}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', fontWeight: '600', borderRadius: '10px' }}
              >
                ✓ Создать
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowSectionModal(false);
                  setNewSectionNumber('');
                  setNewSectionName('');
                }}
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', fontWeight: '600', borderRadius: '10px' }}
              >
                ✗ Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
