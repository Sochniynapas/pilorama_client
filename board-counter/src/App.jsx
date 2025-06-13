import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Alert, Collapse } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const colorPalette = {
  primary: '#196c2f',
  secondary: '#4c8c6c',
  light: '#f1f7eb',
  accent: '#91bc44',
  accentLight: '#a8cc53',
  dark: '#59785c',
  background: '#d6e393',
  tableRow: '#a9cb91',
  border: '#7e9979'
};

function App() {
  const [isMobile, setIsMobile] = useState(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const [imagesData, setImagesData] = useState([]);
  const [currentImageId, setCurrentImageId] = useState(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [color, setColor] = useState(colorPalette.accent);
  const [selectedLog, setSelectedLog] = useState(null);
  const [globalMarkerSize, setGlobalMarkerSize] = useState(isMobile ? 40 : 20);
  const [currentImageMarkerSize, setCurrentImageMarkerSize] = useState(null);
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
  const [dragSpeed, setDragSpeed] = useState(2.5);
  const [expandedImages, setExpandedImages] = useState(true);
  const [logsPanelOpen , setLogsPanelOpen ] = useState(true);

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorPreviewRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const clickTimerRef = useRef(null);
  const touchStartTime = useRef(0);

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

  const styles = {
    container: {
      backgroundColor: colorPalette.light,
      borderRadius: '15px',
      padding: '20px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    section: {
      backgroundColor: colorPalette.light,
      border: `2px solid ${colorPalette.border}`,
      borderRadius: '10px',
      padding: '15px',
      marginBottom: '20px'
    },
    buttonSecondary: {
      backgroundColor: colorPalette.secondary,
      borderColor: colorPalette.secondary,
      color: 'white'
    },
    tableHeader: {
      backgroundColor: colorPalette.primary,
      color: 'white'
    },
    tableRow: {
      backgroundColor: colorPalette.tableRow,
      transition: 'background-color 0.2s ease',
      '&:hover': {
        backgroundColor: '#c1d9b2'
      }
    },
    selectedLogRow: {
      backgroundColor: '#a9cb91',
      borderLeft: `3px solid ${colorPalette.primary}`
    },
    input: {
      border: `2px solid ${colorPalette.border}`,
      borderRadius: '5px'
    },
    canvasContainer: {
      border: `2px solid ${colorPalette.border}`,
      backgroundColor: colorPalette.background,
      overflow: 'hidden',
      position: 'relative',
      display: 'inline-block', // Изменяем на inline-block
      maxWidth: '100%' // Ограничиваем максимальную ширину
    },
    canvasWrapper: {
      position: 'relative',
      overflow: 'hidden',
      maxWidth: '100%',
      maxHeight: '100%'
    },
    imageContainer: {
      display: 'flex',
      alignItems: 'center',
      padding: '10px',
      borderRadius: '8px',
      backgroundColor: colorPalette.light,
      border: `1px solid ${colorPalette.border}`,
      marginBottom: '8px',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: colorPalette.accentLight,
        boxShadow: `0 2px 6px ${colorPalette.primary}33`, // Легкая тень
        transform: 'translateY(-2px)'
      }
    },
    selectedImageContainer: {
      backgroundColor: '#c1e0b3',
      borderLeft: `4px solid ${colorPalette.primary}`
    },
    imageWrapper: {
      width: '60px',
      height: '60px',
      backgroundColor: 'white',
      borderRadius: '4px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    },
    imagePreview: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  };

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1000);
    };
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newImages = files.map((file, index) => {
      const imageId = Date.now() + index;
      return {
        id: imageId,
        image: URL.createObjectURL(file),
        logs: [],
        boardMarks: [],
        name: `Фото ${imagesData.length + index + 1}`
      };
    });

    setImagesData(prev => [...prev, ...newImages]);
  };

  const deleteImage = (imageId, e) => {
    e.stopPropagation();
    setImagesData(prev => {
      const newImages = prev.filter(img => img.id !== imageId);
      return newImages.map((img, index) => ({
        ...img,
        name: `Фото ${index + 1}`
      }));
    });
    if (currentImageId === imageId) {
      setCurrentImageId(null);
    }
  };

  const deleteMark = (clickedMark, imageId) => {
    const updatedImageData = imagesData.map(data =>
      data.id === imageId
        ? {
            ...data,
            boardMarks: data.boardMarks.filter((mark) => mark.id !== clickedMark.id),
            logs: data.logs.map((log) => {
              const marksForLog = data.boardMarks
                .filter((mark) => mark.logId === log.id)
                .sort((a, b) => a.number - b.number);
              const renumberedMarks = data.boardMarks.map((mark) => {
                if (mark.logId === log.id) {
                  const newNumber = marksForLog.findIndex((m) => m.id === mark.id) + 1;
                  return { ...mark, number: newNumber };
                }
                return mark;
              });
              const maxNumber = renumberedMarks
                .filter((mark) => mark.logId === log.id)
                .reduce((max, mark) => Math.max(max, mark.number), 0);
              return {
                ...log,
                nextMarkId: maxNumber + 1
              };
            })
          }
        : data
    );
    setImagesData(updatedImageData);
  };

  const processClick = (imageX, imageY, imageId) => {
    const currentImageData = imagesData.find(data => data.id === imageId);
    if (!currentImageData || !currentImageData.image) return;

    const clickedMark = currentImageData.boardMarks.find((mark) => {
      const distance = Math.sqrt((mark.x - imageX) ** 2 + (mark.y - imageY) ** 2);
      return distance <= dynamicMarkerSize;
    });

    if (clickedMark) {
      deleteMark(clickedMark, imageId);
      return;
    }

    if (selectedLog) {
      const currentLog = currentImageData.logs.find(log => log.id === selectedLog.id);
      if (!currentLog) return;

      const nextNumber = currentLog.nextMarkId;
      const newMark = {
        id: Date.now(),
        x: imageX,
        y: imageY,
        logId: selectedLog.id,
        color: selectedLog.color,
        number: nextNumber,
        size: currentImageMarkerSize || globalMarkerSize
      };

      const updatedLogs = currentImageData.logs.map(log =>
        log.id === selectedLog.id
          ? { ...log, nextMarkId: nextNumber + 1 }
          : log
      );

      const updatedMarks = [...currentImageData.boardMarks, newMark];

      setImagesData(imagesData.map(data =>
        data.id === imageId
          ? { ...data, logs: updatedLogs, boardMarks: updatedMarks }
          : data
      ));
    }
  };

  const handleDesktopClick = (e, imageId) => {
    if (!imageId || !isClick || isDragging) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const imageX = ((clientX * scaleX) - canvasOffset.x) / zoomLevel;
    const imageY = ((clientY * scaleY) - canvasOffset.y) / zoomLevel;
    processClick(imageX, imageY, imageId);
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
    if (!currentImageId) return;
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
      if (touchDuration < 150 && currentImageId) {
        handleMobileClick(e, currentImageId);
      }
    }
    setIsDragging(false);
    setInitialDistance(null);
  };

  const handleMobileClick = (e, imageId) => {
    if (isDragging || !selectedLog) return;
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
    if (imageX >= 0 && imageY >= 0 && imageX <= imgRef.current.width && imageY <= imgRef.current.height) {
      processClick(imageX, imageY, imageId);
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

      const updatedImages = imagesData.map(imageData =>
        currentImageId === imageData.id
          ? { ...imageData, logs: [...imageData.logs, newLog] }
          : imageData
      );
      setImagesData(updatedImages);
      setWidth('');
      setHeight('');
    }
  };

  const deleteLog = (id) => {
    const updatedImages = imagesData.map(imageData =>
      currentImageId === imageData.id
        ? {
            ...imageData,
            logs: imageData.logs.filter((log) => log.id !== id),
            boardMarks: imageData.boardMarks.filter((mark) => mark.logId !== id)
          }
        : imageData
    );
    setImagesData(updatedImages);
  };

  const toggleImagesCollapse = () => {
    setExpandedImages(!expandedImages);
  };

  const handleLogSelect = (log) => {
    setSelectedLog((prev) => (prev?.id === log.id ? null : log));
  };

