import { useState, useRef, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Table,
  Alert
} from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

function App() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // States
  const [image, setImage] = useState(null);
  const [logs, setLogs] = useState([]);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [color, setColor] = useState('#ff0000');
  const [selectedLog, setSelectedLog] = useState(null);
  const [boardMarks, setBoardMarks] = useState([]);
  const [markerSize, setMarkerSize] = useState(isMobile ? 40 : 20);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [documentNumber, setDocumentNumber] = useState('');
  const [isClick, setIsClick] = useState(true);
  const [initialDistance, setInitialDistance] = useState(null);
  const [logicalOffset, setLogicalOffset] = useState({ x: 0, y: 0 });
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });

  // Refs
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorPreviewRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const clickTimerRef = useRef(null);
  const touchStartTime = useRef(0);
  // Derived values
  const dynamicMarkerSize = markerSize * zoomLevel * (isMobile ? 2 : 1);

  // Standard colors
  const standardColors = [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
    '#ff9900',
    '#9900ff',
    '#009900',
    '#000000'
  ];

  // Handlers
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

const deleteMark = (clickedMark) => {
  const updatedMarks = boardMarks.filter((mark) => mark.id !== clickedMark.id);
  const marksForLog = updatedMarks
    .filter((mark) => mark.logId === clickedMark.logId)
    .sort((a, b) => a.number - b.number);
  const renumberedMarks = updatedMarks.map((mark) => {
    if (mark.logId === clickedMark.logId) {
      const newNumber = marksForLog.findIndex((m) => m.id === mark.id) + 1;
      return { ...mark, number: newNumber };
    }
    return mark;
  });
  const maxNumber = renumberedMarks
    .filter((mark) => mark.logId === clickedMark.logId)
    .reduce((max, mark) => Math.max(max, mark.number), 0);
  setLogs(
    logs.map((log) =>
      log.id === clickedMark.logId ? { ...log, nextMarkId: maxNumber + 1 } : log
    )
  );
  setBoardMarks(renumberedMarks);
};
  const processClick = (imageX, imageY) => {
  if (imageX < 0 || imageY < 0 || imageX > imgRef.current.width || imageY > imgRef.current.height) {
    return;
  }

  const clickedMark = boardMarks.find((mark) => {
    const distance = Math.sqrt((mark.x - imageX) ** 2 + (mark.y - imageY) ** 2);
    return distance <= dynamicMarkerSize;
  });

  if (clickedMark) {
    deleteMark(clickedMark);
    return;
  }

  if (selectedLog) {
    const nextNumber = logs.find((log) => log.id === selectedLog.id).nextMarkId;
    const newMark = {
      id: Date.now(),
      x: imageX,
      y: imageY,
      logId: selectedLog.id,
      color: selectedLog.color,
      number: nextNumber,
      size: dynamicMarkerSize
    };

    setLogs(
      logs.map((log) =>
        log.id === selectedLog.id ? { ...log, nextMarkId: nextNumber + 1 } : log
      )
    );
    setBoardMarks([...boardMarks, newMark]);
  }
};

const handleDesktopClick = (e) => {
  if (!image || !isClick || isDragging) return;
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const imageX = ((clientX * scaleX) - canvasOffset.x) / zoomLevel;
  const imageY = ((clientY * scaleY) - canvasOffset.y) / zoomLevel;
  processClick(imageX, imageY);
};

function isPointOnImage(x, y, img, offset, zoom) {
  const imageLeft = 0; // потому что изображение рисуется от (0, 0)
  const imageTop = 0;
  const imageRight = img.width;
  const imageBottom = img.height;

  return x >= imageLeft && x <= imageRight && y >= imageTop && y <= imageBottom;
}

