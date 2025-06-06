import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function App() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const [image, setImage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [color, setColor] = useState('#ff0000');
  const [selectedLog, setSelectedLog] = useState(null);
  const [boardMarks, setBoardMarks] = useState([]);
  const [markerSize, setMarkerSize] = useState(isMobile ? 40 : 20); // Увеличиваем размер для мобильных устройств
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorPreviewRef = useRef(null);
  const [documentNumber, setDocumentNumber] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const canvasContainerRef = useRef(null);
  const [isClick, setIsClick] = useState(true); // Флаг для определения клика
  const clickTimerRef = useRef(null); // Таймер для отслеживания длительности нажатия
  const [initialDistance, setInitialDistance] = useState(null);
  const dynamicMarkerSize = markerSize * zoomLevel * (isMobile ? 2 : 1); // Увеличиваем в 2 раза на мобильных устройствах

  // 10 стандартных цветов
  const standardColors = [
    '#ff0000', // красный
    '#00ff00', // зеленый
    '#0000ff', // синий
    '#ffff00', // желтый
    '#ff00ff', // пурпурный
    '#00ffff', // голубой
    '#ff9900', // оранжевый
    '#9900ff', // фиолетовый
    '#009900', // темно-зеленый
    '#000000'  // черный
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
        setBoardMarks([]);
        setZoomLevel(1);
        setCanvasOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Обработчики для масштабирования и перемещения
  const handleWheel = (e) => {
  if (!image) return;
  
  // Проверяем, можно ли вызвать preventDefault
  if (e.cancelable) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const container = canvasContainerRef.current;
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const imgX = (mouseX - canvasOffset.x) / zoomLevel;
  const imgY = (mouseY - canvasOffset.y) / zoomLevel;

  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = Math.max(0.5, Math.min(3, zoomLevel * delta));

  const newOffsetX = mouseX - imgX * newZoom;
  const newOffsetY = mouseY - imgY * newZoom;

  setZoomLevel(newZoom);
  setCanvasOffset({ x: newOffsetX, y: newOffsetY });
};

const handleMouseEnter = () => {
  setIsHovered(true);
  document.body.style.overflow = 'hidden';
};

const handleTouchStart = (e) => {
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - canvasOffset.x,
      y: touch.clientY - canvasOffset.y,
    });
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    setInitialDistance(dist);
  }
};

const handleTouchMove = (e) => {
  if (!isDragging) return;

  if (e.touches.length === 1) {
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;

    setCanvasOffset({
      x: dx,
      y: dy,
    });
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    if (initialDistance !== null) {
      const scale = dist / initialDistance;
      const newZoom = Math.max(0.5, Math.min(3, zoomLevel * (1 + (scale - 1) * 0.1))); // Плавный зум
      setZoomLevel(newZoom);
    }
  }
};

const handleTouchEnd = () => {
  setIsDragging(false);
  setInitialDistance(null);
};
const handleMouseLeave = () => {
  setIsHovered(false);
  setIsDragging(false);
  document.body.style.overflow = '';
};
const handleMouseDown = (e) => {
  if (e.button === 0) { // Левая кнопка мыши
    // Проверяем, можно ли вызвать preventDefault
    if (e.cancelable) {
      e.preventDefault();
    }

    // Устанавливаем таймер для отслеживания длительности нажатия
    clickTimerRef.current = setTimeout(() => {
      setIsClick(false); // Если таймер истек, это не клик
      setIsDragging(true);
      setDragStart({
        x: e.clientX - canvasOffset.x,
        y: e.clientY - canvasOffset.y
      });
    }, 150); // Порог для определения долгого нажатия (150 мс)
  }
};
  const handleLogSelect = (log) => {
    if (selectedLog?.id === log.id) {
        // Если кликаем на уже выбранное бревно - снимаем выбор
        setSelectedLog(null);
        setIsColorPickerActive(false);
    } else {
        // Выбираем новое бревно
        setSelectedLog(log);
        setIsColorPickerActive(true);
    }
};
  const handleMouseMove = (e) => {
  if (!isDragging) return;

  // Проверяем, можно ли вызвать preventDefault
  if (e.cancelable) {
    e.preventDefault();
  }

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  setCanvasOffset({
    x: dx,
    y: dy
  });
};

   const handleMouseUp = () => {
  if (clickTimerRef.current) {
    clearTimeout(clickTimerRef.current); // Очищаем таймер
  }

  if (isDragging) {
    setIsDragging(false);
    setIsClick(false); // Если было перетаскивание, не считаем это кликом
  } else {
    setIsClick(true); // Если не было перетаскивания, это клик
  }
};

  const resetZoomAndPan = () => {
    setZoomLevel(1);
    setCanvasOffset({ x: 0, y: 0 });
  };
  const addLog = () => {
    if (width && height) {
      const newLog = {
        id: Date.now(),
        width: parseFloat(width),
        height: parseFloat(height),
        color,
        nextMarkId: 1
      };
      setLogs([...logs, newLog]);
      setWidth('');
      setHeight('');
    }
  };

  const deleteLog = (id) => {
    setLogs(logs.filter(log => log.id !== id));
    setBoardMarks(boardMarks.filter(mark => mark.logId !== id));
  };
  
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