useEffect(() => {
  if (!currentImageId || !imagesData.length) return;
  const currentImage = imagesData.find(data => data.id === currentImageId);
  if (!currentImage || !currentImage.image) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  const container = canvasContainerRef.current;
  const img = new Image();
  
  img.onload = () => {
    imgRef.current = img;

    // Устанавливаем физические размеры canvas равными размерам изображения
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Рассчитываем соотношение сторон изображения
    const imgAspectRatio = img.naturalWidth / img.naturalHeight;
    
    // Получаем доступные размеры контейнера
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Рассчитываем размеры для отображения с сохранением пропорций
    let displayWidth = containerWidth;
    let displayHeight = containerHeight;
    
    if (containerWidth / containerHeight > imgAspectRatio) {
      displayWidth = containerHeight * imgAspectRatio;
    } else {
      displayHeight = containerWidth / imgAspectRatio;
    }

    // Устанавливаем CSS-размеры canvas
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    
    // Очищаем и рисуем изображение
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvasOffset.x, canvasOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

    // Рисуем маркеры
    currentImage.boardMarks.forEach((mark) => {
      const log = currentImage.logs.find((l) => l.id === mark.logId);
      if (log) drawMark(ctx, mark.x, mark.y, log.color, mark.number, mark.size);
    });
    ctx.restore();
  };
  
  img.src = currentImage.image;
}, [currentImageId, imagesData, zoomLevel, canvasOffset, globalMarkerSize, isMobile]);
const drawMark = (ctx, x, y, color, number, size) => {
  const markSizeInPixels = (size || globalMarkerSize) * window.devicePixelRatio;
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

   const exportToExcel = async () => {
    if (imagesData.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const imagePromises = imagesData.map(async (imageData, index) => {
      const worksheet = workbook.addWorksheet(`Фото_${index + 1}`);
      worksheet.getCell('A1').value = `Документ №: ${documentNumber || 'Без номера'}`;
      worksheet.getCell('A2').value = `Дата: ${formatDate(new Date())}`;

      if (imageData.image) {
        try {
          const base64Image = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0);
              imageData.boardMarks.forEach((mark) => {
                const log = imageData.logs.find((l) => l.id === mark.logId);
                if (log) drawMark(ctx, mark.x, mark.y, log.color, mark.number, mark.size);
              });
              resolve(canvas.toDataURL('image/png'));
            };
            img.src = imageData.image;
          });

          const imageId = workbook.addImage({
            base64: base64Image.split(',')[1],
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col: 1, row: 3 },
            ext: { width: 500, height: 300 }
          });
        } catch (error) {
          console.error(`Ошибка при добавлении изображения:`, error);
        }
      }

      const tableStartRow = 25;
      worksheet.getCell(`A${tableStartRow}`).value = '№';
      worksheet.getCell(`B${tableStartRow}`).value = 'Размер доски (мм)';
      worksheet.getCell(`C${tableStartRow}`).value = 'Количество';
      worksheet.getCell(`D${tableStartRow}`).value = 'Цвет';

      const summary = getBoardSummary(imageData.boardMarks, imageData.logs);
      Object.entries(summary).forEach(([size, count], idx) => {
        const log = imageData.logs.find((l) => `${l.width}x${l.height}` === size);
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
      worksheet.getCell(`C${totalRow}`).value = imageData.boardMarks.length;

      worksheet.columns = [
        { key: 'number', width: 5 },
        { key: 'size', width: 15 },
        { key: 'count', width: 12 },
        { key: 'color', width: 10 }
      ];
    });

    await Promise.all(imagePromises);
    const buffer = await workbook.xlsx.writeBuffer();
    const currentDate = formatDate(new Date());
    const fileName = `Учет досок_${documentNumber}_${currentDate}.xlsx`;
    saveAs(new Blob([buffer]), fileName);

    setImagesData([]);
    setCurrentImageId(null);
    setWidth('');
    setHeight('');
    setColor(colorPalette.accent);
    setSelectedLog(null);
    setDocumentNumber('');
  };

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

  const dynamicMarkerSize = (currentImageMarkerSize || globalMarkerSize) * (isMobile ? 1.1 : 1);