const handleMobileClick = (e) => {
  if (!image || isDragging || !selectedLog) return;

  const touch = e.touches?.[0] || e.changedTouches?.[0];
  if (!touch) return;

  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();

  const clientX = touch.clientX - rect.left;
  const clientY = touch.clientY - rect.top;

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const imageX = (clientX * scaleX - canvasOffset.x) / zoomLevel;
  const imageY = (clientY * scaleY - canvasOffset.y) / zoomLevel;

  // Проверяем, попали ли мы в изображение
  if (
    imageX >= 0 &&
    imageY >= 0 &&
    imageX <= imgRef.current.width &&
    imageY <= imgRef.current.height
  ) {
    console.log("Нажали");
    processClick(imageX, imageY);
  }
};


  const handleMouseEnter = () => {
    document.body.style.overflow = 'hidden';
  };

  const handleMouseLeave = () => {
    document.body.style.overflow = '';
  };
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      clickTimerRef.current = setTimeout(() => {
        setIsClick(false);
        setIsDragging(true);
        setDragStart({
          x: e.clientX - canvasOffset.x,
          y: e.clientY - canvasOffset.y
        });
      }, 150);
    }
  };

  const handleMouseUp = () => {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (isDragging) {
      setIsDragging(false);
      setIsClick(false);
    } else {
      setIsClick(true);
    }
  };

const handleMouseMove = (e) => {
  if (!isDragging) return;

  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  // Переводим физическое смещение в логическое
  const logicalX = dx / zoomLevel;
  const logicalY = dy / zoomLevel;

  setLogicalOffset({ x: logicalX, y: logicalY });
  setCanvasOffset({ x: dx, y: dy });
  setIsClick(false);
};

const handleWheel = (e) => {
  if (!image) return;
  if (e.cancelable) e.preventDefault();

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

const handleTouchStart = (e) => {
  touchStartTime.current = Date.now();
  
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - canvasOffset.x,
      y: touch.clientY - canvasOffset.y
    });
  } else if (e.touches.length === 2) {
    const dist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    setInitialDistance(dist);
    
    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    setPinchCenter({ x: centerX, y: centerY });
  }
  
  if (e.cancelable) e.preventDefault();
};


const handleTouchMove = (e) => {
  if (e.cancelable) e.preventDefault();

  if (e.touches.length === 1 && isDragging) {
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    setCanvasOffset({ x: dx, y: dy });
  } else if (e.touches.length === 2) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    const currentDistance = Math.hypot(
      touch1.clientX - touch2.clientX,
      touch1.clientY - touch2.clientY
    );

    if (initialDistance !== null) {
      const scale = currentDistance / initialDistance;
      const newZoom = Math.max(0.5, Math.min(3, zoomLevel * scale));

      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      
      const imgX = (centerX - containerRect.left - canvasOffset.x) / zoomLevel;
      const imgY = (centerY - containerRect.top - canvasOffset.y) / zoomLevel;

      const newOffsetX = centerX - containerRect.left - imgX * newZoom;
      const newOffsetY = centerY - containerRect.top - imgY * newZoom;

      setZoomLevel(newZoom);
      setCanvasOffset({ x: newOffsetX, y: newOffsetY });
    }
    setInitialDistance(currentDistance);
  }
};

