import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Table, Alert, Collapse } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { set, get } from 'idb-keyval';

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
const STORAGE_KEY = 'boardTrackingAppState';

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
  const [documentDate, setDocumentDate] = useState(new Date());

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorPreviewRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const clickTimerRef = useRef(null);
  const touchStartTime = useRef(0);
  const imageRefs = useRef({});

  const standardColors = [
    '#8B0000', '#006400', '#00008B', '#808000', 
    '#800080', '#008080', '#FF8C00', '#4B0082', 
    '#013220', '#301934'
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
      const imageUrl = URL.createObjectURL(file);
      
      const img = new Image();
      img.onload = () => {
        setImagesData(prev => prev.map(imgData => 
          imgData.id === imageId ? { ...imgData, loaded: true } : imgData
        ));
      };
      img.src = imageUrl;
      imageRefs.current[imageId] = img;
      
      return {
        id: imageId,
        image: imageUrl,
        file,
        boardMarks: [],
        name: `Фото ${imagesData.length + index + 1}`,
        plans: {},
        markerSize: globalMarkerSize,
        loaded: false,
        isRemainder: false
      };
    });

    setImagesData(prev => [...prev, ...newImages]);
  };

  const updateImagePlan = (imageId, logId, value) => {
    setImagesData(prev => prev.map(image => 
      image.id === imageId 
        ? { 
            ...image, 
            plans: {
              ...image.plans,
              [logId]: value === '' ? undefined : parseInt(value) || 0
            }
          } 
        : image
    ));
  };

  const deleteImage = (imageId, e) => {
    e.stopPropagation();
    const imageToDelete = imagesData.find(img => img.id === imageId);
    
    if (imageToDelete?.image?.startsWith('blob:')) {
      URL.revokeObjectURL(imageToDelete.image);
    }
    
    if (imageRefs.current[imageId]?.src?.startsWith('blob:')) {
      URL.revokeObjectURL(imageRefs.current[imageId].src);
      delete imageRefs.current[imageId];
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

      const filteredMarks = data.boardMarks.filter(mark => mark.id !== clickedMark.id);
      
      const marksForLog = filteredMarks
        .filter(mark => mark.logId === clickedMark.logId)
        .sort((a, b) => a.number - b.number)
        .map((mark, index) => ({
          ...mark,
          number: index + 1
        }));
      
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
      const marksForLog = currentImageData.boardMarks
        .filter(m => m.logId === selectedLog.id)
        .sort((a, b) => a.number - b.number);
      
      const maxNumber = marksForLog.length > 0 
        ? Math.max(...marksForLog.map(m => m.number)) 
        : 0;
      const nextNumber = maxNumber + 1;

      const newMark = {
        id: Date.now(),
        x: imageX,
        y: imageY,
        logId: selectedLog.id,
        color: selectedLog.color,
        number: nextNumber,
      };

      setImagesData(prev => prev.map(data =>
        data.id === imageId
          ? { ...data, boardMarks: [...data.boardMarks, newMark] }
          : data
      ));
    }
  };

  const handleDesktopClick = (e, imageId) => {
    try {
      if (!imageId || !isClick || isDragging || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      if (!rect) return;
      
      const currentImage = imagesData.find(data => data.id === currentImageId);
      if (!currentImage) return;
      
      const img = imageRefs.current[currentImageId];
      if (!img) return;
      
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const imageX = ((clientX * scaleX) - canvasOffset.x) / zoomLevel;
      const imageY = ((clientY * scaleY) - canvasOffset.y) / zoomLevel;
      
      processClick(imageX, imageY, imageId);
    } catch (error) {
      console.error('Error in handleDesktopClick:', error);
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
      setClickStartTime(Date.now());
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
    
    if (!isDragging && e.changedTouches?.length === 1) {
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
    try {
      if (isDragging || !selectedLog || !currentImageId) return;
      
      if (e.processed) return;
      e.processed = true;
      
      const touch = e.touches?.[0] || e.changedTouches?.[0];
      if (!touch) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      if (!rect) return;
      
      const currentImage = imagesData.find(data => data.id === currentImageId);
      if (!currentImage) return;
      
      const img = imageRefs.current[currentImageId];
      if (!img) return;
      
      const imageWidth = img.naturalWidth;
      const imageHeight = img.naturalHeight;
      
      const clientX = (touch.clientX - rect.left) * window.devicePixelRatio;
      const clientY = (touch.clientY - rect.top) * window.devicePixelRatio;
      
      const scaleX = canvas.width / (rect.width * window.devicePixelRatio);
      const scaleY = canvas.height / (rect.height * window.devicePixelRatio);
      
      const imageX = ((clientX * scaleX) - canvasOffset.x) / zoomLevel;
      const imageY = ((clientY * scaleY) - canvasOffset.y) / zoomLevel;
      
      if (imageX >= 0 && imageY >= 0 && imageX <= imageWidth && imageY <= imageHeight) {
        processClick(imageX, imageY, imageId);
      }
    } catch (error) {
      console.error('Error in handleMobileClick:', error);
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

  const saveFileToIndexedDB = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          data: reader.result
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const restoreFileFromIndexedDB = (fileData) => {
    return new File([fileData.data], fileData.name, {
      type: fileData.type,
      lastModified: fileData.lastModified
    });
  };

  useEffect(() => {
    if (!currentImageId || !imagesData.length) return;
    
    const currentImage = imagesData.find(data => data.id === currentImageId);
    if (!currentImage || !currentImage.image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = canvasContainerRef.current;
    
    const img = imageRefs.current[currentImageId];
    if (!img) return;

    if (!img.complete || img.naturalWidth === 0) {
      img.onload = () => {
        drawCanvas(canvas, ctx, container, img, currentImage);
      };
      return;
    }

    drawCanvas(canvas, ctx, container, img, currentImage);
  }, [currentImageId, imagesData, zoomLevel, canvasOffset, globalMarkerSize, showMarkerPreview, color, logs]);

  const drawCanvas = (canvas, ctx, container, img, currentImage) => {
    try {
      if (!canvas || !ctx || !container || !img || !currentImage) return;
      
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
          if (log) {
            drawMark(ctx, mark.x, mark.y, log.color, mark.number, null, currentImage.id);
          }
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
    } catch (error) {
      console.error('Error in drawCanvas:', error);
    }
  };

  const drawMark = (ctx, x, y, color, number, size, imageId) => {
    try {
      if (!ctx) return;
      
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
    } catch (error) {
      console.error('Error in drawMark:', error);
    }
  };

  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}.${date.getFullYear()}`;
  };

 const exportToExcel = async () => {
  try {
    if (imagesData.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }

    if (!documentNumber) {
      alert('Пожалуйста, укажите номер документа');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const formattedDate = formatDate(documentDate);

    const headerStyle = {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF196C2F' }
      },
      font: {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      },
      alignment: { 
        horizontal: 'center',
        vertical: 'center',
        wrapText: true
      },
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
    };

    const centeredCellStyle = {
      border: {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      },
      alignment: {
        horizontal: 'center',
        vertical: 'center',
        wrapText: true
      }
    };

    const summarySheet = workbook.addWorksheet('Сводка');
    
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `Документ №: ${documentNumber}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'center' };
    
    const dateCell = summarySheet.getCell('A2');
    dateCell.value = `Дата: ${formattedDate}`;
    dateCell.font = { bold: true };
    dateCell.alignment = { horizontal: 'left', vertical: 'center' };

    const globalSummary = {};
    const imageSummaryData = [];

    logs.forEach(log => {
      const key = `${log.width}x${log.height}x${log.length}`;
      globalSummary[key] = {
        count: 0,
        remainder: 0,
        plan: 0,
        color: log.color
      };
    });

    for (const [index, imageData] of imagesData.entries()) {
      const worksheet = workbook.addWorksheet(`Фото_${index + 1}`);
      
      worksheet.properties.defaultColWidth = 15;
      worksheet.views = [{ state: 'frozen', ySplit: 4 }];
      
      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').value = `Документ №: ${documentNumber}`;
      worksheet.getCell('A2').value = `Дата: ${formattedDate}`;
      worksheet.getCell('A3').value = `Изображение: ${imageData.name}${imageData.isRemainder ? ' (Остаток)' : ''}`;
      
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };
      worksheet.getCell('A2').font = { bold: true };
      worksheet.getCell('A3').font = { bold: true };

      const logStats = {};
      logs.forEach(log => {
        const key = `${log.width}x${log.height}x${log.length}`;
        logStats[key] = {
          count: 0,
          plan: imageData.plans?.[log.id] || 0,
          color: log.color,
          isRemainder: imageData.isRemainder
        };
      });

      imageData.boardMarks.forEach(mark => {
        const log = logs.find(l => l.id === mark.logId);
        if (log) {
          const key = `${log.width}x${log.height}x${log.length}`;
          logStats[key].count++;
          
          if (imageData.isRemainder) {
            globalSummary[key].remainder += 1;
          } else {
            globalSummary[key].count += 1;
          }
        }
      });

      logs.forEach(log => {
        const key = `${log.width}x${log.height}x${log.length}`;
        if (imageData.plans?.[log.id]) {
          if (imageData.isRemainder) {
            globalSummary[key].plan -= imageData.plans[log.id];
          } else {
            globalSummary[key].plan += imageData.plans[log.id];
          }
        }
      });

      let tableRow = 5;
      
      worksheet.getCell(`A${tableRow}`).value = 'Размер доски';
      worksheet.getCell(`B${tableRow}`).value = 'План';
      worksheet.getCell(`C${tableRow}`).value = 'Факт';
      worksheet.getCell(`D${tableRow}`).value = 'Отклонение';
      worksheet.getCell(`E${tableRow}`).value = 'Цвет';
      
      ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        const cell = worksheet.getCell(`${col}${tableRow}`);
        Object.assign(cell, headerStyle);
      });

      tableRow++;
      
      Object.entries(logStats).forEach(([size, data]) => {
        if (data.count === 0 && data.plan === 0) return;

        const factValue = data.isRemainder ? -data.count : data.count;
        const planValue = data.isRemainder ? -data.plan : data.plan;
        const deviation = factValue - planValue;

        worksheet.getCell(`A${tableRow}`).value = size;
        worksheet.getCell(`B${tableRow}`).value = planValue;
        worksheet.getCell(`C${tableRow}`).value = factValue;
        worksheet.getCell(`D${tableRow}`).value = deviation;
        
        const deviationCell = worksheet.getCell(`D${tableRow}`);
        if (deviation > 0) {
          deviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
        } else if (deviation < 0) {
          deviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
        }
        
        const colorCell = worksheet.getCell(`E${tableRow}`);
        colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: data.color.replace('#', 'FF') } };
        
        ['A', 'B', 'C', 'D', 'E'].forEach(col => {
          Object.assign(worksheet.getCell(`${col}${tableRow}`), centeredCellStyle);
        });
        
        imageSummaryData.push({
          imageName: imageData.name,
          size: size,
          count: data.count,
          plan: data.plan,
          color: data.color,
          isRemainder: data.isRemainder
        });
        
        tableRow++;
      });

      const totalPlan = Object.values(logStats).reduce((sum, item) => sum + (item.isRemainder ? -item.plan : item.plan), 0);
      const totalFact = Object.values(logStats).reduce((sum, item) => sum + (item.isRemainder ? -item.count : item.count), 0);
      const totalDeviation = totalFact - totalPlan;

      worksheet.getCell(`A${tableRow}`).value = 'Всего:';
      worksheet.getCell(`B${tableRow}`).value = totalPlan;
      worksheet.getCell(`C${tableRow}`).value = totalFact;
      worksheet.getCell(`D${tableRow}`).value = totalDeviation;
      
      const totalDeviationCell = worksheet.getCell(`D${tableRow}`);
      if (totalDeviation > 0) {
        totalDeviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
      } else if (totalDeviation < 0) {
        totalDeviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
      }
      
      worksheet.getCell(`B${tableRow}`).font = { bold: true };
      worksheet.getCell(`C${tableRow}`).font = { bold: true };
      worksheet.getCell(`D${tableRow}`).font = { bold: true };
      ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        Object.assign(worksheet.getCell(`${col}${tableRow}`), centeredCellStyle);
      });

      try {
        const img = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = imageData.image;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        imageData.boardMarks.forEach(mark => {
          const log = logs.find(l => l.id === mark.logId);
          if (log) {
            const markSize = imageData.markerSize || globalMarkerSize;
            ctx.beginPath();
            ctx.arc(mark.x, mark.y, markSize, 0, 2 * Math.PI);
            ctx.fillStyle = log.color;
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${markSize * 0.7}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(mark.number.toString(), mark.x, mark.y);
          }
        });

        const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
        const imageId = workbook.addImage({
          base64: imageBase64,
          extension: 'png',
        });

        const availableRows = 54;
        const rowHeight = 15;
        const maxHeightInPoints = availableRows * rowHeight;
        
        const scaleFactor = maxHeightInPoints / img.naturalHeight;
        const desiredWidthInPoints = img.naturalWidth * scaleFactor;
        const desiredHeightInPoints = maxHeightInPoints;

        worksheet.addImage(imageId, {
          tl: { col: 0, row: 11 },
          ext: { width: desiredWidthInPoints, height: desiredHeightInPoints }
        });

        for (let i = 11; i < availableRows; i++) {
          worksheet.getRow(i + 1).height = rowHeight;
        }

        const colsNeeded = Math.ceil(desiredWidthInPoints / (10 * 7));
        for (let i = 1; i <= colsNeeded; i++) {
          worksheet.getColumn(i).width = 10;
        }
      } catch (error) {
        worksheet.getCell('A11').value = 'Не удалось загрузить изображение';
        Object.assign(worksheet.getCell('A11'), centeredCellStyle);
      }
    }

    summarySheet.getCell('A4').value = 'Общий итог';
    summarySheet.mergeCells('A4:E4');
    summarySheet.getCell('A5').value = 'Размер доски';
    summarySheet.getCell('B5').value = 'План';
    summarySheet.getCell('C5').value = 'Факт';
    summarySheet.getCell('D5').value = 'Отклонение';
    summarySheet.getCell('E5').value = 'Цвет';

    ['A4', 'B4', 'C4', 'D4', 'E4'].forEach(cellAddress => {
      const cell = summarySheet.getCell(cellAddress);
      Object.assign(cell, headerStyle);
    });

    let globalSummaryRow = 6;
    let totalGlobalPlan = 0;
    let totalGlobalFact = 0;

    Object.entries(globalSummary).forEach(([size, data]) => {
      if (data.count === 0 && data.remainder === 0 && data.plan === 0) return;

      const factValue = data.count - data.remainder;
      const planValue = data.plan;
      const deviation = factValue - planValue;

      summarySheet.getCell(`A${globalSummaryRow}`).value = size;
      summarySheet.getCell(`B${globalSummaryRow}`).value = planValue;
      summarySheet.getCell(`C${globalSummaryRow}`).value = factValue;
      summarySheet.getCell(`D${globalSummaryRow}`).value = deviation;
      
      const deviationCell = summarySheet.getCell(`D${globalSummaryRow}`);
      if (deviation > 0) {
        deviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
      } else if (deviation < 0) {
        deviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
      }
      
      const colorCell = summarySheet.getCell(`E${globalSummaryRow}`);
      colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: data.color.replace('#', 'FF') } };
      
      ['A', 'B', 'C', 'D', 'E'].forEach(col => {
        Object.assign(summarySheet.getCell(`${col}${globalSummaryRow}`), centeredCellStyle);
      });

      totalGlobalPlan += planValue;
      totalGlobalFact += factValue;
      
      globalSummaryRow++;
    });

    const totalGlobalDeviation = totalGlobalFact - totalGlobalPlan;

    summarySheet.getCell(`A${globalSummaryRow}`).value = 'Всего:';
    summarySheet.getCell(`B${globalSummaryRow}`).value = totalGlobalPlan;
    summarySheet.getCell(`C${globalSummaryRow}`).value = totalGlobalFact;
    summarySheet.getCell(`D${globalSummaryRow}`).value = totalGlobalDeviation;
    
    const totalDeviationCell = summarySheet.getCell(`D${globalSummaryRow}`);
    if (totalGlobalDeviation > 0) {
      totalDeviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    } else if (totalGlobalDeviation < 0) {
      totalDeviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
    }
    
    summarySheet.getCell(`B${globalSummaryRow}`).font = { bold: true };
    summarySheet.getCell(`C${globalSummaryRow}`).font = { bold: true };
    summarySheet.getCell(`D${globalSummaryRow}`).font = { bold: true };
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      Object.assign(summarySheet.getCell(`${col}${globalSummaryRow}`), centeredCellStyle);
    });

    const imageSummaryStartRow = globalSummaryRow + 2;
    summarySheet.getCell(`A${imageSummaryStartRow}`).value = 'Изображение';
    summarySheet.getCell(`B${imageSummaryStartRow}`).value = 'Размер доски';
    summarySheet.getCell(`C${imageSummaryStartRow}`).value = 'План';
    summarySheet.getCell(`D${imageSummaryStartRow}`).value = 'Факт';
    summarySheet.getCell(`E${imageSummaryStartRow}`).value = 'Отклонение';
    summarySheet.getCell(`F${imageSummaryStartRow}`).value = 'Цвет';
    
    ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
      const cell = summarySheet.getCell(`${col}${imageSummaryStartRow}`);
      Object.assign(cell, headerStyle);
    });

    let summaryRow = imageSummaryStartRow + 1;
    imageSummaryData.forEach(item => {
      if (item.count === 0 && item.plan === 0) return;

      const factValue = item.isRemainder ? -item.count : item.count;
      const planValue = item.isRemainder ? -item.plan : item.plan;
      const deviation = factValue - planValue;

      summarySheet.getCell(`A${summaryRow}`).value = item.imageName;
      summarySheet.getCell(`B${summaryRow}`).value = item.size;
      summarySheet.getCell(`C${summaryRow}`).value = planValue;
      summarySheet.getCell(`D${summaryRow}`).value = factValue;
      summarySheet.getCell(`E${summaryRow}`).value = deviation;
      
      const deviationCell = summarySheet.getCell(`E${summaryRow}`);
      if (deviation > 0) {
        deviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
      } else if (deviation < 0) {
        deviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
      }
      
      const colorCell = summarySheet.getCell(`F${summaryRow}`);
      colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.color.replace('#', 'FF') } };
      
      ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
        Object.assign(summarySheet.getCell(`${col}${summaryRow}`), centeredCellStyle);
      });
      
      summaryRow++;
    });

    const totalImagePlan = imageSummaryData.reduce((sum, item) => sum + (item.isRemainder ? -item.plan : item.plan), 0);
    const totalImageFact = imageSummaryData.reduce((sum, item) => sum + (item.isRemainder ? -item.count : item.count), 0);
    const totalImageDeviation = totalImageFact - totalImagePlan;

    summarySheet.getCell(`B${summaryRow}`).value = 'Всего:';
    summarySheet.getCell(`C${summaryRow}`).value = totalImagePlan;
    summarySheet.getCell(`D${summaryRow}`).value = totalImageFact;
    summarySheet.getCell(`E${summaryRow}`).value = totalImageDeviation;
    
    const totalImageDeviationCell = summarySheet.getCell(`E${summaryRow}`);
    if (totalImageDeviation > 0) {
      totalImageDeviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
    } else if (totalImageDeviation < 0) {
      totalImageDeviationCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCFFCC' } };
    }
    
    summarySheet.getCell(`C${summaryRow}`).font = { bold: true };
    summarySheet.getCell(`D${summaryRow}`).font = { bold: true };
    summarySheet.getCell(`E${summaryRow}`).font = { bold: true };
    ['B', 'C', 'D', 'E', 'F'].forEach(col => {
      Object.assign(summarySheet.getCell(`${col}${summaryRow}`), centeredCellStyle);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${documentNumber}_${formattedDate.replace(/\./g, '-')}.xlsx`;
    saveAs(new Blob([buffer]), fileName);

    clearAllData();

  } catch (error) {
    console.error('Ошибка при экспорте в Excel:', error);
    alert('Произошла ошибка при создании Excel файла');
  }
};

  const clearAllData = () => {
    imagesData.forEach(img => {
      if (img.image?.startsWith('blob:')) {
        URL.revokeObjectURL(img.image);
      }
    });

    Object.values(imageRefs.current).forEach(img => {
      if (img.src?.startsWith('blob:')) {
        URL.revokeObjectURL(img.src);
      }
    });
    imageRefs.current = {};

    setImagesData([]);
    setLogs([]);
    setCurrentImageId(null);
    setWidth('');
    setHeight('');
    setLength('');
    setColor(colorPalette.accent);
    setSelectedLog(null);
    setGlobalMarkerSize(isMobile ? 40 : 20);
    setZoomLevel(1);
    setCanvasOffset({ x: 0, y: 0 });
    setDocumentNumber('');
    setDocumentDate(new Date());

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    set(STORAGE_KEY, null).catch(e => console.error("Ошибка очистки IndexedDB:", e));
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

  useEffect(() => {
    const saveState = async () => {
      try {
        const imagesToSave = await Promise.all(
          imagesData.map(async (img) => {
            if (img.file) {
              const fileData = await saveFileToIndexedDB(img.file);
              return {
                ...img,
                fileData: fileData,
                image: null,
                plans: img.plans || {},
                file: null,
                isRemainder: img.isRemainder || false
              };
            }
            return img;
          })
        );

        const stateToSave = {
          imagesData: imagesToSave,
          logs,
          currentImageId,
          width,
          height,
          length,
          color,
          selectedLog,
          globalMarkerSize,
          documentNumber,
          documentDate: documentDate.toISOString()
        };

        await set(STORAGE_KEY, stateToSave);
      } catch (e) {
        console.error("Ошибка сохранения состояния:", e);
      }
    };

    const save = async () => {
      await saveState();
    };
    
    save();
  }, [imagesData, logs, currentImageId, width, height, length, color, selectedLog, globalMarkerSize, documentNumber, documentDate]);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedState = await get(STORAGE_KEY);
        if (savedState) {
          setLogs(savedState.logs || []);
          setCurrentImageId(savedState.currentImageId || null);
          setWidth(savedState.width || '');
          setHeight(savedState.height || '');
          setLength(savedState.length || '');
          setColor(savedState.color || colorPalette.accent);
          setSelectedLog(savedState.selectedLog || null);
          setGlobalMarkerSize(savedState.globalMarkerSize || (isMobile ? 40 : 20));
          setDocumentNumber(savedState.documentNumber || '');
          setDocumentDate(savedState.documentDate ? new Date(savedState.documentDate) : new Date());
          
          if (savedState.imagesData && savedState.imagesData.length > 0) {
            const restoredImages = await Promise.all(
              savedState.imagesData.map(async imgData => {
                if (imgData.fileData) {
                  try {
                    const response = await fetch(imgData.fileData.data);
                    const blob = await response.blob();
                    const file = new File([blob], imgData.fileData.name, {
                      type: imgData.fileData.type,
                      lastModified: imgData.fileData.lastModified
                    });
                    
                    const imageUrl = URL.createObjectURL(file);
                    
                    const img = new Image();
                    img.src = imageUrl;
                    imageRefs.current[imgData.id] = img;
                    
                    return {
                      ...imgData,
                      image: imageUrl,
                      file: file,
                      markerSize: imgData.markerSize || savedState.globalMarkerSize || (isMobile ? 40 : 20),
                      isRemainder: imgData.isRemainder || false
                    };
                  } catch (e) {
                    console.error("Ошибка восстановления файла:", e);
                    return null;
                  }
                }
                return null;
              })
            );
            
            setImagesData(restoredImages.filter(img => img !== null));
          }
        }
      } catch (e) {
        console.error("Ошибка загрузки состояния:", e);
      }
    };

    const load = async () => {
      await loadSavedState();
    };
    
    load();
  }, []);

  useEffect(() => {
    return () => {
      imagesData.forEach(img => {
        if (img.image?.startsWith('blob:')) {
          URL.revokeObjectURL(img.image);
        }
      });
      
      Object.values(imageRefs.current).forEach(img => {
        if (img.src?.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });
      imageRefs.current = {};
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
                        <img src={imgData.image} alt="Превью" style={styles.imagePreview} 
                        onError={(e) => {
                          if (imgData.file) {
                            const newUrl = URL.createObjectURL(imgData.file);
                            e.target.src = newUrl;
                            setImagesData(prev => prev.map(img => 
                              img.id === imgData.id ? { ...img, image: newUrl } : img
                            ));
                          }
                        }}/>
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
        <Row className="g-2 mb-3">
          <Col sm={6}>
            <Form.Group controlId="formDocNumber">
              <Form.Label>Номер документа</Form.Label>
              <Form.Control 
                type="text" 
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Введите номер документа"
                style={styles.input}
              />
            </Form.Group>
          </Col>
          <Col sm={6}>
            <Form.Group controlId="formDocDate">
              <Form.Label>Дата документа</Form.Label>
              <Form.Control 
                type="date" 
                value={documentDate.toISOString().split('T')[0]}
                onChange={(e) => setDocumentDate(new Date(e.target.value))}
                style={styles.input}
              />
            </Form.Group>
          </Col>
        </Row>
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

              <Form.Group controlId="formIsRemainder" className="mb-3">
                <Form.Check 
                  type="checkbox"
                  label="Это остаток (учитывать с минусом)"
                  checked={currentImageId ? imagesData.find(img => img.id === currentImageId)?.isRemainder || false : false}
                  onChange={(e) => {
                    if (currentImageId) {
                      setImagesData(prev => prev.map(img => 
                        img.id === currentImageId
                          ? { ...img, isRemainder: e.target.checked }
                          : img
                      ));
                    }
                  }}
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
                    <th>План</th>
                    <th>Факт</th>
                    <th>Отклонение</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const currentImage = imagesData.find(data => data.id === currentImageId);
                    const count = currentImage?.boardMarks.filter(mark => mark.logId === log.id).length || 0;
                    const isRemainder = currentImage?.isRemainder || false;
                    const multiplier = isRemainder ? -1 : 1;
                    const plan = currentImage?.plans?.[log.id] ?? '';
                    
                    if (count === 0 && !plan) return null;
                    
                    const deviation = (count - (plan === '' ? 0 : plan)) * multiplier;
                    const deviationColor = deviation > 0 ? '#ffcccc' : deviation < 0 ? '#ccffcc' : 'transparent';
                    
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
                        <td>
                          <Form.Control 
                            type="number" 
                            min="0"
                            value={plan}
                            onChange={(e) => updateImagePlan(currentImageId, log.id, e.target.value)}
                            style={{ 
                              width: '80px',
                              border: `1px solid ${colorPalette.border}`,
                              backgroundColor: 'white'
                            }}
                          />
                        </td>
                        <td>{count * multiplier}</td>
                        <td style={{ backgroundColor: deviationColor }}>
                          {deviation > 0 ? `+${deviation}` : deviation}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: colorPalette.accentLight }}>
                    <td colSpan="2" className="text-end fw-bold">Всего:</td>
                    <td className="fw-bold">
                      {Object.values(imagesData.find(data => data.id === currentImageId)?.plans || {})
                        .reduce((sum, plan) => sum + (plan || 0), 0) *
                        (imagesData.find(data => data.id === currentImageId)?.isRemainder ? -1 : 1)}
                    </td>
                    <td className="fw-bold">
                      {(
                        (currentImageId 
                          ? imagesData.find(data => data.id === currentImageId)?.boardMarks.length || 0 
                          : 0) * 
                        (imagesData.find(data => data.id === currentImageId)?.isRemainder ? -1 : 1)
                      )}
                    </td>
                    <td className="fw-bold">
                      {(
                        (
                          (currentImageId 
                            ? imagesData.find(data => data.id === currentImageId)?.boardMarks.length || 0 
                            : 0) * 
                          (imagesData.find(data => data.id === currentImageId)?.isRemainder ? -1 : 1)
                        ) - (
                          Object.values(imagesData.find(data => data.id === currentImageId)?.plans || {})
                            .reduce((sum, plan) => sum + (plan || 0), 0) * 
                          (imagesData.find(data => data.id === currentImageId)?.isRemainder ? -1 : 1)
                        )
                      )}
                    </td>
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