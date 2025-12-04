import xml2js from 'xml2js';
import fs from 'fs/promises';

/**
 * Парсит XML файл из Primavera P6 и возвращает только этажи и виды работ
 * Object и Section создаются вручную в UI, поэтому парсим только Floor → WorkType
 * Поддерживает оба формата: Stage (Primavera) и Queue (экспорт из системы)
 */
export async function parseXMLFile(filePath) {
  try {
    const xmlData = await fs.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);

    const projectData = result.ProjectData;
    const object = projectData.Object;
    
    const workItems = [];

    // Парсим структуру: Object → Stage/Queue → Section → Floor → WorkType
    // Поддерживаем оба тега: Stage (из Primavera) и Queue (из нашего экспорта)
    const queues = object.Stage || object.Queue;
    const queueArray = Array.isArray(queues) ? queues : [queues];

    for (const queue of queueArray) {
      if (!queue) continue;
      const sections = Array.isArray(queue.Section) ? queue.Section : [queue.Section];

      for (const section of sections) {
        if (!section) continue;
        const floors = Array.isArray(section.Floor) ? section.Floor : [section.Floor];

        for (const floor of floors) {
          if (!floor) continue;
          const floorName = floor.$ ? floor.$.Name : floor.Name;
          const workTypes = Array.isArray(floor.WorkType) ? floor.WorkType : [floor.WorkType];

          for (const workType of workTypes) {
            if (!workType || !workType.$) continue;

            const startDate = new Date(workType.$.StartDate);
            const endDate = new Date(workType.$.EndDate);
            const totalVolume = parseFloat(workType.$.TotalVolume);
            const completedVolume = 0; // Всегда начинаем с нуля
            
            // Вычисляем дневную норму
            const workDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
            const dailyTarget = totalVolume / workDays;

            workItems.push({
              floor: floorName,
              workType: workType.$.Name,
              startDate: workType.$.StartDate,
              endDate: workType.$.EndDate,
              totalVolume,
              completedVolume,
              unit: workType.$.Unit,
              dailyTarget: parseFloat(dailyTarget.toFixed(2))
            });
          }
        }
      }
    }

    return workItems;
  } catch (error) {
    console.error('Ошибка парсинга XML:', error);
    throw new Error('Не удалось распарсить XML файл');
  }
}

/**
 * Генерирует XML файл для экспорта обратно в Primavera
 * sectionInfo содержит: object_name, queue_name, queue_number, section_name, section_number
 */
export async function generateXMLFromData(sectionInfo, workItems) {
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });

  // Группируем данные по этажам
  const floorGroups = {};
  
  for (const item of workItems) {
    const floorName = item.floor || 'Floor';

    if (!floorGroups[floorName]) floorGroups[floorName] = [];
    
    const startDate = item.start_date instanceof Date ? item.start_date : new Date(item.start_date);
    const endDate = item.end_date instanceof Date ? item.end_date : new Date(item.end_date);
    
    floorGroups[floorName].push({
      $: {
        Name: item.work_type,
        StartDate: startDate.toISOString().split('T')[0],
        EndDate: endDate.toISOString().split('T')[0],
        TotalVolume: parseFloat(item.total_volume).toFixed(2),
        CompletedVolume: parseFloat(item.completed_volume || 0).toFixed(2),
        Unit: item.unit
      }
    });
  }

  // Строим структуру XML с учетом очереди
  const floors = [];
  for (const [floorName, works] of Object.entries(floorGroups)) {
    floors.push({
      $: { Name: floorName },
      WorkType: works
    });
  }

  const xmlObject = {
    ProjectData: {
      Object: {
        $: { 
          Name: sectionInfo.object_name,
          StartDate: new Date().toISOString().split('T')[0],
          EndDate: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
        },
        Queue: {
          $: { 
            Name: sectionInfo.queue_name || `${sectionInfo.queue_number || 1} очередь`,
            Number: sectionInfo.queue_number || 1
          },
          Section: {
            $: { 
              Name: sectionInfo.section_name,
              Number: sectionInfo.section_number || 1
            },
            Floor: floors
          }
        }
      }
    }
  };

  return builder.buildObject(xmlObject);
}

/**
 * Генерирует XML файл только с выполненными объемами для Primavera
 * sectionInfo содержит: object_name, queue_name, queue_number, section_name, section_number
 */
export async function generateCompletedWorksXML(sectionInfo, workItems) {
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });

  // Фильтруем только работы с выполненными объемами
  const completedItems = workItems.filter(item => parseFloat(item.completed_volume || 0) > 0);

  if (completedItems.length === 0) {
    throw new Error('Нет выполненных работ для экспорта');
  }

  // Группируем данные по этажам
  const floorGroups = {};
  
  for (const item of completedItems) {
    const floorName = item.floor || 'Floor';

    if (!floorGroups[floorName]) floorGroups[floorName] = [];
    
    const startDate = item.start_date instanceof Date ? item.start_date : new Date(item.start_date);
    const endDate = item.end_date instanceof Date ? item.end_date : new Date(item.end_date);
    
    floorGroups[floorName].push({
      $: {
        Name: item.work_type,
        StartDate: startDate.toISOString().split('T')[0],
        EndDate: endDate.toISOString().split('T')[0],
        TotalVolume: parseFloat(item.total_volume).toFixed(2),
        CompletedVolume: parseFloat(item.completed_volume).toFixed(2),
        Unit: item.unit
      }
    });
  }

  // Строим структуру XML с учетом очереди
  const floors = [];
  for (const [floorName, works] of Object.entries(floorGroups)) {
    floors.push({
      $: { Name: floorName },
      WorkType: works
    });
  }

  const xmlObject = {
    ProjectData: {
      Object: {
        $: { 
          Name: sectionInfo.object_name,
          ExportDate: new Date().toISOString().split('T')[0]
        },
        Queue: {
          $: { 
            Name: sectionInfo.queue_name || `${sectionInfo.queue_number || 1} очередь`,
            Number: sectionInfo.queue_number || 1
          },
          Section: {
            $: { 
              Name: sectionInfo.section_name,
              Number: sectionInfo.section_number || 1
            },
            Floor: floors
          }
        }
      }
    }
  };

  return builder.buildObject(xmlObject);
}