const handleTouchEnd = (e) => {
  if (isDragging) {
    setIsDragging(false);
    setInitialDistance(null);
    return;
  }

  if (e.touches.length === 0 && e.changedTouches?.length === 1) {
    const touch = e.changedTouches[0];
    const now = Date.now();
    const touchDuration = now - touchStartTime.current;

    if (touchDuration < 150) {
      handleMobileClick(e);
    }
  }

  setIsDragging(false);
  setInitialDistance(null);
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
    setLogs(logs.filter((log) => log.id !== id));
    setBoardMarks(boardMarks.filter((mark) => mark.logId !== id));
  };

  const handleLogSelect = (log) => {
    setSelectedLog((prev) => (prev?.id === log.id ? null : log));
  };

  // Canvas rendering
  useEffect(() => {
  if (!image) return;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    imgRef.current = img;
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Применяем трансформации (перемещение и зум)
    ctx.save();
    ctx.translate(canvasOffset.x, canvasOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    // РИСУЕМ ИЗОБРАЖЕНИЕ С ПРОПОРЦИОНАЛЬНЫМ МАСШТАБИРОВАНИЕМ
    ctx.drawImage(img, 0, 0); 

    // Рисуем маркеры
    boardMarks.forEach((mark) => {
      const log = logs.find((l) => l.id === mark.logId);
      if (log) drawMark(ctx, mark.x, mark.y, log.color, mark.number);
    });

    ctx.restore();
  };
  img.src = image;
}, [image, boardMarks, logs, zoomLevel, canvasOffset]);

  const drawMark = (ctx, x, y, color, number) => {
    ctx.beginPath();
    ctx.arc(x, y, dynamicMarkerSize, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${dynamicMarkerSize * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), x, y);
  };

  // Export to Excel
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
  };

  const getBoardSummary = () => {
    const summary = {};
    boardMarks.forEach((mark) => {
      const log = logs.find((l) => l.id === mark.logId);
      if (log) {
        const key = `${log.width}x${log.height}`;
        summary[key] = (summary[key] || 0) + 1;
      }
    });
    return summary;
  };

  const getTotalCount = () => boardMarks.length;

  const exportToExcel = async () => {
    if (!documentNumber) {
      alert('Введите номер документа');
      return;
    }

    const currentDate = formatDate(new Date());
    const fileName = `Учет досок ${documentNumber} от ${currentDate}.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Учет досок');

    worksheet.getCell('A1').value = `Документ №: ${documentNumber}`;
    worksheet.getCell('A2').value = `Дата: ${currentDate}`;

    if (canvasRef.current && image) {
      const imageId = workbook.addImage({
        base64: canvasRef.current.toDataURL('image/png'),
        extension: 'png'
      });

      worksheet.addImage(imageId, {
        tl: { col: 1, row: 3 },
        ext: { width: 500, height: 300 }
      });
    }

    const tableStartRow = image ? 25 : 4;

    worksheet.getCell(`A${tableStartRow}`).value = '№';
    worksheet.getCell(`B${tableStartRow}`).value = 'Размер доски (см)';
    worksheet.getCell(`C${tableStartRow}`).value = 'Количество';
    worksheet.getCell(`D${tableStartRow}`).value = 'Цвет';

    const summary = getBoardSummary();
    Object.entries(summary).forEach(([size, count], index) => {
      const log = logs.find((l) => `${l.width}x${l.height}` === size);
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

    const totalRow = tableStartRow + Object.keys(summary).length + 1;
    worksheet.getCell(`B${totalRow}`).value = 'Всего досок';
    worksheet.getCell(`C${totalRow}`).value = getTotalCount();

    worksheet.columns = [
      { key: 'number', width: 5 },
      { key: 'size', width: 15 },
      { key: 'count', width: 12 },
      { key: 'color', width: 10 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  };

  // Touch events
useEffect(() => {
  const container = canvasContainerRef.current;
  if (!container) return;

  const options = { passive: false };
  
  const preventScroll = (e) => {
    if (e.cancelable && (isDragging || initialDistance !== null)) {
      e.preventDefault();
    }
  };

  container.addEventListener('wheel', handleWheel, options);
  container.addEventListener('touchmove', preventScroll, options);
  container.addEventListener('touchstart', handleTouchStart, options);
  container.addEventListener('touchend', handleTouchEnd);

  return () => {
    container.removeEventListener('wheel', handleWheel);
    container.removeEventListener('touchmove', preventScroll);
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchend', handleTouchEnd);
  };
}, [handleWheel, isDragging, initialDistance]);

useEffect(() => {
  const onTouchCancel = () => {
    setIsDragging(false);
  };

  window.addEventListener('touchcancel', onTouchCancel);
  return () => {
    window.removeEventListener('touchcancel', onTouchCancel);
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
                display: 'inline-block', // ВАЖНО: подстраивается под размер canvas
                maxWidth: '100%',
                cursor: isDragging ? 'grabbing' : selectedLog ? 'crosshair' : 'grab',
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onWheel={handleWheel}
              onTouchMove={handleTouchMove}
            >
              <canvas
                ref={canvasRef}
                onClick={!isMobile ? handleDesktopClick : null}
                onTouchEnd={isMobile ? handleTouchEnd : null}
                style={{
                  transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoomLevel})`,
                  transformOrigin: '0 0',
                  willChange: 'transform'
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