const renderFormsSection = () => (
  <>
    <div style={styles.section}>
      <Form.Group controlId="formImage" className="mb-3">
        <Form.Label className="fw-bold" style={{ color: colorPalette.primary }}>
          📷 Загрузите фотографии с досками
        </Form.Label>
        <div className="d-flex gap-2">
          <Form.Control 
            type="file" 
            accept="image/*" 
            onChange={handleImageUpload} 
            ref={fileInputRef}
            multiple
            style={{ display: 'none' }}
          />
          <Button 
            style={styles.buttonPrimary}
            onClick={() => fileInputRef.current?.click()}
            className="hover-scale"
          >
            Выбрать файлы
          </Button>
        </div>
      </Form.Group>
    </div>

    <div style={styles.section}>
      <div 
        className="d-flex justify-content-between align-items-center mb-3 image-header"
        onClick={() => setExpandedImages(!expandedImages)}
      >
        <h4 className="mb-0">
          <span style={styles.headerButton}>
            <i className={`bi bi-image${expandedImages ? '-fill' : ''} me-2`}></i>
            Загруженные изображения ({imagesData.length})
          </span>
        </h4>
        <Button 
          variant="link" 
          style={{ color: colorPalette.primary, fontSize: '1.5rem' }}
        >
          {expandedImages ? <i className="bi bi-chevron-up"/> : <i className="bi bi-chevron-down"/>}
        </Button>
      </div>
      
      <Collapse in={expandedImages}>
        <div>
          {imagesData.length > 0 ? (
            <div className="d-flex flex-column gap-2">
              {imagesData.map((imgData) => (
                <div 
                  key={imgData.id}
                  style={{ 
                    ...styles.imageContainer,
                    ...(currentImageId === imgData.id && styles.selectedImageContainer)
                  }}
                  onClick={() => setCurrentImageId(imgData.id)}
                  className="hover-scale"
                >
                  <div style={styles.imageWrapper}>
                    {imgData.image ? (
                      <img src={imgData.image} alt="Превью" style={styles.imagePreview}/>
                    ) : <span className="text-muted">...</span>}
                  </div>
                  <div style={{ marginLeft: '12px', flexGrow: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      {currentImageId === imgData.id && (
                        <i className="bi bi-check-circle-fill me-2" style={{ color: colorPalette.primary }}/>
                      )}
                      {imgData.name}
                    </div>
                  </div>
                  <Button 
                    
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(imgData.id, e);
                    }}
                    style={styles.buttonPrimary}
                    className="btn-primary"
                  >
                    <i className="bi bi-trash"></i>
                    <span>Удалить</span>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <Alert variant="info" style={{ 
              backgroundColor: colorPalette.background,
              borderColor: colorPalette.border,
              color: colorPalette.dark,
              textAlign: 'center',
              borderRadius: '8px'
            }}>
              <i className="bi bi-image me-2"></i>
              Пока нет загруженных изображений
            </Alert>
          )}
        </div>
      </Collapse>
    </div>

    <div style={styles.section}>
      <h4 style={{ color: colorPalette.primary }}>Добавить бревно</h4>
      <Row className="g-2">
        <Col sm={4}>
          <Form.Group controlId="formWidth" className="mb-3">
            <Form.Label>Ширина (мм)</Form.Label>
            <Form.Control 
              type="number" 
              value={width} 
              onChange={(e) => setWidth(e.target.value)}
              style={styles.input}
            />
          </Form.Group>
        </Col>
        <Col sm={4}>
          <Form.Group controlId="formHeight" className="mb-3">
            <Form.Label>Высота (мм)</Form.Label>
            <Form.Control 
              type="number" 
              value={height} 
              onChange={(e) => setHeight(e.target.value)}
              style={styles.input}
            />
          </Form.Group>
        </Col>
        <Col sm={4} className="d-flex align-items-end mb-3">
          <Button 
            style={styles.buttonPrimary}
            onClick={addLog} 
            disabled={!width || !height}
            className="hover-scale"
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
              border: `2px solid ${colorPalette.border}`,
              marginRight: '10px',
              cursor: 'pointer',
              borderRadius: '5px'
            }}
            onClick={() => setShowColorPalette(!showColorPalette)}
          />
          <span>{color}</span>
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
                border: color === stdColor ? `2px solid ${colorPalette.dark}` : `1px solid ${colorPalette.border}`,
                borderRadius: '3px'
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
            style={{ ...styles.input, padding: '3px' }}
          />
        )}
      </Form.Group>
    </div>

    <div style={styles.section}>
      <h4 style={{ color: colorPalette.primary }}>Экспорт в Excel</h4>
      <Form.Group controlId="formDocNumber" className="mb-3">
        <Form.Label>Номер документа</Form.Label>
        <Form.Control 
          type="text" 
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="Введите номер документа"
          style={styles.input}
        />
      </Form.Group>
      <Button 
        style={styles.buttonPrimary}
        onClick={exportToExcel}
        disabled={imagesData.length === 0 || !documentNumber}
        className="w-100 mt-3 hover-scale"
      >
        Экспорт в Excel
      </Button>
    </div>
  </>
);

