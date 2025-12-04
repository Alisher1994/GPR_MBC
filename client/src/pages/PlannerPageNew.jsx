import { useState, useEffect, useRef } from 'react';
import { planner } from '../api';
import Gantt from 'frappe-gantt';
import '../styles/frappe-gantt.css';
import TabIcon from '../components/TabIcon';

const plannerTabs = [{ id: 'gpr', label: 'ГПР', icon: 'grid' }];

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
  const [exporting, setExporting] = useState(null);
  const [showGanttModal, setShowGanttModal] = useState(false);
  const [ganttWorks, setGanttWorks] = useState([]);
  const [ganttLoading, setGanttLoading] = useState(false);
  const [ganttError, setGanttError] = useState(null);

  const ganttContainerRef = useRef(null);
  const ganttInstanceRef = useRef(null);

  const columnContainerStyle = {
    background: '#fff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 5.5rem)',
    overflow: 'hidden'
  };

  const headerRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.25rem',
    paddingBottom: '1rem',
    borderBottom: '2px solid #f0f0f0',
    gap: '1rem',
    flexWrap: 'wrap'
  };

  const listContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '0.25rem'
  };

  const emptyStateStyle = {
    textAlign: 'center',
    padding: '2rem 1rem',
    color: '#8e8e93',
    fontSize: '0.9rem',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const badgeStyle = {
    background: '#e5e5ea',
    color: '#1c1c1e',
    borderRadius: '8px',
    padding: '0.15rem 0.5rem',
    fontSize: '0.85rem',
    fontWeight: '600'
  };

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

  useEffect(() => {
    if (!showGanttModal) return () => {};
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showGanttModal]);

  useEffect(() => {
    if (!showGanttModal || ganttLoading || ganttWorks.length === 0 || !ganttContainerRef.current) {
      return;
    }

    const tasks = transformWorksToGanttTasks(ganttWorks);
    if (tasks.length === 0) {
      return;
    }

    ganttContainerRef.current.innerHTML = '';
    ganttInstanceRef.current = new Gantt(ganttContainerRef.current, tasks, {
      view_mode: 'Week',
      date_format: 'YYYY-MM-DD',
      bar_height: 26,
      padding: 18,
      language: 'ru',
      custom_popup_html: (task) => {
        const details = task.details || {};
        return `
          <div class="gantt-popup">
            <div class="gantt-popup__title">${task.name}</div>
            <div class="gantt-popup__row"><span>Тип:</span><span>${details.type || '-'} </span></div>
            <div class="gantt-popup__row"><span>Диапазон:</span><span>${details.dates || '-'} </span></div>
            <div class="gantt-popup__row"><span>Объем:</span><span>${details.completed || '-'} / ${details.total || '-'} </span></div>
            ${details.percent ? `<div class="gantt-popup__row"><span>Факт:</span><span>${details.percent}</span></div>` : ''}
          </div>
        `;
      }
    });
  }, [showGanttModal, ganttWorks, ganttLoading]);

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

  const handleShowGantt = async () => {
    if (!selectedSection) {
      alert('Выберите секцию для отображения графика');
      return;
    }
    setShowGanttModal(true);
    setGanttLoading(true);
    setGanttError(null);
    try {
      const response = await planner.getSectionWorks(selectedSection.id);
      setGanttWorks(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки данных для ганта:', error);
      setGanttError(error.response?.data?.error || 'Не удалось загрузить данные для диаграммы');
    } finally {
      setGanttLoading(false);
    }
  };

  const handleCloseGantt = () => {
    setShowGanttModal(false);
    setGanttWorks([]);
    setGanttError(null);
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
    formData.append('xmlFile', file);
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
      formData.append('xmlFile', file);
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
      await planner.deleteXmlFile(fileId);
      loadXmlFiles(selectedSection.id);
    } catch (error) {
      alert('Ошибка удаления файла');
    }
  };

  const downloadSectionExport = (blob, prefix) => {
    if (!blob) {
      return;
    }

    const sectionLabel = selectedSection
      ? `section-${selectedSection.section_number}`
      : 'section';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${prefix}-${sectionLabel}-${timestamp}.xml`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportSection = async (mode) => {
    if (!selectedSection) {
      alert('Выберите секцию для экспорта');
      return;
    }

    setExporting(mode);
    try {
      const request = mode === 'actual' ? planner.exportCompletedSection : planner.exportSection;
      const response = await request(selectedSection.id);
      downloadSectionExport(response.data, mode === 'actual' ? 'facts' : 'project');
    } catch (error) {
      console.error('Ошибка экспорта файла:', error);
      alert(error.response?.data?.error || 'Не удалось выгрузить XML');
    } finally {
      setExporting(null);
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

  const formatDateForGantt = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  };

  const calculateActualEndDate = (work, percent) => {
    const start = new Date(work.start_date);
    const end = new Date(work.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || percent <= 0) {
      return formatDateForGantt(work.start_date) || formatDateForGantt(new Date());
    }
    const duration = Math.max(end.getTime() - start.getTime(), 0);
    const minDuration = 24 * 60 * 60 * 1000;
    const actualDuration = Math.max(minDuration, duration * (percent / 100));
    const actualEnd = new Date(start.getTime() + actualDuration);
    return actualEnd.toISOString().split('T')[0];
  };

  const transformWorksToGanttTasks = (works) => {
    return works.flatMap((work) => {
      const start = formatDateForGantt(work.start_date) || formatDateForGantt(new Date());
      const end = formatDateForGantt(work.end_date) || start;
      const total = parseFloat(work.total_volume) || 0;
      const actual = parseFloat(work.actual_completed) || 0;
      const progress = total > 0 ? Math.min(100, Math.round((actual / total) * 100)) : 0;
      const planTask = {
        id: `plan-${work.id}`,
        name: `${work.work_type} · план` + (work.floor ? ` · ${work.floor}` : ''),
        start,
        end,
        progress: 100,
        custom_class: 'gantt-plan-bar',
        details: {
          type: 'План',
          total: `${total} ${work.unit}`,
          completed: `${actual} ${work.unit}`,
          dates: `${start} → ${end}`
        }
      };

      const actualTask = {
        id: `fact-${work.id}`,
        name: `${work.work_type} · факт` + (work.floor ? ` · ${work.floor}` : ''),
        start,
        end: calculateActualEndDate(work, progress),
        progress,
        custom_class: 'gantt-actual-bar',
        details: {
          type: 'Факт',
          total: `${total} ${work.unit}`,
          completed: `${actual} ${work.unit}`,
          dates: `${start} → ${end}`,
          percent: `${progress}%`
        }
      };

      return [planTask, actualTask];
    });
  };

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div className="page-tabs">
          {plannerTabs.map((tab) => (
            <button key={tab.id} className="page-tabs__button page-tabs__button--active" type="button">
              {tab.icon && (
                <span className="page-tabs__icon">
                  <TabIcon name={tab.icon} size={18} />
                </span>
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div style={{
            background: '#ff3b30',
            color: '#fff',
            padding: '1rem',
            borderRadius: '12px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '320px 320px 1fr', 
          gap: '1.5rem',
          alignItems: 'stretch',
          height: 'calc(100vh - 4rem)'
        }}>
          
          {/* КОЛОНКА 1: ОБЪЕКТЫ */}
          <div style={{ ...columnContainerStyle }}>
            <div style={headerRowStyle}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Объекты
                <span style={badgeStyle}>
                  {objects.length}
                </span>
                <button 
                  onClick={() => setShowObjectModal(true)}
                  style={{
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
                  }}
                >
                  +
                </button>
              </h3>
            </div>

            <div style={listContainerStyle}>
              {objects.length === 0 ? (
                <div style={emptyStateStyle}>
                  <strong style={{ fontSize: '1rem' }}>Нет объектов</strong>
                  <span>Создайте первый объект.</span>
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
                        : '0 2px 4px rgba(0,0,0,0.05)',
                      minHeight: '88px'
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
                      <span>Секций: {obj.sections_count || 0}</span>
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
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* КОЛОНКА 2: СЕКЦИИ */}
          <div style={{ ...columnContainerStyle }}>
            <div style={headerRowStyle}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Секции
                {sections.length > 0 && (
                  <span style={badgeStyle}>{sections.length}</span>
                )}
                {selectedObject && (
                  <button 
                    onClick={() => setShowSectionModal(true)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: 'none',
                      background: 'transparent',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      cursor: 'pointer',
                      fontSize: '1.25rem',
                      fontWeight: '300',
                      color: '#34c759',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    +
                  </button>
                )}
              </h3>
            </div>

            {!selectedObject ? (
              <div style={emptyStateStyle}>
                <strong style={{ fontSize: '1rem' }}>Выберите объект слева</strong>
              </div>
            ) : sections.length === 0 ? (
              <div style={emptyStateStyle}>
                <strong style={{ fontSize: '1rem' }}>Нет секций</strong>
                <span>Создайте первую секцию.</span>
              </div>
            ) : (
              <div style={listContainerStyle}>
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
                        : '0 2px 4px rgba(0,0,0,0.05)',
                      minHeight: '88px'
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
                      <span>Файлов: {section.active_files_count || 0}</span>
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
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* КОЛОНКА 3: XML ФАЙЛЫ */}
          <div style={{ ...columnContainerStyle }}>
            <div style={headerRowStyle}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                XML файлы
                {xmlFiles.length > 0 && (
                  <span style={badgeStyle}>{xmlFiles.length}</span>
                )}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {selectedSection && (
                  <>
                    {/* Кнопка 1: Загрузить XML из ПК */}
                    <label 
                      title="Загрузить XML из ПК"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ff9500'
                      }}
                    >
                      <TabIcon name="folder" size={18} />
                      <input
                        type="file"
                        accept=".xml"
                        onChange={handleFileUpload}
                        disabled={loading}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {/* Кнопка 2: График */}
                    <button
                      onClick={handleShowGantt}
                      disabled={ganttLoading}
                      title="Диаграмма Ганта"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: ganttLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#5856d6'
                      }}
                    >
                      <TabIcon name="chart" size={18} />
                    </button>
                    {/* Кнопка 3: Выгрузить проект */}
                    <button
                      onClick={() => handleExportSection('full')}
                      disabled={exporting !== null}
                      title="Выгрузить проект"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: exporting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#007aff'
                      }}
                    >
                      <TabIcon name="download" size={18} />
                    </button>
                    {/* Кнопка 4: Выгрузить факты */}
                    <button
                      onClick={() => handleExportSection('actual')}
                      disabled={exporting !== null}
                      title="Выгрузить факты"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        background: 'transparent',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        cursor: exporting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#34c759'
                      }}
                    >
                      <TabIcon name="check" size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {!selectedSection ? (
                <div style={emptyStateStyle}>
                  <strong style={{ fontSize: '1rem' }}>Выберите секцию слева</strong>
                </div>
              ) : xmlFiles.length === 0 ? (
                <div style={emptyStateStyle}>
                  <strong style={{ fontSize: '1rem' }}>Нет файлов</strong>
                  <span>Загрузите актуальный XML.</span>
                </div>
              ) : (
                <div style={listContainerStyle}>
                  {xmlFiles.map((file, index) => {
                    const isActive = file.status === 'active';
                    return (
                      <div
                        key={file.id}
                        style={{
                          padding: '1rem',
                          borderRadius: '12px',
                          background: isActive ? '#f9f9f9' : '#e8e8e8',
                          color: isActive ? '#1c1c1e' : '#999',
                          border: isActive ? '2px solid transparent' : '2px solid #d0d0d0',
                          boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                          minHeight: '88px',
                          opacity: isActive ? 1 : 0.7
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <div style={{ fontWeight: '600', fontSize: '1rem', color: isActive ? '#1c1c1e' : '#888' }}>
                            {file.filename}
                          </div>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            background: isActive ? '#34c759' : '#aaa',
                            color: '#fff'
                          }}>
                            {isActive ? 'Активен' : file.status === 'replaced' ? 'Заменён' : 'Удалён'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: '0.5rem', color: isActive ? '#1c1c1e' : '#999' }}>
                          {formatDateTime(file.uploaded_at)} • {formatFileSize(file.file_size)} • {file.uploaded_by_name || '-'}
                        </div>
                        {isActive && (
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              onClick={() => handleReplaceFile(file.id)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                background: '#007aff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Заменить
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                background: '#ff3b30',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showGanttModal && (
        <div className="modal-overlay gantt-modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content gantt-modal-content">
            <div className="gantt-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>График секции {selectedSection ? selectedSection.section_number : ''}</h3>
                {selectedObject && selectedSection && (
                  <p style={{ margin: '0.25rem 0 0 0', color: '#8e8e93', fontSize: '0.9rem' }}>
                    {selectedObject.name} · {selectedSection.section_name}
                  </p>
                )}
              </div>
              <button className="gantt-modal-close" onClick={handleCloseGantt}>
                ✕
              </button>
            </div>

            <div className="gantt-modal-body">
              {ganttLoading ? (
                <div className="gantt-modal-state">Загрузка графика...</div>
              ) : ganttError ? (
                <div className="gantt-modal-state" style={{ background: '#ffe3e3', color: '#c62828', borderRadius: '12px' }}>
                  {ganttError}
                </div>
              ) : ganttWorks.length === 0 ? (
                <div className="gantt-modal-state">
                  Нет работ для построения графика. Загрузите XML и распределите задания.
                </div>
              ) : (
                <div className="gantt-modal-scroll">
                  <div className="gantt-modal-legend">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#d8f3dc', border: '1px solid #9dd9b5' }}></span>
                      <span style={{ fontSize: '0.85rem', color: '#525252' }}>План</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#1f6f4d' }}></span>
                      <span style={{ fontSize: '0.85rem', color: '#525252' }}>Факт</span>
                    </div>
                  </div>
                  <div className="gantt-chart-container gantt-modal-chart" ref={ganttContainerRef}></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              Создать новый объект
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
              Создать новую секцию
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
