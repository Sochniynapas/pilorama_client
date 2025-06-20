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
  const [logs, setLogs] = useState([]);
  const [currentImageId, setCurrentImageId] = useState(null);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [length, setLength] = useState('');
  const [color, setColor] = useState(colorPalette.accent);
  const [selectedLog, setSelectedLog] = useState(null);
  const [globalMarkerSize, setGlobalMarkerSize] = useState(isMobile ? 40 : 20);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [documentNumber, setDocumentNumber] = useState('');
  const [isClick, setIsClick] = useState(true);
  const [initialDistance, setInitialDistance] = useState(null);
  const [pinchCenter, setPinchCenter] = useState({ x: 0, y: 0 });
  const [clickStartTime, setClickStartTime] = useState(0);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [dragSpeed, setDragSpeed] = useState(2.5);
  const [expandedImages, setExpandedImages] = useState(true);
  const [logsPanelOpen, setLogsPanelOpen] = useState(true);
  const [showMarkerPreview, setShowMarkerPreview] = useState(false);

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
      width: '100%',
      minHeight: '300px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
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
        boxShadow: `0 2px 6px ${colorPalette.primary}33`,
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
        file,
        boardMarks: [],
        name: `Фото ${imagesData.length + index + 1}`,
        markerSize: globalMarkerSize
      };
    });

    setImagesData(prev => [...prev, ...newImages]);
  };

  const deleteImage = (imageId, e) => {
    e.stopPropagation();
    const imageToDelete = imagesData.find(img => img.id === imageId);
    if (imageToDelete?.image?.startsWith('blob:')) {
      URL.revokeObjectURL(imageToDelete.image);
    }

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
  setImagesData(prev => prev.map(data => {
    if (data.id !== imageId) return data;

    // Фильтруем удаляемый маркер
    const filteredMarks = data.boardMarks.filter(mark => mark.id !== clickedMark.id);
    
    // Пересчитываем номера маркеров для того же logId
    const marksForLog = filteredMarks.filter(mark => mark.logId === clickedMark.logId)
      .sort((a, b) => a.number - b.number)
      .map((mark, index) => ({
        ...mark,
        number: index + 1
      }));
    
    // Сохраняем маркеры с другими logId без изменений
    const otherMarks = filteredMarks.filter(mark => mark.logId !== clickedMark.logId);
    
    return { 
      ...data, 
      boardMarks: [...otherMarks, ...marksForLog] 
    };
  }));
};