const renderImageSection = () => (
  <>
    {imagesData.length > 0 ? (
      <>
        <div className="position-relative" style={styles.section}>
          
          {/* Контейнер изображения */}
          <div
            ref={canvasContainerRef}
            style={{ 
              ...styles.canvasContainer,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Плавающая панель бревен */}
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            zIndex: 1000,
            width: logsPanelOpen ? '300px' : 'auto',
            maxWidth: '80%',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '8px'
          }}>
            <Button 
              onClick={() => setLogsPanelOpen(!logsPanelOpen)}
              style={{
                ...styles.buttonPrimary,
                width: '100%',
                borderRadius: logsPanelOpen ? '8px 8px 0 0' : '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              className="floating-logs-toggle"
            >
              <span>
                <i className={`bi bi-list${logsPanelOpen ? '-check' : ''}`}></i>
                {logsPanelOpen ? 'Скрыть список' : 'Бревна'}
              </span>
              {logsPanelOpen && <i className="bi bi-x-lg"></i>}
            </Button>
            
            {logsPanelOpen && (
              <div style={{
                backgroundColor: 'white',
                border: `1px solid ${colorPalette.border}`,
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {currentImageId && imagesData.length > 0 ? (
                  imagesData.find(data => data.id === currentImageId)?.logs.length === 0 ? (
                    <Alert variant="info" className="m-2" style={{ 
                      backgroundColor: colorPalette.background,
                      borderColor: colorPalette.border,
                      color: colorPalette.dark
                    }}>
                      Нет бревен
                    </Alert>
                  ) : (
                    <Table hover size="sm" className="m-0">
                      <tbody>
                        {imagesData.find(data => data.id === currentImageId)?.logs.map(log => (
                          <tr 
                            key={log.id} 
                            style={{ 
                              backgroundColor: selectedLog?.id === log.id 
                                ? colorPalette.accentLight 
                                : 'white',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleLogSelect(log)}
                          >
                            <td style={{ 
                              padding: '8px',
                              borderColor: colorPalette.border,
                              fontWeight: selectedLog?.id === log.id ? 'bold' : 'normal'
                            }}>
                              {log.width}x{log.height} мм
                            </td>
                            <td style={{ padding: '8px', borderColor: colorPalette.border }}>
                              <div 
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: log.color,
                                  border: `2px solid ${selectedLog?.id === log.id ? colorPalette.primary : colorPalette.border}`,
                                  borderRadius: '4px'
                                }}
                              />
                            </td>
                            <td style={{padding: '8px', borderColor: colorPalette.border }}>
                              <Button 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteLog(log.id);
                                }}
                                style={{
                                  ...styles.buttonPrimary,
                                  hwidth: '20px',
                                  height: '20px',
                                  display:'flex',
                                  flexWrap: 'wrap',
                                  flexDirection: 'column',
                                  justifyContent: 'center'
                                }}

                              >
                                X
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )
                ) : (
                  <Alert variant="info" className="m-2" style={{ 
                    backgroundColor: colorPalette.background,
                    borderColor: colorPalette.border,
                    color: colorPalette.dark
                  }}>
                    Нет выбранных изображений
                  </Alert>
                )}
              </div>
            )}
          </div>
            <canvas
              ref={canvasRef}
              width={currentImageId ? imagesData.find(data => data.id === currentImageId)?.image?.width : 0}
              height={currentImageId ? imagesData.find(data => data.id === currentImageId)?.image?.height : 0}
              onClick={!isMobile ? (e) => handleDesktopClick(e, currentImageId) : null}
              onTouchStart={isMobile ? handleTouchStart : null}
              onTouchEnd={isMobile ? handleTouchEnd : null}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                maxHeight: '80vh',
                imageRendering: 'pixelated'
              }}
            />
          </div>

          {/* Управление под изображением */}
          <div className="mt-3">
            <div className="d-flex justify-content-between mb-2">
              <Button 
                style={styles.buttonSecondary}
                size="sm"
                onClick={resetZoomAndPan}
                disabled={zoomLevel === 1 && canvasOffset.x === 0 && canvasOffset.y === 0}
                className="hover-scale"
              >
                Сбросить масштаб
              </Button>
              <div style={{ color: colorPalette.primary, fontWeight: 'bold', lineHeight: '2' }}>
                Масштаб: {Math.round(zoomLevel * 100)}%
              </div>
            </div>
            
            <Form.Group controlId="formMarkerSize" className="mb-3">
              <Form.Label>Размер маркера: {currentImageMarkerSize || globalMarkerSize}px</Form.Label>
              <Form.Range 
                min="1" 
                max="50" 
                value={currentImageMarkerSize || globalMarkerSize}
                onChange={(e) => {
                  const newSize = parseInt(e.target.value);
                  if (currentImageId) {
                    setCurrentImageMarkerSize(newSize);
                    setImagesData(prev => prev.map(img => 
                      img.id === currentImageId
                        ? {
                            ...img,
                            boardMarks: img.boardMarks.map(mark => ({
                              ...mark,
                              size: newSize
                            }))
                          }
                        : img
                    ));
                  } else {
                    setGlobalMarkerSize(newSize);
                  }
                }}
                style={{ accentColor: colorPalette.primary }}
              />
            </Form.Group>
            
            <Form.Group controlId="formDragSpeed">
              <Form.Label>Скорость перетаскивания: {dragSpeed.toFixed(1)}x</Form.Label>
              <Form.Range 
                min="0.5" 
                max="3" 
                step="0.1"
                value={dragSpeed} 
                onChange={(e) => setDragSpeed(parseFloat(e.target.value))}
                style={{ accentColor: colorPalette.primary }}
              />
            </Form.Group>
          </div>
        </div>
        
        <div style={styles.section}>
          <h4 style={{ color: colorPalette.primary }}>Статистика по бревнам</h4>
          {currentImageId && imagesData.find(data => data.id === currentImageId)?.boardMarks.length === 0 ? (
            <Alert variant="info" className="mb-0" style={{ 
              backgroundColor: colorPalette.background,
              borderColor: colorPalette.border,
              color: colorPalette.dark
            }}>
              Нет размеченных бревен
            </Alert>
          ) : (
            <Table striped bordered hover size="sm" style={{ 
              backgroundColor: 'white',
              borderColor: colorPalette.border
            }}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th>Размер</th>
                  <th>Цвет</th>
                  <th>Количество</th>
                </tr>
              </thead>
              <tbody>
                {currentImageId && imagesData.find(data => data.id === currentImageId)?.logs.map(log => {
                  const count = imagesData.find(data => data.id === currentImageId)?.boardMarks.filter(mark => mark.logId === log.id).length;
                  if (count === 0) return null;
                  return (
                    <tr key={log.id} style={styles.tableRow}>
                      <td>{log.width}x{log.height} мм</td>
                      <td>
                        <div 
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: log.color,
                            display: 'inline-block',
                            marginRight: '10px',
                            border: `1px solid ${colorPalette.border}`,
                            borderRadius: '3px'
                          }}
                        />
                      </td>
                      <td>{count}</td>
                    </tr>
                  );
                }) || []}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: colorPalette.accentLight }}>
                  <td colSpan="2" className="text-end fw-bold">Всего:</td>
                  <td className="fw-bold">{currentImageId ? imagesData.find(data => data.id === currentImageId)?.boardMarks.length : 0}</td>
                </tr>
              </tfoot>
            </Table>
          )}
        </div>
      </>
    ) : (
      <div style={{ 
        ...styles.section,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colorPalette.background,
        height: isMobile ? '40vh' : '300px',
        textAlign: 'center'
      }}>
        <div>
          <p style={{ color: colorPalette.dark, marginBottom: '20px' }}>
            Загрузите фотографии для начала работы
          </p>
          <Button 
            style={styles.buttonPrimary}
            onClick={() => fileInputRef.current?.click()}
            className="hover-scale"
          >
            Выбрать файлы
          </Button>
        </div>
      </div>
    )}
  </>
);

  return (
    <Container className="my-4" style={styles.container}>
      <h1 className="text-center mb-4" style={{ color: colorPalette.primary }}>
        Учет досок на фотографии
      </h1>
      <Row className="mb-4">
        {(isMobile || window.innerWidth < 1000) ? (
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
            <Col lg={5} md={5}>
              {renderFormsSection()}
            </Col>
            <Col lg={6} md={7}>
              {renderImageSection()}
            </Col>
          </>
        )}
      </Row>
    </Container>
  );
}

export default App;