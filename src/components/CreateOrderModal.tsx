import { useEffect, useState, FormEvent, useRef } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  runTransaction,
  doc,
  setDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { 
  X, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  User, 
  Phone, 
  Car, 
  Fingerprint, 
  Calendar, 
  Zap, 
  Tag, 
  ChevronDown, 
  ClipboardList,
  Camera,
  Sparkles,
  Loader2,
  CheckCircle2,
  UploadCloud,
  AlertCircle,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ItemStatus, Client } from '../types';
import { cn, formatCurrency, parseSafeNumber } from '../lib/utils';
import { 
  parseTechPassport, 
  parsePartsPhoto, 
  fileToBase64, 
  ParsedPartItem 
} from '../lib/geminiVision';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewOrderItem {
  id: string;
  productId?: string;
  partNumber: string;
  brand: string;
  productName: string;
  quantity: number;
  costPrice: string | number;
  sellingPrice: string | number;
  supplier: string;
  deliveryTime?: string;
  status: ItemStatus;
}

export default function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
  const [modalWidth, setModalWidth] = useState(1200);

  const handleResize = (e: any, direction: 'left' | 'right') => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = modalWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = direction === 'right' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
      setModalWidth(Math.max(800, Math.min(window.innerWidth * 0.95, startWidth + delta * 2)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const [products, setProducts] = useState<Product[]>([]);
  
  // Order Header Data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [carModel, setCarModel] = useState('');
  const [vin, setVin] = useState('');
  const [carYear, setCarYear] = useState('');
  const [engineVolume, setEngineVolume] = useState('');
  const [detectedPlate, setDetectedPlate] = useState('');

  // AI Tech Passport state
  const techPassportInputRef = useRef<HTMLInputElement>(null);
  const [techPassportPreview, setTechPassportPreview] = useState<string | null>(null);
  const [isParsingTechPassport, setIsParsingTechPassport] = useState(false);
  const [techPassportStatus, setTechPassportStatus] = useState<string | null>(null);
  const [techPassportError, setTechPassportError] = useState<string | null>(null);
  const [techPassportDetectedInfo, setTechPassportDetectedInfo] = useState<string | null>(null);

  // Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Order Items Table
  const generateEmptyRow = (): NewOrderItem => ({
    id: Math.random().toString(36).substr(2, 9),
    partNumber: '',
    brand: '',
    productName: '',
    quantity: 1,
    costPrice: '',
    sellingPrice: '',
    supplier: '',
    status: 'Pending'
  });

  const getInitialItems = () => Array.from({ length: 5 }, generateEmptyRow);

  const [items, setItems] = useState<NewOrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Fast items paste / photo parsing state
  const [isPastingList, setIsPastingList] = useState(false);
  const [pasteMode, setPasteMode] = useState<'text' | 'photo'>('text');
  const [pasteText, setPasteText] = useState('');

  // AI Parts photo parser state
  const partsPhotoInputRef = useRef<HTMLInputElement>(null);
  const [isPhotoParsing, setIsPhotoParsing] = useState(false);
  const [partsPhotoPreview, setPartsPhotoPreview] = useState<string | null>(null);
  const [parsedPartsPreview, setParsedPartsPreview] = useState<ParsedPartItem[]>([]);
  const [partsPhotoError, setPartsPhotoError] = useState<string | null>(null);
  const [partsPhotoSummary, setPartsPhotoSummary] = useState<string | null>(null);

  // Handle tech passport recognition
  const handleTechPassportFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Будь ласка, завантажте файл зображення (JPG, PNG, WebP тощо)');
      return;
    }
    
    try {
      setIsParsingTechPassport(true);
      setTechPassportError(null);
      setTechPassportStatus('ШІ Gemini аналізує техпаспорт...');
      
      const { base64, mimeType } = await fileToBase64(file);
      setTechPassportPreview(`data:${mimeType};base64,${base64}`);

      const result = await parseTechPassport(base64, mimeType);
      
      if (result.error) {
        setTechPassportError(result.error);
        setTechPassportStatus(null);
        return;
      }

      if (result.carModel) setCarModel(result.carModel);
      if (result.vin) setVin(result.vin.toUpperCase().trim());
      if (result.year) setCarYear(result.year.trim());
      if (result.engine) setEngineVolume(result.engine.trim());
      if (result.plateNumber) setDetectedPlate(result.plateNumber.trim());
      if (result.ownerName && (!customerName || customerName.trim() === '')) {
        setCustomerName(result.ownerName);
      }

      const summaryParts = [
        result.carModel,
        result.year ? `${result.year} р.` : '',
        result.engine,
        result.plateNumber ? `Д/Н: ${result.plateNumber}` : '',
        result.vin ? `VIN: ${result.vin}` : ''
      ].filter(Boolean).join(' • ');

      setTechPassportDetectedInfo(summaryParts || 'Дані успішно витягнуто');
      setTechPassportStatus('Дані автомобіля успішно розпізнано та внесено у форму!');
    } catch (err: any) {
      console.warn('Techpassport recognition note:', err?.message || err);
      setTechPassportError(err?.message || 'Не вдалося розпізнати техпаспорт');
      setTechPassportStatus(null);
    } finally {
      setIsParsingTechPassport(false);
    }
  };

  const handleClearTechPassport = () => {
    setTechPassportPreview(null);
    setTechPassportStatus(null);
    setTechPassportError(null);
    setTechPassportDetectedInfo(null);
    setDetectedPlate('');
    if (techPassportInputRef.current) {
      techPassportInputRef.current.value = '';
    }
  };

  // Handle parts photo recognition
  const handlePartsPhotoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Будь ласка, завантажте зображення списку запчастин (JPG, PNG, WebP тощо)');
      return;
    }

    try {
      setIsPhotoParsing(true);
      setPartsPhotoError(null);
      setPartsPhotoSummary('ШІ Gemini сканує список деталей з фото...');
      
      const { base64, mimeType } = await fileToBase64(file);
      setPartsPhotoPreview(`data:${mimeType};base64,${base64}`);

      const result = await parsePartsPhoto(base64, mimeType);
      
      if (result.error) {
        setPartsPhotoError(result.error);
        setPartsPhotoSummary(null);
        setParsedPartsPreview([]);
        return;
      }

      if (!result.items || result.items.length === 0) {
        setPartsPhotoError('ШІ не знайшов запчастин на фото. Спробуйте чіткіше фото або скористайтесь ручним введенням.');
        setParsedPartsPreview([]);
      } else {
        setParsedPartsPreview(result.items);
        setPartsPhotoSummary(result.rawSummary || `Розпізнано ${result.items.length} запчастин`);
      }
    } catch (err: any) {
      console.warn('Parts photo recognition note:', err?.message || err);
      setPartsPhotoError(err?.message || 'Помилка під час аналізу фото списку');
      setParsedPartsPreview([]);
    } finally {
      setIsPhotoParsing(false);
    }
  };

  const applyParsedPartsToTable = () => {
    if (parsedPartsPreview.length === 0) return;

    const newItems: NewOrderItem[] = parsedPartsPreview.map(item => {
      const cost = item.estimatedPrice || '';
      const sell = item.estimatedPrice ? Math.round(Number(item.estimatedPrice) * 1.25) : '';
      return {
        id: Date.now().toString() + Math.random().toString(),
        partNumber: (item.partNumber || '').toUpperCase().trim(),
        brand: item.brand || '',
        productName: item.productName || 'Запчастина',
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
        costPrice: cost,
        sellingPrice: sell,
        supplier: '',
        deliveryTime: '',
        status: 'Pending'
      };
    });

    const validExisting = items.filter(i => 
      i.partNumber.trim() || 
      i.productName.trim() || 
      i.brand.trim() || 
      (i.sellingPrice !== '' && Number(String(i.sellingPrice).replace(',', '.')) > 0)
    );

    setItems([...validExisting, ...newItems]);
    setIsPastingList(false);
    setPartsPhotoPreview(null);
    setParsedPartsPreview([]);
    setPartsPhotoSummary(null);
    setPartsPhotoError(null);
  };

  const handleClearPartsPhoto = () => {
    setPartsPhotoPreview(null);
    setParsedPartsPreview([]);
    setPartsPhotoError(null);
    setPartsPhotoSummary(null);
    if (partsPhotoInputRef.current) {
      partsPhotoInputRef.current.value = '';
    }
  };

  const handleParseList = () => {
    const lines = pasteText.split('\n');
    const newItems: NewOrderItem[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.endsWith(':')) continue;
      
      let qty = 1;
      let partNumber = '';
      let name = trimmed;
      
      const qtyMatch = name.match(/(\d+)\s*шт\.?/i);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10);
        name = name.replace(qtyMatch[0], '').trim();
      }
      
      const words = name.split(/\s+/);
      const partMatch = words.find(w => /^[A-Za-z0-9]+-[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(w) || (/^[A-Za-z0-9]{8,}$/.test(w) && /\d/.test(w)));
      
      if (partMatch) {
        partNumber = partMatch;
        name = name.replace(partMatch, '').trim();
      }
      
      name = name.replace(/^[-.,]+|[-.,]+$/g, '').trim();
      
      newItems.push({
        id: Date.now().toString() + Math.random().toString(),
        partNumber: partNumber.toUpperCase(),
        brand: '',
        productName: name || 'Запчастина',
        quantity: qty,
        costPrice: '',
        sellingPrice: '',
        supplier: '',
        status: 'Pending'
      });
    }
    
    if (newItems.length > 0) {
      const filteredItems = items.filter(i => i.partNumber || i.productName);
      setItems([...filteredItems, ...newItems]);
    }
    
    setIsPastingList(false);
    setPasteText('');
  };

  useEffect(() => {
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    });

    const unsubscribeClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Client)));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeClients();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Window paste listener
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (!e.clipboardData?.files.length) return;
      }

      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          if (isPastingList && pasteMode === 'photo') {
            handlePartsPhotoFile(file);
          } else {
            handleTechPassportFile(file);
          }
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [isOpen, isPastingList, pasteMode]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setCustomerName(client.name);
    setCustomerPhone(client.phone || '');
    setShowClientSuggestions(false);
  };

  useEffect(() => {
    if (isOpen) {
      if (items.length === 0) {
        setItems(getInitialItems());
      }
    } else {
      resetForm();
    }
  }, [isOpen]);

  const totalAmount = items.reduce((acc, item) => {
    const price = parseSafeNumber(item.sellingPrice, 0);
    const qty = parseSafeNumber(item.quantity, 1);
    return acc + (price * qty);
  }, 0);

  const addNewRow = () => {
    setItems(prev => [...prev, generateEmptyRow()]);
  };

  const updateItem = (id: string, field: keyof NewOrderItem, value: any) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => 
      (i.partNumber && i.partNumber.trim()) || 
      (i.productName && i.productName.trim()) || 
      (i.brand && i.brand.trim()) || 
      (i.sellingPrice !== '' && parseSafeNumber(i.sellingPrice, 0) > 0)
    );

    if (validItems.length === 0) {
      alert('Будь ласка, заповніть хоча б одну запчастину (назву або артикул)');
      return;
    }

    if (!customerName.trim()) {
      alert('Будь ласка, вкажіть ім\'я клієнта');
      return;
    }

    setIsSubmitting(true);
    const path = 'orders';

    try {
      let clientId = selectedClient?.id;

      if (!clientId && customerName.trim()) {
        const existingClient = clients.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const clientRef = doc(collection(db, 'clients'));
          await setDoc(clientRef, {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            balance: 0,
            totalTurnover: 0,
            createdAt: serverTimestamp()
          });
          clientId = clientRef.id;
        }
      }

      const totalProfit = validItems.reduce((acc, i) => {
        const sp = parseSafeNumber(i.sellingPrice, 0);
        const cp = parseSafeNumber(i.costPrice, 0);
        const qty = parseSafeNumber(i.quantity, 1);
        return acc + ((sp - cp) * qty);
      }, 0);

      if (clientId && carModel.trim()) {
        const carsRef = collection(db, `clients/${clientId}/cars`);
        const q = query(carsRef, where('model', '==', carModel.trim()));
        const snap = await getDocs(q);
        if (snap.empty) {
          await addDoc(carsRef, {
            model: carModel.trim(),
            vin: vin.trim(),
            year: carYear.trim(),
            engineVolume: engineVolume.trim(),
            plateNumber: detectedPlate || '',
            updatedAt: serverTimestamp()
          });
        }
      }

      await runTransaction(db, async (transaction) => {
        const orderRef = doc(collection(db, path));
        transaction.set(orderRef, {
          clientId: clientId || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          carModel: carModel.trim(),
          vin: vin.trim(),
          carYear: carYear.trim(),
          engineVolume: engineVolume.trim(),
          plateNumber: detectedPlate || null,
          status: 'Pending',
          totalAmount,
          totalProfit,
          creatorId: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        for (const item of validItems) {
          const itemRef = doc(collection(db, `orders/${orderRef.id}/items`));
          transaction.set(itemRef, {
            productId: item.productId || null,
            partNumber: item.partNumber || '',
            brand: item.brand || '',
            productName: item.productName || item.partNumber || 'Запчастина',
            quantity: parseSafeNumber(item.quantity, 1),
            costPrice: parseSafeNumber(item.costPrice, 0),
            sellingPrice: parseSafeNumber(item.sellingPrice, 0),
            supplier: item.supplier || '',
            deliveryTime: item.deliveryTime || '',
            status: item.status || 'Pending'
          });
        }

        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
          userId: auth.currentUser?.uid,
          message: `Нове замовлення запчастин: ${customerName} (${carModel || 'Авто'})`,
          type: 'info',
          read: false,
          createdAt: serverTimestamp()
        });
      });

      onClose();
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCarModel('');
    setVin('');
    setCarYear('');
    setEngineVolume('');
    setDetectedPlate('');
    setItems([]);
    setTechPassportPreview(null);
    setTechPassportStatus(null);
    setTechPassportError(null);
    setTechPassportDetectedInfo(null);
    setPartsPhotoPreview(null);
    setParsedPartsPreview([]);
    setPartsPhotoError(null);
    setPartsPhotoSummary(null);
    setIsPastingList(false);
    setPasteText('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            style={{ maxWidth: `${modalWidth}px` }}
            className="relative bg-white w-full h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Resize Handles */}
            <div 
              className="absolute top-0 left-0 w-3 h-full cursor-col-resize z-50 hover:bg-blue-500/20 transition-colors"
              onMouseDown={(e) => handleResize(e, 'left')}
            />
            <div 
              className="absolute top-0 right-0 w-3 h-full cursor-col-resize z-50 hover:bg-blue-500/20 transition-colors"
              onMouseDown={(e) => handleResize(e, 'right')}
            />

            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Нове Замовлення</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Формування замовлення та підбір деталей</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Customer & Car Data */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-600" />
                      Дані клієнта та автомобіля
                    </h4>

                    {/* Tech Passport Upload Trigger */}
                    <div className="flex items-center gap-2">
                      <input 
                        type="file"
                        ref={techPassportInputRef}
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleTechPassportFile(e.target.files[0]);
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => techPassportInputRef.current?.click()}
                        disabled={isParsingTechPassport}
                        className={cn(
                          "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs",
                          isParsingTechPassport 
                            ? "bg-blue-100 text-blue-800 cursor-wait"
                            : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
                        )}
                        title="Завантажити або сфотографувати техпаспорт для автозаповнення полів"
                      >
                        {isParsingTechPassport ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>Розпізнавання техпаспорта...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5 text-blue-600" />
                            <span>📸 Фото техпаспорта (ШІ-заповнення)</span>
                            <Sparkles className="w-3 h-3 text-blue-500" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tech Passport Detection Banner / Preview */}
                  <AnimatePresence>
                    {(techPassportPreview || isParsingTechPassport || techPassportError) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden mb-6"
                      >
                        <div className={cn(
                          "p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                          techPassportError 
                            ? "bg-rose-50 border-rose-200" 
                            : isParsingTechPassport 
                              ? "bg-blue-50/70 border-blue-200 animate-pulse" 
                              : "bg-blue-50/90 border-blue-300 shadow-xs"
                        )}>
                          <div className="flex items-center gap-3 min-w-0">
                            {techPassportPreview ? (
                              <img 
                                src={techPassportPreview} 
                                alt="Техпаспорт" 
                                className="w-14 h-14 object-cover rounded-xl border border-blue-300/80 shadow-xs shrink-0 bg-white"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Camera className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0">
                              {techPassportError ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>Помилка розпізнавання</span>
                                  </div>
                                  <p className="text-xs text-rose-600">{techPassportError}</p>
                                </div>
                              ) : isParsingTechPassport ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-blue-800 font-bold text-xs">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                    <span>ШІ сканує техпаспорт (VIN, марку, рік, об'єм двигуна)...</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500">Зачекайте декілька секунд, поля заповняться автоматично</p>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-blue-800 font-black text-xs">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                                      Техпаспорт успішно розпізнано!
                                    </span>
                                    {detectedPlate && (
                                      <span className="px-2 py-0.5 bg-white border border-blue-300 text-slate-800 font-mono font-bold text-[10px] rounded-md shadow-xs">
                                        Д/Н: {detectedPlate}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-600 font-medium truncate">
                                    {techPassportDetectedInfo || techPassportStatus}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => techPassportInputRef.current?.click()}
                              className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                            >
                              Змінити
                            </button>
                            <button
                              type="button"
                              onClick={handleClearTechPassport}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Очистити фото"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2 relative" ref={dropdownRef}>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Клієнт *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          required 
                          value={customerName} 
                          onChange={e => {
                            setCustomerName(e.target.value);
                            setShowClientSuggestions(true);
                            if (selectedClient && e.target.value !== selectedClient.name) {
                              setSelectedClient(null);
                            }
                          }} 
                          onFocus={() => setShowClientSuggestions(true)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" 
                          placeholder="ПІБ клієнта" 
                        />
                      </div>

                      <AnimatePresence>
                        {showClientSuggestions && customerName.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                          >
                            {clients
                              .filter(c => 
                                c.name.toLowerCase().includes(customerName.toLowerCase()) ||
                                (c.phone && c.phone.toLowerCase().includes(customerName.toLowerCase()))
                              )
                              .map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onClick={() => handleSelectClient(client)}
                                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                                >
                                  <div>
                                    <p className="text-sm font-bold text-slate-800">{client.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{client.phone || 'Немає телефону'}</p>
                                  </div>
                                  <div className="text-[10px] font-black text-blue-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    Обрати <ChevronDown className="w-3 h-3" />
                                  </div>
                                </button>
                              ))
                            }
                            {clients.filter(c => c.name.toLowerCase().includes(customerName.toLowerCase())).length === 0 && (
                              <div className="px-4 py-4 text-xs text-slate-400 text-center italic">Новий клієнт (буде створено автоматично)</div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Телефон</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="+380..." />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Автомобіль</label>
                      <div className="relative">
                        <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={carModel} onChange={e => setCarModel(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="Марка, модель" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">VIN-код</label>
                      <div className="relative">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-mono uppercase" placeholder="17 символів" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Рік випуску</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={carYear} onChange={e => setCarYear(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="РРРР" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Об'єм двигуна</label>
                      <div className="relative">
                        <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input value={engineVolume} onChange={e => setEngineVolume(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm" placeholder="2.0L, 1968 см³..." />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Items Table with Photo & Text parsing */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Специфікація замовлення
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          if (isPastingList && pasteMode === 'text') {
                            setIsPastingList(false);
                          } else {
                            setIsPastingList(true);
                            setPasteMode('text');
                          }
                        }} 
                        className={cn(
                          "flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors", 
                          isPastingList && pasteMode === 'text' ? "bg-emerald-50 text-emerald-700" : "text-emerald-600 hover:bg-emerald-50"
                        )}
                      >
                        <ClipboardList className="w-4 h-4" />
                        <span>Вставити текстом</span>
                      </button>

                      {/* AI Photo recognition trigger */}
                      <button 
                        type="button" 
                        onClick={() => {
                          if (isPastingList && pasteMode === 'photo') {
                            setIsPastingList(false);
                          } else {
                            setIsPastingList(true);
                            setPasteMode('photo');
                          }
                        }} 
                        className={cn(
                          "flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-lg transition-all", 
                          isPastingList && pasteMode === 'photo' 
                            ? "bg-purple-100 text-purple-800 ring-2 ring-purple-400/30" 
                            : "bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/80"
                        )}
                        title="Розпізнати список деталей з фотографії, чека, накладної або скріншоту"
                      >
                        <Camera className="w-4 h-4 text-purple-600" />
                        <span>Розпізнати з фото</span>
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      </button>

                      <button 
                        type="button" 
                        onClick={addNewRow} 
                        className="flex items-center gap-2 text-blue-600 text-sm font-bold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Додати рядок
                      </button>
                    </div>
                  </div>
                  
                  {/* Expandable Fast Input Panel: Text or AI Photo */}
                  <AnimatePresence>
                    {isPastingList && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-slate-200"
                      >
                        <div className="p-6 bg-slate-50/80 space-y-4">
                          {/* Tabs */}
                          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                            <button
                              type="button"
                              onClick={() => setPasteMode('text')}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                pasteMode === 'text' 
                                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" 
                                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                              )}
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              <span>Текстовий список (Viber / Telegram)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPasteMode('photo')}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                pasteMode === 'photo' 
                                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20" 
                                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                              )}
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Розпізнавання з фото / накладної (ШІ)</span>
                              <Sparkles className="w-3 h-3 text-amber-300" />
                            </button>
                          </div>

                          {/* Tab 1: Text Paste */}
                          {pasteMode === 'text' && (
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                                Швидке додавання текстом
                                <span className="text-[10px] font-medium normal-case opacity-70 bg-emerald-100 px-2 py-0.5 rounded-full">З Viber або Telegram</span>
                              </label>
                              <textarea
                                value={pasteText}
                                onChange={(e) => setPasteText(e.target.value)}
                                placeholder="Вставте список запчастин (напр: 12290rwca01 4шт, Фільтр масляний OC90 1шт)"
                                className="w-full h-32 p-4 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm resize-y"
                              />
                              <div className="flex justify-end gap-2">
                                <button 
                                  type="button" 
                                  onClick={() => setIsPastingList(false)}
                                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                                >
                                  Скасувати
                                </button>
                                <button 
                                  type="button" 
                                  onClick={handleParseList} 
                                  disabled={!pasteText.trim()} 
                                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                  <ClipboardList className="w-4 h-4" />
                                  Обробити список
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Tab 2: AI Photo Recognition */}
                          {pasteMode === 'photo' && (
                            <div className="space-y-4">
                              <input 
                                type="file"
                                ref={partsPhotoInputRef}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) handlePartsPhotoFile(e.target.files[0]);
                                }}
                                accept="image/*"
                                className="hidden"
                              />

                              {/* Upload Dropzone */}
                              {!partsPhotoPreview && !isPhotoParsing && (
                                <div
                                  onClick={() => partsPhotoInputRef.current?.click()}
                                  className="p-8 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl cursor-pointer text-center transition-all bg-white hover:bg-purple-50/50"
                                >
                                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mx-auto mb-3 shadow-inner">
                                    <UploadCloud className="w-7 h-7" />
                                  </div>
                                  <p className="text-sm font-bold text-slate-800 mb-1">
                                    Натисніть для вибору або перетягніть сюди фото списку запчастин
                                  </p>
                                  <p className="text-xs text-slate-500 max-w-lg mx-auto">
                                    Підтримуються рукописні записи майстра, рахунки, накладні постачальників, фото упаковок або скріншоти месенджерів. Також можна вставити через <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">Ctrl+V</kbd>.
                                  </p>
                                </div>
                              )}

                              {/* In-flight parsing state */}
                              {isPhotoParsing && (
                                <div className="p-8 bg-white border border-purple-200 rounded-2xl text-center space-y-3">
                                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mx-auto animate-pulse">
                                    <Loader2 className="w-7 h-7 animate-spin" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-purple-900">
                                      ШІ Gemini сканує фотографію та розпізнає автозапчастини...
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Витягуються назви деталей, артикули/SKU, бренди, кількість та ціни
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Error state */}
                              {partsPhotoError && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-rose-700 text-xs">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{partsPhotoError}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => partsPhotoInputRef.current?.click()}
                                    className="px-3 py-1 bg-white border border-rose-300 rounded-lg font-bold hover:bg-rose-100"
                                  >
                                    Обрати інше фото
                                  </button>
                                </div>
                              )}

                              {/* Parsed Results Preview */}
                              {parsedPartsPreview.length > 0 && (
                                <div className="space-y-4">
                                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                      {partsPhotoPreview && (
                                        <img 
                                          src={partsPhotoPreview} 
                                          alt="Список запчастин" 
                                          className="w-14 h-14 object-cover rounded-xl border border-purple-300 shrink-0 bg-white"
                                        />
                                      )}
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="flex items-center gap-1 text-purple-900 font-bold text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-purple-600" />
                                            Знайдено {parsedPartsPreview.length} запчастин з фото
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                          {partsPhotoSummary || 'Перегляньте розпізнані позиції нижче перед додаванням у специфікацію'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => partsPhotoInputRef.current?.click()}
                                        className="px-3 py-1.5 bg-white text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl text-xs font-bold transition-all"
                                      >
                                        Інше фото
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleClearPartsPhoto}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                                        title="Скасувати"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Table preview of parsed items */}
                                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                        <tr>
                                          <th className="px-4 py-2">Назва деталі</th>
                                          <th className="px-4 py-2">Артикул</th>
                                          <th className="px-4 py-2">Бренд</th>
                                          <th className="px-4 py-2 text-center">К-ть</th>
                                          <th className="px-4 py-2 text-right">Ціна (₴)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {parsedPartsPreview.map((part, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/70">
                                            <td className="px-4 py-2 font-medium text-slate-800">{part.productName}</td>
                                            <td className="px-4 py-2 font-mono text-purple-700 font-bold">{part.partNumber || '—'}</td>
                                            <td className="px-4 py-2 text-slate-600">{part.brand || '—'}</td>
                                            <td className="px-4 py-2 text-center font-bold">{part.quantity} шт.</td>
                                            <td className="px-4 py-2 text-right text-slate-700">
                                              {part.estimatedPrice ? `${part.estimatedPrice} ₴` : '—'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  <div className="flex justify-end gap-3 pt-2">
                                    <button
                                      type="button"
                                      onClick={handleClearPartsPhoto}
                                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                                    >
                                      Скасувати
                                    </button>
                                    <button
                                      type="button"
                                      onClick={applyParsedPartsToTable}
                                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-all"
                                    >
                                      <Check className="w-4 h-4" />
                                      <span>Додати ці {parsedPartsPreview.length} запчастин до замовлення</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-full min-w-[200px]">Назва</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-48">Артикул</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-32">Бренд</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-16">К-ть</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-24">Вхід (₴)</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-24">Продаж (₴)</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-16">Срок</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-32">Постачальник</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-28">Статус</th>
                          <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2">
                              <input value={item.productName} onChange={e => updateItem(item.id, 'productName', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" placeholder="Назва запчастини" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.partNumber} onChange={e => updateItem(item.id, 'partNumber', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs font-mono uppercase" placeholder="SKU" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.brand} onChange={e => updateItem(item.id, 'brand', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" placeholder="Виробник" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={Number(String(item.quantity).replace(',', '.'))} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={item.costPrice} onChange={e => updateItem(item.id, 'costPrice', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </td>
                            <td className="px-3 py-2">
                              <input type="text" value={item.sellingPrice} onChange={e => updateItem(item.id, 'sellingPrice', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs font-bold text-slate-900 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.deliveryTime || ''} onChange={e => updateItem(item.id, 'deliveryTime', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs font-bold text-blue-600 uppercase text-center" placeholder="Срок" maxLength={2} />
                            </td>
                            <td className="px-3 py-2">
                              <input value={item.supplier} onChange={e => updateItem(item.id, 'supplier', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:border-blue-500 text-xs" placeholder="Постачальник" />
                            </td>
                            <td className="px-3 py-2">
                              <select 
                                value={item.status} 
                                onChange={e => updateItem(item.id, 'status', e.target.value as ItemStatus)} 
                                className={cn(
                                  "w-full px-2 py-1.5 rounded-lg outline-none border text-[10px] font-black uppercase tracking-tighter transition-all cursor-pointer",
                                  item.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                  item.status === 'Ordered' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                  item.status === 'In Transit' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                  item.status === 'Available' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                  item.status === 'Out of Stock' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                  item.status === 'Picked' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                  item.status === 'Confirmed' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                  item.status === 'Issued' ? "bg-slate-900 text-white border-slate-900" :
                                  "bg-slate-50 text-slate-500 border-slate-200"
                                )}
                              >
                                <option value="Pending">Очікує</option>
                                <option value="Ordered">Замовлено</option>
                                <option value="In Transit">В дорозі</option>
                                <option value="Available">В наявності</option>
                                <option value="Out of Stock">Немає</option>
                                <option value="Picked">Зібрано</option>
                                <option value="Confirmed">Підтверджено клієнтом</option>
                                <option value="Issued">Видано</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button type="button" onClick={() => removeItem(item.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="p-6 bg-slate-900 flex items-center justify-between">
                    <div className="text-right ml-auto">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Загальна сума</p>
                      <p className="text-3xl font-black text-white">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    Скасувати
                  </button>
                  <button type="submit" disabled={isSubmitting || items.length === 0} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3">
                    {isSubmitting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <>Створити замовлення</>}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
