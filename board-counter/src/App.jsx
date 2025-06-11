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
  const [isMobile, setIsMobile] = useState(
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
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
  const [clickStartTime, setClickStartTime] = useState(0);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [dragSpeed, setDragSpeed] = useState(1.5);
  const [excelSheets, setExcelSheets] = useState([]);
  
  // Refs
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorPreviewRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const clickTimerRef = useRef(null);
  const touchStartTime = useRef(0);
  
  // Derived values
  const dynamicMarkerSize = markerSize * (isMobile ? 1.1 : 1);

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

  // Check mobile on resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768
      );
    };

    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Handlers
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImageSize({
            width: img.width,
            height: img.height
          });
          setImage(event.target.result);
          setBoardMarks([]);
          setZoomLevel(1);
          setCanvasOffset({ x: 0, y: 0 });
        };
        img.src = event.target.result;
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

  const handleMobileClick = (e) => {
    if (!image || isDragging || !selectedLog) return;
    const touch = e.touches?.[0] || e.changedTouches?.[0];
    if (!touch) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const clientX = (touch.clientX - rect.left) * window.devicePixelRatio;
    const clientY = (touch.clientY - rect.top) * window.devicePixelRatio;

    const scaleX = canvas.width / (rect.width * window.devicePixelRatio);
    const scaleY = canvas.height / (rect.height * window.devicePixelRatio);

    const imageX = ((clientX * scaleX) - canvasOffset.x) / zoomLevel;
    const imageY = ((clientY * scaleY) - canvasOffset.y) / zoomLevel;

    if (
      imageX >= 0 &&
      imageY >= 0 &&
      imageX <= imgRef.current.width &&
      imageY <= imgRef.current.height
    ) {
      processClick(imageX, imageY);
    }
  };

  const handleMouseEnter = () => {
    document.body.style.overflow = 'hidden';
  };

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false);
    document.body.style.overflow = '';
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
      });
      setClickStartTime(Date.now());
    }
  };

  const handleMouseUp = () => {
    const clickDuration = Date.now() - clickStartTime;
    
    if (isDragging) {
      setIsDragging(false);
      
      if (clickDuration < 150) {
        setIsClick(true);
      } else {
        setIsClick(false);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const dx = (e.clientX - dragStart.x) * dragSpeed;
    const dy = (e.clientY - dragStart.y) * dragSpeed;

    setCanvasOffset({
      x: dragStart.offsetX + dx,
      y: dragStart.offsetY + dy
    });
    setIsClick(false);
  };

  const handleWheel = (e) => {
    if (!image) return;
    
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
    if (e.cancelable) e.preventDefault();
    touchStartTime.current = Date.now();
    
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        offsetX: canvasOffset.x,
        offsetY: canvasOffset.y
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
  };

  const handleTouchMove = (e) => {
    if (e.cancelable) e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = (touch.clientX - dragStart.x) * dragSpeed;
      const dy = (touch.clientY - dragStart.y) * dragSpeed;
      setCanvasOffset({
        x: dragStart.offsetX + dx,
        y: dragStart.offsetY + dy
      });
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
    if (e.cancelable) e.preventDefault();
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
      
      const container = canvasContainerRef.current;
      const maxWidth = container.parentElement.clientWidth;
      const maxHeight = window.innerHeight * (isMobile ? 0.6 : 0.7);
      
      let displayWidth = img.width;
      let displayHeight = img.height;
      
      if (img.width > maxWidth || img.height > maxHeight) {
        const ratio = Math.min(
          maxWidth / img.width,
          maxHeight / img.height
        );
        displayWidth = img.width * ratio;
        displayHeight = img.height * ratio;
      }
      
      container.style.width = `${displayWidth}px`;
      container.style.height = `${displayHeight}px`;
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvasOffset.x, canvasOffset.y);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      boardMarks.forEach((mark) => {
        const log = logs.find((l) => l.id === mark.logId);
        if (log) drawMark(ctx, mark.x, mark.y, log.color, mark.number);
      });
      ctx.restore();
    };
    img.src = image;
  }, [image, boardMarks, logs, zoomLevel, canvasOffset, markerSize, isMobile]);

  const drawMark = (ctx, x, y, color, number) => {
    const markSizeInPixels = dynamicMarkerSize * window.devicePixelRatio;
    ctx.beginPath();
    ctx.arc(x, y, markSizeInPixels, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2 * window.devicePixelRatio;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${markSizeInPixels * 0.8}px Arial`;
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

const getBoardSummary = (marks, logs) => {
  const summary = {};
  marks.forEach((mark) => {
    const log = logs.find((l) => l.id === mark.logId);
    if (log) {
      const key = `${log.width}x${log.height}`;
      summary[key] = (summary[key] || 0) + 1;
    }
  });
  return summary;
};

const addToExcel = () => {
  if (!image || boardMarks.length === 0) {
    alert('Нет данных для добавления');
    return;
  }

  const sheetName = `Фото_${excelSheets.length + 1}`;
  const newSheet = {
    name: sheetName,
    imageData: canvasRef.current.toDataURL('image/png'),
    logs: [...logs], // Сохраняем текущий список размеров бревен
    boardMarks: [...boardMarks],
    documentNumber: documentNumber || 'Без номера'
  };

  setExcelSheets([...excelSheets, newSheet]);
  alert(`Страница "${sheetName}" успешно добавлена`);
};
const exportToExcel = async () => {
  if (excelSheets.length === 0) {
    alert('Нет страниц для экспорта');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  excelSheets.forEach((sheet, index) => {
    const worksheet = workbook.addWorksheet(sheet.name);

    // Добавляем заголовок
    worksheet.getCell('A1').value = `Документ №: ${documentNumber}`;
    worksheet.getCell('A2').value = `Дата: ${formatDate(new Date())}`;

    // Добавляем изображение
    if (sheet.imageData) {
      const imageId = workbook.addImage({
        base64: sheet.imageData.split(',')[1], // Убираем префикс data:image/png;base64,
        extension: 'png',
      });
      worksheet.addImage(imageId, {
        tl: { col: 1, row: 3 },
        ext: { width: 500, height: 300 }
      });
    }

    // Добавляем таблицу
    const tableStartRow = 25;
    worksheet.getCell(`A${tableStartRow}`).value = '№';
    worksheet.getCell(`B${tableStartRow}`).value = 'Размер доски (мм)';
    worksheet.getCell(`C${tableStartRow}`).value = 'Количество';
    worksheet.getCell(`D${tableStartRow}`).value = 'Цвет';

    const summary = getBoardSummary(sheet.boardMarks, sheet.logs);
    Object.entries(summary).forEach(([size, count], idx) => {
      const log = sheet.logs.find((l) => `${l.width}x${l.height}` === size);
      const row = tableStartRow + idx + 1;
      worksheet.getCell(`A${row}`).value = idx + 1;
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
    worksheet.getCell(`C${totalRow}`).value = sheet.boardMarks.length;

    worksheet.columns = [
      { key: 'number', width: 5 },
      { key: 'size', width: 15 },
      { key: 'count', width: 12 },
      { key: 'color', width: 10 }
    ];
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const currentDate = formatDate(new Date());
  const fileName = `Учет досок_${documentNumber}_${currentDate}.xlsx`;
  saveAs(new Blob([buffer]), fileName);

  // Очистка после экспорта
  setExcelSheets([]);
  setImage(null);
  setLogs([]);
  setBoardMarks([]);
  setDocumentNumber('');
};

  // Touch events
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const options = { passive: false };

    container.addEventListener('wheel', handleWheel, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchmove', handleTouchMove);
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

  // Render sections
  const renderFormsSection = () => (
    <>
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

        <Form.Group controlId="formDragSpeed" className="mb-3">
          <Form.Label>Скорость перетаскивания: {dragSpeed.toFixed(1)}x</Form.Label>
          <Form.Range 
            min="0.5" 
            max="3" 
            step="0.1"
            value={dragSpeed} 
            onChange={(e) => setDragSpeed(parseFloat(e.target.value))}
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
                <th>Ширина (мм)</th>
                <th>Длина (мм)</th>
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
          onClick={addToExcel}
          disabled={!image || boardMarks.length === 0}
          className="w-100 mt-3"
        >
          Добавить в Excel
        </Button>

        {/* Кнопка "Выгрузить Excel" */}
        <Button 
          variant="primary" 
          onClick={exportToExcel}
          disabled={excelSheets.length === 0 || !documentNumber}
          className="w-100 mt-3"
        >
          Выгрузить Excel
        </Button>
        <div className="border p-3 mb-3">
          <h5>Добавленные страницы</h5>
          {excelSheets.length === 0 ? (
            <Alert variant="info">Нет добавленных страниц</Alert>
          ) : (
            <ul>
              {excelSheets.map((sheet, i) => (
                <li key={i}>{sheet.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );

  const renderImageSection = () => (
    <>
      {image ? (
        <>
          <div className="position-relative">
            <div
              ref={canvasContainerRef}
              className='canvas-container'
              style={{ 
                border: '1px solid #ddd',
                cursor: isDragging ? 'grabbing' : selectedLog ? 'crosshair' : 'grab',
                margin: '0 auto',
                maxWidth: '100%',
                overflow: 'hidden',
                position: 'relative',
                height: isMobile ? '60vh' : 'auto'
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
                width={image?.width}
                height={image?.height}
                onClick={!isMobile ? handleDesktopClick : null}
                onTouchStart={isMobile ? handleTouchStart : null}
                onTouchEnd={isMobile ? handleTouchEnd : null}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated'
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
                          <td>{log.width}x{log.height} мм</td>
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
        <div className="d-flex justify-content-center align-items-center bg-light" style={{ height: isMobile ? '40vh' : '300px' }}>
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
    </>
  );

  return (
    <Container className="my-4">
      <h1 className="text-center mb-4">Учет досок на фотографии</h1>
      <Row className="mb-4">
        {isMobile ? (
          <>
            <Col xs={12} className="mb-3">
              {renderFormsSection()}
            </Col>
            <Col xs={12}>
              {renderImageSection()}
            </Col>
          </>
        ) : (
          <>
            <Col md={6}>
              {renderFormsSection()}
            </Col>
            <Col md={6}>
              {renderImageSection()}
            </Col>
          </>
        )}
      </Row>
    </Container>
  );
}

export default App;