const handleCanvasClick = (e) => {
  if (!image || !isClick || isDragging) return;

  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();

  // Получаем координаты касания
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    // Для мобильных устройств
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    // Для десктопов
    clientX = e.clientX;
    clientY = e.clientY;
  }

  if (!clientX || !clientY) return;

  // Корректный расчет координат с учетом масштаба и смещения
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = ((clientX - rect.left) * scaleX - canvasOffset.x) / zoomLevel;
  const y = ((clientY - rect.top) * scaleY - canvasOffset.y) / zoomLevel;

  // Проверяем, не кликнули ли мы по существующей метке
  const clickedMark = boardMarks.find(mark => {
    const distance = Math.sqrt((mark.x - x) ** 2 + (mark.y - y) ** 2);
    return distance <= dynamicMarkerSize;
  });

  if (clickedMark) {
    // Удаление метки и перенумерация
    const updatedMarks = boardMarks.filter(mark => mark.id !== clickedMark.id);

    const marksForLog = updatedMarks
      .filter(mark => mark.logId === clickedMark.logId)
      .sort((a, b) => a.number - b.number);

    const renumberedMarks = updatedMarks.map(mark => {
      if (mark.logId === clickedMark.logId) {
        const newNumber = marksForLog.findIndex(m => m.id === mark.id) + 1;
        return { ...mark, number: newNumber };
      }
      return mark;
    });

    const maxNumber = renumberedMarks
      .filter(mark => mark.logId === clickedMark.logId)
      .reduce((max, mark) => Math.max(max, mark.number), 0);

    setLogs(logs.map(log =>
      log.id === clickedMark.logId
        ? { ...log, nextMarkId: maxNumber + 1 }
        : log
    ));

    setBoardMarks(renumberedMarks);
    return;
  }

  if (selectedLog) {
    const nextNumber = logs.find(log => log.id === selectedLog.id).nextMarkId;

    const newMark = {
      id: Date.now(),
      x,
      y,
      logId: selectedLog.id,
      color: selectedLog.color,
      number: nextNumber,
      size: dynamicMarkerSize,
    };

    setLogs(logs.map(log =>
      log.id === selectedLog.id
        ? { ...log, nextMarkId: nextNumber + 1 }
        : log
    ));

    setBoardMarks([...boardMarks, newMark]);
  }
};





  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvasOffset.x, canvasOffset.y);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.drawImage(img, 0, 0);
      
      boardMarks.forEach(mark => {
        const log = logs.find(l => l.id === mark.logId);
        if (log) {
          drawMark(ctx, mark.x, mark.y, log.color, mark.number);
        }
      });
      ctx.restore();
    };
    
    img.src = image;
    imgRef.current = img;
  }, [image, boardMarks, logs, markerSize, zoomLevel, canvasOffset]);

  const drawMark = (ctx, x, y, color, number) => {
    ctx.beginPath();
    ctx.arc(x, y, dynamicMarkerSize, 0, 2 * Math.PI); // Используем dynamicMarkerSize
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${dynamicMarkerSize * 0.8}px Arial`; // Динамический размер текста
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), x, y);
  };

  const getBoardSummary = () => {
    const summary = {};
    
    boardMarks.forEach(mark => {
      const log = logs.find(l => l.id === mark.logId);
      if (log) {
        const key = `${log.width}x${log.height}`;
        summary[key] = (summary[key] || 0) + 1;
      }
    });
    
    return summary;
  };

  const getTotalCount = () => {
    return boardMarks.length;
  };

 const exportToExcel = async () => {
    try {
      if (!documentNumber) {
        alert('Пожалуйста, введите номер документа');
        return;
      }
      // Проверка на мобильное устройство
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        const confirmExport = window.confirm('Подготовить файл для скачивания?');
        if (!confirmExport) return;
      }
      // Формируем имя файла
      const currentDate = formatDate(new Date());
      const fileName = `Учет досок ${documentNumber} от ${currentDate}.xlsx`;

      // Создаем новую книгу Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Учет досок');
      
      // Добавляем номер документа и дату в первую строку
      worksheet.getCell('A1').value = `Документ №: ${documentNumber}`;
      worksheet.getCell('A2').value = `Дата: ${currentDate}`;
      
      // Добавляем изображение (если есть)
      if (canvasRef.current && image) {
        const canvas = canvasRef.current;
        const imageId = workbook.addImage({
          base64: canvas.toDataURL('image/png'),
          extension: 'png'
        });
        
        worksheet.addImage(imageId, {
          tl: { col: 1, row: 3 }, // Начинаем с 3 строки (после заголовка)
          ext: { width: 500, height: 300 }
        });
      }
      
      // Определяем стартовую строку для таблицы (после изображения)
      const tableStartRow = image ? 25 : 4;
      
      // Заголовки таблицы
      worksheet.getCell(`A${tableStartRow}`).value = '№';
      worksheet.getCell(`B${tableStartRow}`).value = 'Размер доски (см)';
      worksheet.getCell(`C${tableStartRow}`).value = 'Количество';
      worksheet.getCell(`D${tableStartRow}`).value = 'Цвет';
      
      // Данные таблицы
      const summary = getBoardSummary();
      Object.entries(summary).forEach(([size, count], index) => {
        const log = logs.find(l => `${l.width}x${l.height}` === size);
        const row = tableStartRow + index + 1;
        
        worksheet.getCell(`A${row}`).value = index + 1;
        worksheet.getCell(`B${row}`).value = size;
        worksheet.getCell(`C${row}`).value = count;
        worksheet.getCell(`D${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: log?.color.replace('#', '') || '000000' }
        };
      });
      
      // Итоговая строка
      const totalRow = tableStartRow + Object.keys(summary).length + 1;
      worksheet.getCell(`B${totalRow}`).value = 'Всего досок';
      worksheet.getCell(`C${totalRow}`).value = getTotalCount();
      
      // Стилизация
      worksheet.columns = [
        { key: 'number', width: 5 },
        { key: 'size', width: 15 },
        { key: 'count', width: 12 },
        { key: 'color', width: 10 }
      ];
      
      // Сохраняем файл
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), fileName);
      
    } catch (error) {
      console.error('Ошибка при экспорте:', error);
      alert('Произошла ошибка при экспорте данных');
    }
  };
  useEffect(() => {
  return () => {
      document.body.style.overflow = ''; // Убедимся, что скролл восстановится
    };
  }, []);
  return (
    <Container className="my-4">
      <h1 className="text-center mb-4">Учет досок на фотографии</h1>
      
      <Row className="mb-4">
        <Col md={6}>
          {/* Левая колонка с формами */}
          <Form.Group controlId="formImage" className="mb-3">
            <Form.Label>Загрузите фотографию с досками</Form.Label>
            <Form.Control 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              ref={fileInputRef}
            />
          </Form.Group>
          
          <div className="border p-3 mb-3">
            <h4>Добавить бревно</h4>
            <Row className="g-2">
              <Col sm={5}>
                <Form.Group controlId="formWidth" className="mb-3">
                  <Form.Label>Ширина (мм)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={width} 
                    onChange={(e) => setWidth(e.target.value)} 
                  />
                </Form.Group>
              </Col>
              <Col sm={5}>
                <Form.Group controlId="formHeight" className="mb-3">
                  <Form.Label>Высота (мм)</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={height} 
                    onChange={(e) => setHeight(e.target.value)} 
                  />
                </Form.Group>
              </Col>
              <Col sm={2} className="d-flex align-items-end mb-3">
                <Button 
                  variant="primary" 
                  onClick={addLog} 
                  disabled={!width || !height}
                  className="w-100"
                >
                  Добавить
                </Button>
              </Col>
            </Row>
            
            <Form.Group controlId="formColor" className="mb-3">
              <Form.Label>Цвет маркера</Form.Label>
              <div className="d-flex align-items-center mb-2">
                <div 
                  ref={colorPreviewRef}
                  style={{
                    width: '30px', 
                    height: '30px', 
                    backgroundColor: color,
                    border: '1px solid #ced4da',
                    marginRight: '10px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowColorPalette(!showColorPalette)}
                />
              </div>
              
              {/* Добавляем стандартные цвета */}
              <div className="d-flex flex-wrap mb-2">
                {standardColors.map((stdColor) => (
                  <div
                    key={stdColor}
                    style={{
                      width: '25px',
                      height: '25px',
                      backgroundColor: stdColor,
                      margin: '2px',
                      cursor: 'pointer',
                      border: color === stdColor ? '2px solid #000' : '1px solid #ddd'
                    }}
                    onClick={() => setColor(stdColor)}
                    title={stdColor}
                  />
                ))}
              </div>
              
              {/* Добавляем кастомный выбор цвета */}
              {showColorPalette && (
                <Form.Control
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="mb-2"
                />
              )}
            </Form.Group>

            <Form.Group controlId="formMarkerSize" className="mb-3">
              <Form.Label>Размер маркера: {markerSize}px</Form.Label>
              <Form.Range 
                min="10" 
                max="50" 
                value={markerSize} 
                onChange={(e) => setMarkerSize(parseInt(e.target.value))}
              />
            </Form.Group>
          </div>
          
          <div className="border p-3 mb-3">
            <h4>Список бревен</h4>
            {logs.length === 0 ? (
              <Alert variant="info">Нет добавленных бревен</Alert>
            ) : (
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Ширина (см)</th>
                    <th>Длина (см)</th>
                    <th>Цвет</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr 
                      key={log.id} 
                      className={selectedLog?.id === log.id ? 'table-primary' : ''}
                      onClick={() => handleLogSelect(log)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>{log.width}</td>
                      <td>{log.height}</td>
                      <td>
                        <div 
                          style={{
                            width: '20px', 
                            height: '20px', 
                            backgroundColor: log.color,
                            display: 'inline-block',
                            marginRight: '10px'
                          }}
                        />
                      </td>
                      <td>
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLog(log.id);
                          }}
                        >
                          Удалить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>

          <div className="border p-3 mb-3">
            <h4>Экспорт в Excel</h4>
            <Form.Group controlId="formDocNumber" className="mb-3">
              <Form.Label>Номер документа</Form.Label>
              <Form.Control 
                type="text" 
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Введите номер документа"
              />
            </Form.Group>
            
            <Button 
              variant="success" 
              onClick={exportToExcel}
              disabled={boardMarks.length === 0 || !documentNumber}
              className="w-100"
            >
              Экспорт в Excel
            </Button>
          </div>
        </Col>
        
        <Col md={6}>
          {image ? (
            <>
              <div className="position-relative">
                <div 
                  ref={canvasContainerRef}
                  className='canvas-container'
                  style={{ 
                    overflow: 'hidden',
                    border: '1px solid #ddd',
                    height: '500px',
                    cursor: isDragging ? 'grabbing' : selectedLog ? 'crosshair' : 'grab',
                    touchAction: 'none'
                  }}
                  
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    onTouchEnd={handleCanvasClick}
                    style={{ 
                      transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoomLevel})`,
                      transformOrigin: '0 0'
                    }}
                  />
                </div>
                <div className="mt-2 d-flex justify-content-between">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={resetZoomAndPan}
                    disabled={zoomLevel === 1 && canvasOffset.x === 0 && canvasOffset.y === 0}
                  >
                    Сбросить масштаб
                  </Button>
                  <div>
                    Масштаб: {Math.round(zoomLevel * 100)}%
                  </div>
                </div>
              </div>

              {/* Добавляем блок со статистикой */}
              <div className="border p-3 mt-3">
                <h4>Статистика по бревнам</h4>
                {boardMarks.length === 0 ? (
                  <Alert variant="info" className="mb-0">Нет размеченных бревен</Alert>
                ) : (
                  <>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Размер</th>
                          <th>Цвет</th>
                          <th>Количество</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map(log => {
                          const count = boardMarks.filter(mark => mark.logId === log.id).length;
                          if (count === 0) return null;
                          
                          return (
                            <tr key={log.id}>
                              <td>{log.width}x{log.height} см</td>
                              <td>
                                <div 
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    backgroundColor: log.color,
                                    display: 'inline-block',
                                    marginRight: '10px',
                                    border: '1px solid #ddd'
                                  }}
                                />
                              </td>
                              <td>{count}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="2" className="text-end fw-bold">Всего:</td>
                          <td className="fw-bold">{boardMarks.length}</td>
                        </tr>
                      </tfoot>
                    </Table>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="d-flex justify-content-center align-items-center bg-light" style={{ height: '300px' }}>
              <div className="text-center">
                <p>Загрузите фотографию для начала работы</p>
                <Button 
                  variant="primary"
                  onClick={() => fileInputRef.current.click()}
                >
                  Выбрать файл
                </Button>
              </div>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default App;