const processClick = (imageX, imageY, imageId) => {
  const currentImageData = imagesData.find(data => data.id === imageId);
  if (!currentImageData || !currentImageData.image) return;

  const clickRadius = (currentImageData.markerSize || globalMarkerSize) * 1.2;

  const clickedMark = currentImageData.boardMarks.find((mark) => {
    const distance = Math.sqrt((mark.x - imageX) ** 2 + (mark.y - imageY) ** 2);
    return distance <= clickRadius;
  });

  if (clickedMark) {
    deleteMark(clickedMark, imageId);
    return;
  }

  if (selectedLog) {
    // Получаем текущее количество маркеров для этого logId
    const marksForLog = currentImageData.boardMarks.filter(m => m.logId === selectedLog.id);
    
    const newMark = {
      id: Date.now(),
      x: imageX,
      y: imageY,
      logId: selectedLog.id,
      color: selectedLog.color,
      number: marksForLog.length + 1, // Используем длину отфильтрованного массива
    };

    setImagesData(prev => prev.map(data =>
      data.id === imageId
        ? { ...data, boardMarks: [...data.boardMarks, newMark] }
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
    const newZoom = Math.max(0.5, zoomLevel * delta);
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
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
      setInitialDistance(dist);
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      setPinchCenter({ 
        x: centerX - containerRect.left, 
        y: centerY - containerRect.top 
      });
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
        const newZoom = Math.max(0.5, zoomLevel * scale);
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        const containerRect = canvasContainerRef.current.getBoundingClientRect();
        const relativeCenterX = centerX - containerRect.left;
        const relativeCenterY = centerY - containerRect.top;
        const imgX = (relativeCenterX - canvasOffset.x) / zoomLevel;
        const imgY = (relativeCenterY - canvasOffset.y) / zoomLevel;
        const newOffsetX = relativeCenterX - imgX * newZoom;
        const newOffsetY = relativeCenterY - imgY * newZoom;

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
    if (width && height && length) {
      const newLog = {
        id: Date.now(),
        width: parseFloat(width),
        height: parseFloat(height),
        length: parseFloat(length),
        color,
      };
      setLogs(prev => [...prev, newLog]);
      setWidth('');
      setHeight('');
      setLength('');
    }
  };

  const deleteLog = (id) => {
    setLogs(prev => prev.filter(log => log.id !== id));
    setImagesData(prev => prev.map(imageData => ({
      ...imageData,
      boardMarks: imageData.boardMarks.filter(mark => mark.logId !== id)
    })));
    if (selectedLog?.id === id) {
      setSelectedLog(null);
    }
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
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      canvas.width = naturalWidth;
      canvas.height = naturalHeight;
      const containerWidth = container.clientWidth;
      const scale = containerWidth / naturalWidth;
      const displayHeight = naturalHeight * scale;
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvasOffset.x, canvasOffset.y);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.drawImage(img, 0, 0, naturalWidth, naturalHeight);
      
      if (currentImage.boardMarks?.length > 0) {
        currentImage.boardMarks.forEach((mark) => {
          const log = logs.find((l) => l.id === mark.logId);
          if (log) drawMark(ctx, mark.x, mark.y, log.color, mark.number, null, currentImage.id);
        });
      }
      
      if (showMarkerPreview) {
        const centerX = naturalWidth / 2;
        const centerY = naturalHeight / 2;
        const previewSize = (currentImage.markerSize || globalMarkerSize) * window.devicePixelRatio;
        ctx.beginPath();
        ctx.arc(centerX, centerY, previewSize, 0, 2 * Math.PI);
        ctx.fillStyle = color + '80';
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${previewSize * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', centerX, centerY);
      }
      ctx.restore();
    };
    
    img.onerror = () => console.error("Ошибка загрузки изображения");
    img.src = currentImage.image;
    imgRef.current = img;
  }, [currentImageId, imagesData, zoomLevel, canvasOffset, globalMarkerSize, showMarkerPreview, color, logs]);

  const drawMark = (ctx, x, y, color, number, size, imageId) => {
    const currentImage = imagesData.find(img => img.id === imageId);
    const markSizeInPixels = (currentImage?.markerSize || globalMarkerSize) * window.devicePixelRatio;
    ctx.beginPath();
    ctx.arc(x, y, markSizeInPixels, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
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

 const exportToExcel = async () => {
  if (imagesData.length === 0) {
    alert('Нет данных для экспорта');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  const addBorders = (sheet, startRow, endRow, startCol, endCol) => {
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const colChar = String.fromCharCode(64 + c);
        const cell = sheet.getCell(`${colChar}${r}`);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
  };

  const summarySheet = workbook.addWorksheet('Сводка');
  summarySheet.getCell('A1').value = `Документ №: ${documentNumber || 'Без номера'}`;
  summarySheet.getCell('A2').value = `Дата: ${formatDate(new Date())}`;
  summarySheet.getCell('A4').value = 'Изображение';
  summarySheet.getCell('B4').value = 'Размер доски';
  summarySheet.getCell('C4').value = 'Количество';
  summarySheet.getCell('D4').value = 'Цвет маркера';
  
  ['A', 'B', 'C', 'D'].forEach(col => {
    const cell = summarySheet.getCell(`${col}4`);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF196C2F' }
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { horizontal: 'center' };
  });

  const summaryData = {};
  let globalTotalCount = 0;

  const imagePromises = imagesData.map(async (imageData, index) => {
    const worksheet = workbook.addWorksheet(`Фото_${index + 1}`);
    worksheet.getCell('A1').value = `Документ №: ${documentNumber || 'Без номера'}`;
    worksheet.getCell('A2').value = `Дата: ${formatDate(new Date())}`;
    worksheet.getCell('A3').value = `Изображение: ${imageData.name}`;

    const logStats = {};
    let imageTotalCount = 0;
    
    imageData.boardMarks.forEach(mark => {
      const log = logs.find(l => l.id === mark.logId);
      if (log) {
        const key = `${log.width}x${log.height}x${log.length}`;
        if (!logStats[key]) {
          logStats[key] = {
            count: 0,
            color: log.color,
            size: key
          };
        }
        logStats[key].count++;
        imageTotalCount++;
        
        const summaryKey = `${imageData.name}|${key}`;
        if (!summaryData[summaryKey]) {
          summaryData[summaryKey] = {
            imageName: imageData.name,
            size: key,
            count: 0,
            color: log.color
          };
        }
        summaryData[summaryKey].count++;
        globalTotalCount++;
      }
    });

    let tableRow = 5;
    worksheet.getCell(`A${tableRow}`).value = 'Размер доски';
    worksheet.getCell(`B${tableRow}`).value = 'Количество';
    worksheet.getCell(`C${tableRow}`).value = 'Цвет';
    
    ['A', 'B', 'C'].forEach(col => {
      const cell = worksheet.getCell(`${col}${tableRow}`);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF196C2F' }
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      cell.alignment = { horizontal: 'center' };
    });

    worksheet.columns = [
      { key: 'size', width: 18 },
      { key: 'count', width: 12 },
      { key: 'color', width: 12 }
    ];

    tableRow++;
    Object.entries(logStats).forEach(([size, data]) => {
      worksheet.getCell(`A${tableRow}`).value = size;
      const colorCell = worksheet.getCell(`C${tableRow}`);
      colorCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: data.color.replace('#', 'FF') }
      };
      worksheet.getCell(`B${tableRow}`).value = data.count;
      tableRow++;
    });

    worksheet.getCell(`A${tableRow}`).value = 'Всего:';
    worksheet.getCell(`B${tableRow}`).value = imageTotalCount;
    worksheet.getCell(`B${tableRow}`).font = { bold: true };
    addBorders(worksheet, 5, tableRow, 1, 3);
    tableRow++;

    const imageStartRow = tableRow + 2;
    const imgWithMarks = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        tempCanvas.width = img.naturalWidth;
        tempCanvas.height = img.naturalHeight;
        tempCtx.drawImage(img, 0, 0);
        
        imageData.boardMarks.forEach(mark => {
          const log = logs.find(l => l.id === mark.logId);
          if (log) {
            const markSize = (imageData.markerSize || globalMarkerSize) * window.devicePixelRatio;
            tempCtx.beginPath();
            tempCtx.arc(mark.x, mark.y, markSize, 0, 2 * Math.PI);
            tempCtx.fillStyle = log.color;
            tempCtx.fill();
            tempCtx.fillStyle = '#fff';
            tempCtx.font = `bold ${markSize * 0.8}px Arial`;
            tempCtx.textAlign = 'center';
            tempCtx.textBaseline = 'middle';
            tempCtx.fillText(mark.number.toString(), mark.x, mark.y);
          }
        });
        resolve(tempCanvas.toDataURL('image/png'));
      };
      img.src = imageData.image;
    });

    const imageId = workbook.addImage({
      base64: imgWithMarks.split(',')[1],
      extension: 'png',
    });

    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageData.image;
    });

    const EXCEL_ROW_HEIGHT = 20;
    const EXCEL_COLUMN_WIDTH = 64;
    const imageRowSpan = Math.ceil(img.naturalHeight / EXCEL_ROW_HEIGHT);
    const imageColSpan = Math.ceil(img.naturalWidth / EXCEL_COLUMN_WIDTH);

    worksheet.addImage(imageId, {
      tl: { col: 1, row: imageStartRow },
      br: { col: 1 + imageColSpan, row: imageStartRow + imageRowSpan }
    });

    for (let i = imageStartRow; i < imageStartRow + imageRowSpan; i++) {
      worksheet.getRow(i).height = EXCEL_ROW_HEIGHT;
    }
  });

  await Promise.all(imagePromises);
  
  let summaryRow = 5;
  Object.values(summaryData).forEach(item => {
    summarySheet.getCell(`A${summaryRow}`).value = item.imageName;
    summarySheet.getCell(`B${summaryRow}`).value = item.size;
    summarySheet.getCell(`C${summaryRow}`).value = item.count;
    const colorCell = summarySheet.getCell(`D${summaryRow}`);
    colorCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: item.color.replace('#', 'FF') }
    };
    summaryRow++;
  });

  summarySheet.getCell(`B${summaryRow}`).value = 'Всего:';
  summarySheet.getCell(`C${summaryRow}`).value = globalTotalCount;
  summarySheet.getCell(`C${summaryRow}`).font = { bold: true };
  addBorders(summarySheet, 4, summaryRow, 1, 4);

  summarySheet.columns = [
    { key: 'image', width: 25 },
    { key: 'size', width: 18 },
    { key: 'count', width: 15 },
    { key: 'color', width: 15 }
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  const currentDate = formatDate(new Date());
  const fileName = `Учет досок_${documentNumber}_${currentDate}.xlsx`;
  saveAs(new Blob([buffer]), fileName);

  // Очистка данных после успешного экспорта
  setImagesData([]);
  setLogs([]);
  setCurrentImageId(null);
  setWidth('');
  setHeight('');
  setLength('');
  setColor(colorPalette.accent);
  setSelectedLog(null);
  setDocumentNumber('');
  setGlobalMarkerSize(isMobile ? 40 : 20);
  setZoomLevel(1);
  setCanvasOffset({ x: 0, y: 0 });
  localStorage.removeItem('appState');
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

  const saveFileToStorage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          base64: reader.result
        });
      };
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    const saveState = async () => {
      const imagesWithFileData = await Promise.all(
        imagesData.map(async (img) => {
          if (img.file) {
            const fileData = await saveFileToStorage(img.file);
            return { ...img, fileData };
          }
          return img;
        })
      );

      const stateToSave = {
        imagesData: imagesWithFileData.map(img => ({
          ...img,
          image: null,
          file: null,
          markerSize: img.markerSize || globalMarkerSize
        })),
        logs,
        currentImageId,
        width,
        height,
        length,
        color,
        selectedLog,
        globalMarkerSize,
        documentNumber,
      };
      
      localStorage.setItem('appState', JSON.stringify(stateToSave));
    };

    saveState();
  }, [imagesData, logs, currentImageId, width, height, length, color, selectedLog, globalMarkerSize, documentNumber]);

  const restoreFileFromStorage = (fileData) => {
    const byteString = atob(fileData.base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new File([ab], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified
    });
  };

  useEffect(() => {
    const loadSavedState = async () => {
      const savedState = localStorage.getItem('appState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        setLogs(parsedState.logs || []);
        setCurrentImageId(parsedState.currentImageId || null);
        setWidth(parsedState.width || '');
        setHeight(parsedState.height || '');
        setLength(parsedState.length || '');
        setColor(parsedState.color || colorPalette.accent);
        setSelectedLog(parsedState.selectedLog || null);
        setGlobalMarkerSize(parsedState.globalMarkerSize || (isMobile ? 40 : 20));
        setDocumentNumber(parsedState.documentNumber || '');
        
        if (parsedState.imagesData && parsedState.imagesData.length > 0) {
          const restoredImages = await Promise.all(
            parsedState.imagesData.map(async imgData => {
              if (imgData.fileData) {
                const file = restoreFileFromStorage(imgData.fileData);
                return {
                  ...imgData,
                  image: URL.createObjectURL(file),
                  file,
                  markerSize: imgData.markerSize || parsedState.globalMarkerSize || (isMobile ? 40 : 20)
                };
              }
              return imgData;
            })
          );
          setImagesData(restoredImages);
        }
      }
    };

    loadSavedState();
  }, []);

  useEffect(() => {
    return () => {
      imagesData.forEach(img => {
        if (img.image?.startsWith('blob:')) {
          URL.revokeObjectURL(img.image);
        }
      });
      
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.onerror = null;
        imgRef.current = null;
      }
    };
  }, []);

  const renderFormsSection = () => (
    <>
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
        <h4 style={{ color: colorPalette.primary }}>Добавить размер</h4>
        <Row className="g-2">
          <Col sm={3}>
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
          <Col sm={3}>
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
          <Col sm={3}>
            <Form.Group controlId="formLength" className="mb-3">
              <Form.Label>Длина (м)</Form.Label>
              <Form.Control 
                type="number" 
                value={length} 
                onChange={(e) => setLength(e.target.value)}
                style={styles.input}
              />
            </Form.Group>
          </Col>
          <Col sm={3} className="d-flex align-items-end mb-3">
            <Button 
              style={styles.buttonPrimary}
              onClick={addLog} 
              disabled={!width || !height || !length}
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
                  onClick={(e) => {
                    setLogsPanelOpen(!logsPanelOpen);
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => {
                    setLogsPanelOpen(!logsPanelOpen);
                    e.stopPropagation();
                  }}
                  onTouchMove={(e) => e.stopPropagation()}
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
                    {logsPanelOpen ? 'Скрыть список' : 'Доски'}
                  </span>
                  {logsPanelOpen && <i className="bi bi-x-lg"></i>}
                </Button>
                
                {logsPanelOpen && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                   style={{
                    backgroundColor: 'white',
                    border: `1px solid ${colorPalette.border}`,
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {logs.length === 0 ? (
                      <Alert variant="info" className="m-2" style={{ 
                        backgroundColor: colorPalette.background,
                        borderColor: colorPalette.border,
                        color: colorPalette.dark
                      }}>
                        Нет досок
                      </Alert>
                    ) : (
                      <Table hover size="sm" className="m-0">
                        <tbody>
                          {logs.map(log => (
                            <tr 
                              key={log.id} 
                              style={{ 
                                backgroundColor: selectedLog?.id === log.id 
                                  ? colorPalette.accentLight 
                                  : 'white',
                                cursor: 'pointer'
                              }}
                              onClick={(e) => {
                                handleLogSelect(log);
                                e.stopPropagation();
                              }}
                              onTouchEnd={(e) => {
                                handleLogSelect(log);
                                e.stopPropagation();
                              }}
                            >
                              <td style={{ 
                                padding: '8px',
                                borderColor: colorPalette.border,
                                fontWeight: selectedLog?.id === log.id ? 'bold' : 'normal'
                              }}>
                                {log.width}x{log.height}x{log.length} мм
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
                                  onTouchEnd={(e) => {
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
                  maxWidth: '100%',
                  imageRendering: 'pixelated',
                  cursor: isDragging ? 'grabbing' : 'pointer'
                }}
              />
            </div>

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
                <Form.Label>
                  Размер маркера: {currentImageId 
                    ? imagesData.find(img => img.id === currentImageId)?.markerSize || globalMarkerSize
                    : globalMarkerSize
                  }px
                  {currentImageId && (
                    <small className="text-muted ms-2">(только для этого изображения)</small>
                  )}
                </Form.Label>
                <Form.Range 
                  min="1" 
                  max="50" 
                  value={currentImageId 
                    ? imagesData.find(img => img.id === currentImageId)?.markerSize || globalMarkerSize
                    : globalMarkerSize
                  }
                  onChange={(e) => {
                    const newSize = parseInt(e.target.value);
                    if (currentImageId) {
                      setImagesData(prev => prev.map(img => 
                        img.id === currentImageId
                          ? { ...img, markerSize: newSize }
                          : img
                      ));
                    } else {
                      setGlobalMarkerSize(newSize);
                    }
                  }}
                  onMouseDown={() => setShowMarkerPreview(true)}
                  onMouseUp={() => setShowMarkerPreview(false)}
                  onTouchStart={() => setShowMarkerPreview(true)}
                  onTouchEnd={() => setShowMarkerPreview(false)}
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
            <h4 style={{ color: colorPalette.primary }}>Статистика по доскам</h4>
            {currentImageId && imagesData.find(data => data.id === currentImageId)?.boardMarks.length === 0 ? (
              <Alert variant="info" className="mb-0" style={{ 
                backgroundColor: colorPalette.background,
                borderColor: colorPalette.border,
                color: colorPalette.dark
              }}>
                Нет размеченных досок
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
                  {logs.map(log => {
                    const count = currentImageId 
                      ? imagesData.find(data => data.id === currentImageId)?.boardMarks.filter(mark => mark.logId === log.id).length 
                      : 0;
                    if (count === 0) return null;
                    return (
                      <tr key={log.id} style={styles.tableRow}>
                        <td>{log.width}x{log.height}x{log.length} мм</td>
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
                  })}
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
        </div>
      )}
    </>
  );

  return (
    <Container className="my-4" style={styles.container}>
      <h1 className="text-center mb-4" style={{ color: colorPalette.primary }}>
        Учет досок на фотографии
      </h1>
      <Row style={{justifyContent:'center'}} className="mb-4">
        {(isMobile || window.innerWidth < 1000) ? (
          <>
            <Col xs={12}>
              {renderImageSection()}
            </Col>
            <Col xs={12} className="mb-3">
              {renderFormsSection()}
            </Col>
          </>
        ) : (
          <>
            <Col xs={7}>
              {renderImageSection()}
            </Col>
            <Col xs={7} className="mb-3">
              {renderFormsSection()}
            </Col>
          </>
        )}
      </Row>
    </Container>
  );
}

export default App;