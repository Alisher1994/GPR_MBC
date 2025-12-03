import xml2js from 'xml2js';
import fs from 'fs/promises';

/**
 * Парсит XML файл из Primavera P6 и возвращает структурированные данные
 */
export async function parseXMLFile(filePath) {
  try {
    const xmlData = await fs.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xmlData);

    const projectData = result.ProjectData;
    const object = projectData.Object;
    
    const workItems = [];
    const objectName = object.$.Name;

    // Парсим структуру: Object → Stage → Block → Floor → WorkType
    const stages = Array.isArray(object.Stage) ? object.Stage : [object.Stage];

    for (const stage of stages) {
      if (!stage) continue;
      const stageName = stage.$.Name;
      const blocks = Array.isArray(stage.Block) ? stage.Block : [stage.Block];

      for (const block of blocks) {
        if (!block) continue;
        const blockName = block.$.Name;
        const floors = Array.isArray(block.Floor) ? block.Floor : [block.Floor];

        for (const floor of floors) {
          if (!floor) continue;
          const floorName = floor.$.Name;
          const workTypes = Array.isArray(floor.WorkType) ? floor.WorkType : [floor.WorkType];

          for (const workType of workTypes) {
            if (!workType || !workType.$) continue;

            const startDate = new Date(workType.$.StartDate);
            const endDate = new Date(workType.$.EndDate);
            const totalVolume = parseFloat(workType.$.TotalVolume);
            // Всегда начинаем с нуля, игнорируем CompletedVolume из XML
            const completedVolume = 0;
            
            // Вычисляем дневную норму
            const workDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
            const dailyTarget = totalVolume / workDays;

            workItems.push({
              stage: stageName,
              block: blockName,
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

    return {
      objectName,
      workItems
    };
  } catch (error) {
    console.error('Ошибка парсинга XML:', error);
    throw new Error('Не удалось распарсить XML файл');
  }
}

/**
 * Генерирует XML файл для экспорта обратно в Primavera
 */
export async function generateXMLFromData(objectName, workItems) {
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });

  // Группируем данные по структуре
  const grouped = {};
  
  for (const item of workItems) {
    if (!grouped[item.stage]) grouped[item.stage] = {};
    if (!grouped[item.stage][item.block]) grouped[item.stage][item.block] = {};
    if (!grouped[item.stage][item.block][item.floor]) grouped[item.stage][item.block][item.floor] = [];
    
    const startDate = item.start_date instanceof Date ? item.start_date : new Date(item.start_date);
    const endDate = item.end_date instanceof Date ? item.end_date : new Date(item.end_date);
    
    grouped[item.stage][item.block][item.floor].push({
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

  // Строим структуру XML
  const stages = [];
  for (const [stageName, blocks] of Object.entries(grouped)) {
    const blockArray = [];
    for (const [blockName, floors] of Object.entries(blocks)) {
      const floorArray = [];
      for (const [floorName, works] of Object.entries(floors)) {
        floorArray.push({
          $: { Name: floorName },
          WorkType: works
        });
      }
      blockArray.push({
        $: { Name: blockName },
        Floor: floorArray
      });
    }
    stages.push({
      $: { Name: stageName },
      Block: blockArray
    });
  }

  const xmlObject = {
    ProjectData: {
      Object: {
        $: { Name: objectName },
        Stage: stages
      }
    }
  };

  return builder.buildObject(xmlObject);
}

/**
 * Генерирует XML файл только с выполненными объемами для Primavera
 */
export async function generateCompletedWorksXML(objectName, workItems) {
  const builder = new xml2js.Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' }
  });

  // Фильтруем только работы с выполненными объемами
  const completedItems = workItems.filter(item => parseFloat(item.completed_volume || 0) > 0);

  if (completedItems.length === 0) {
    throw new Error('Нет выполненных работ для экспорта');
  }

  // Группируем данные по структуре
  const grouped = {};
  
  for (const item of completedItems) {
    if (!grouped[item.stage]) grouped[item.stage] = {};
    if (!grouped[item.stage][item.block]) grouped[item.stage][item.block] = {};
    if (!grouped[item.stage][item.block][item.floor]) grouped[item.stage][item.block][item.floor] = [];
    
    const startDate = item.start_date instanceof Date ? item.start_date : new Date(item.start_date);
    const endDate = item.end_date instanceof Date ? item.end_date : new Date(item.end_date);
    
    grouped[item.stage][item.block][item.floor].push({
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

  // Строим структуру XML
  const stages = [];
  for (const [stageName, blocks] of Object.entries(grouped)) {
    const blockArray = [];
    for (const [blockName, floors] of Object.entries(blocks)) {
      const floorArray = [];
      for (const [floorName, works] of Object.entries(floors)) {
        floorArray.push({
          $: { Name: floorName },
          WorkType: works
        });
      }
      blockArray.push({
        $: { Name: blockName },
        Floor: floorArray
      });
    }
    stages.push({
      $: { Name: stageName },
      Block: blockArray
    });
  }

  const xmlObject = {
    ProjectData: {
      Object: {
        $: { Name: objectName },
        Stage: stages
      }
    }
  };

  return builder.buildObject(xmlObject);
}
