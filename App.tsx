import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from './components/Button';
import { InputField } from './components/InputField';
import { OTPInput } from './components/OTPInput';
import { Notification } from './components/Notification';
import { PopupNotification } from './components/PopupNotification';
import { TRANSLATIONS, NAVIGATION_ITEMS, ALL_CAR_MODELS, THEME_COLORS } from './constants';

// Types
type ViewState = 'home' | 'login_form' | 'role_selection' | 'signup_form' | 'verification' | 'dashboard_user' | 'dashboard_dev' | 'dashboard_sat7a' | 'dashboard_workshop' | 'profile' | 'create_request' | 'workshop_selection' | 'map_selection' | 'page_w' | 'page_waiting_workshop' | 'page_paper_work' | 'garage' | 'sat7a_history' | 'sat7a_search_results' | 'match_user_view' | 'match_sat7a_view' | 'chat_view' | 'page_l' | 'page_r' | 'workshop_location_select' | 'problem_description' | 'request_details_view' | 'workshop_user_chat' | 'bill_view' | 'page_green_screen' | 'payment_view' | 'page_red_screen' | 'page_waiting_payment';
type Role = 'سطحة' | 'مستخدم' | 'ورشة' | null;
type Lang = 'ar' | 'en';
type Theme = 'light' | 'dark';
type OrdersTab = 'current' | 'cancelled' | 'completed';
type DashboardView = 'main' | 'orders';
type Sat7aTab = 'requests' | 'my_orders' | 'messages';
type WorkshopTab = 'orders' | 'messages';
type UserTab = 'home' | 'requests' | 'messages';
type RequestsSubTab = 'current' | 'history';

interface AppNotification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  time: string;
}

interface UserCar {
  id: number;
  nameEn: string;
  nameAr: string;
  year: number;
  color: string;
  plate: string;
  photo?: string;
}

interface UserData {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: Role;
  joinDate?: string;
  notifications: AppNotification[];
  garage: UserCar[];
  walletBalance?: number; // Added Wallet Balance
  // Sat7a specific
  flatbedPlate?: string;
  flatbedPhoto?: string;
  flatbedLat?: number;
  flatbedLng?: number;
  // Workshop specific
  workshopPhone?: string;
  workshopLat?: number;
  workshopLng?: number;
  commercialReg?: string; // string status 'uploaded'
  municipalLicense?: string; // string status 'uploaded'
}

interface Order {
  id: string;
  type: OrdersTab;
  date: string;
  time: string;
  location: string;
  car: string;
}

interface Workshop {
  id: number;
  nameAr: string;
  nameEn: string;
  locationAr: string;
  locationEn: string;
  rating: number;
  distance: number;
  image: string;
  lat?: number;
  lng?: number;
}

interface ChatMessage {
  id?: number; // Added ID for tracking
  sender: 'user' | 'driver' | 'workshop' | 'system';
  text: string;
  time: string;
  image?: string; // Base64
}

interface BillItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface ActiveRequest {
  id: number;
  username: string;
  name: string;
  car: string;
  year: number;
  // User Location
  userLat: number;
  userLng: number;
  // Destination
  destLat: number;
  destLng: number;
  destName: string;
  timestamp: number;
  // Status and Sat7a info
  status: 'waiting_workshop' | 'negotiation' | 'pending' | 'accepted' | 'picked_up' | 'arrived_at_dest' | 'completed' | 'cancelled';
  driverName?: string;
  driverPlate?: string;
  sat7aLat?: number;
  sat7aLng?: number;
  // Confirmation flags
  userConfirmed?: boolean;
  sat7aConfirmed?: boolean;
  // Chat
  chatMessages?: ChatMessage[];
  negotiationChatMessages?: ChatMessage[]; // Separate chat for user-workshop
  // Problem Description Data
  problemDescription?: string;
  incidentTime?: string;
  isAccident?: boolean;
  accidentReportImage?: string;
  carImage?: string;
  canDrive?: boolean;
  // Billing Data
  billItems?: BillItem[];
  laborCost?: number;
  billTotal?: number;
  isBillFinalized?: boolean; // New flag to lock the bill
  tripCost?: number; // Cost of the flatbed trip
  isPaid?: boolean; // Payment status
}

// Generate Years 1995-2026
const CAR_YEARS = Array.from({ length: 2026 - 1995 + 1 }, (_, i) => 2026 - i);

// Helper for Haversine Distance Calculation (Km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  // Convert inputs to numbers just in case they are strings
  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) return 0;
  
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(nLat2 - nLat1);
  const dLon = deg2rad(nLon2 - nLon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(nLat1)) * Math.cos(deg2rad(nLat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Number(d.toFixed(2));
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

// --- BillView Component ---
const BillView = ({ matchedRequest, currentUser, t, onUpdate, onFinish, onAgree, onBack }: any) => {
    const barcodeLines = Array.from({length: 40}).map((_, i) => ({
        id: i,
        width: (i % 3 === 0 || i % 7 === 0) ? '4px' : '2px'
    }));

    const isWorkshop = currentUser?.role === 'ورشة';
    const items = matchedRequest?.billItems || [];
    const labor = matchedRequest?.laborCost || 0;
    const total = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0) + labor;
    const isFinalized = matchedRequest?.isBillFinalized || false;
    const isAgreed = matchedRequest?.status === 'pending' || matchedRequest?.status === 'accepted' || matchedRequest?.status === 'picked_up' || matchedRequest?.status === 'completed' || matchedRequest?.status === 'arrived_at_dest';
    const isReadOnly = matchedRequest?.status === 'completed' || matchedRequest?.status === 'cancelled';

    const handleAddItem = () => {
        if (!matchedRequest || isFinalized || isAgreed || isReadOnly) return;
        const newItem = { id: Date.now(), name: '', price: 0, quantity: 1 };
        if(onUpdate) onUpdate([...items, newItem], labor);
    };

    const handleDeleteItem = (id: number) => {
        if (!matchedRequest || isFinalized || isAgreed || isReadOnly) return;
        const updatedItems = items.filter((item: any) => item.id !== id);
        if(onUpdate) onUpdate(updatedItems, labor);
    };

    const handleUpdateItem = (id: number, field: string, value: any) => {
        if (!matchedRequest || isFinalized || isAgreed || isReadOnly) return;
        const updatedItems = items.map((item: any) => {
            if (item.id === id) {
                return { ...item, [field]: (field === 'price' || field === 'quantity') ? Number(value) : value };
            }
            return item;
        });
        if(onUpdate) onUpdate(updatedItems, labor);
    };

    const handleLaborChange = (val: string) => {
        if (!matchedRequest || isFinalized || isAgreed || isReadOnly) return;
        if(onUpdate) onUpdate(items, Number(val));
    };

    if (!t) return null;

    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-[#111827] z-[60] overflow-y-auto animate-slideUp">
             <div className="min-h-full w-full flex flex-col items-center justify-center p-6 py-12">
                 <div className="bg-white text-black p-6 pb-64 shadow-2xl max-w-lg w-full h-auto flex flex-col relative" style={{ 
                          clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), 95% 100%, 90% calc(100% - 20px), 85% 100%, 80% calc(100% - 20px), 75% 100%, 70% calc(100% - 20px), 65% 100%, 60% calc(100% - 20px), 55% 100%, 50% calc(100% - 20px), 45% 100%, 40% calc(100% - 20px), 35% 100%, 30% calc(100% - 20px), 25% 100%, 20% calc(100% - 20px), 15% 100%, 10% calc(100% - 20px), 5% 100%, 0 calc(100% - 20px))'
                 }}>
                     <div className="flex items-center justify-between mb-8">
                          <button onClick={onBack} className="text-gray-600 hover:text-black transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                              </svg>
                          </button>
                          <div className="text-center">
                              <h2 className="text-3xl font-black text-black uppercase tracking-widest">{t('billTitle')}</h2>
                              <p className="text-sm text-gray-500 font-mono mt-1"><span dir="ltr">{new Date().toLocaleDateString('en-GB')}</span></p>
                          </div>
                          <div className="w-6"></div>
                     </div>

                     <div className="flex-grow flex flex-col gap-4 font-mono">
                         <div className="flex text-xs font-bold text-gray-500 uppercase border-b-2 border-dashed border-gray-300 pb-2 mb-2">
                             <span className="w-8 text-center">{t('itemQty')}</span>
                             <span className="flex-1 px-2">{t('itemName')}</span>
                             <span className="w-24 text-right">{t('itemPrice')}</span>
                         </div>

                         {items.map((item: any, idx: number) => (
                             <div key={item.id} className="flex gap-2 items-center text-black group">
                                 {isWorkshop && !isFinalized && !isAgreed && !isReadOnly ? (
                                     <>
                                         <input 
                                             type="number"
                                             min="1"
                                             value={item.quantity || 1}
                                             onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                                             className="w-10 p-2 border-b border-gray-200 bg-gray-50/50 focus:bg-gray-100 outline-none text-center font-bold text-black text-sm transition-colors rounded-t"
                                         />
                                         <input 
                                             type="text" 
                                             placeholder="Item Name"
                                             value={item.name}
                                             onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                             className="flex-1 p-2 border-b border-gray-200 bg-gray-50/50 focus:bg-gray-100 outline-none text-black text-sm transition-colors rounded-t"
                                         />
                                         <div className="relative w-24 flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                min="0"
                                                placeholder="0"
                                                value={item.price || ''}
                                                onChange={(e) => handleUpdateItem(item.id, 'price', e.target.value)}
                                                className="w-full p-2 border-b border-gray-200 bg-gray-50/50 focus:bg-gray-100 outline-none text-right font-bold text-black text-sm transition-colors rounded-t"
                                            />
                                            <button 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                         </div>
                                     </>
                                 ) : (
                                     <>
                                         <span className="font-bold text-gray-400 w-8 text-center">{item.quantity}</span>
                                         <span className="flex-1 text-sm font-bold px-2 border-b border-transparent">{item.name || '---'}</span>
                                         <span className="w-24 text-right font-bold border-b border-transparent">{item.price * item.quantity}</span>
                                     </>
                                 )}
                             </div>
                         ))}
                         
                         {isWorkshop && !isFinalized && !isAgreed && !isReadOnly && (
                             <button onClick={handleAddItem} className="self-start text-xs text-blue-600 font-bold hover:bg-blue-50 px-3 py-1 rounded transition-colors flex items-center gap-1">
                                 <span className="text-lg">+</span> {t('addItem')}
                             </button>
                         )}
                         
                         <div className="my-4 border-b-2 border-dashed border-gray-300"></div>

                         <div className="flex justify-between items-center text-black">
                             <span className="font-bold text-sm uppercase text-gray-600">{t('laborCost')}</span>
                             <div className="flex items-center gap-1 justify-end w-24">
                                 {isWorkshop && !isFinalized && !isAgreed && !isReadOnly ? (
                                     <input 
                                         type="number"
                                         min="0" 
                                         value={labor || ''}
                                         onChange={(e) => handleLaborChange(e.target.value)}
                                         className="w-full p-2 border-b border-gray-200 bg-gray-50/50 focus:bg-gray-100 rounded-t text-right font-bold text-black text-sm outline-none transition-colors"
                                     />
                                 ) : (
                                     <span className="font-bold text-sm px-2">{labor}</span>
                                 )}
                             </div>
                         </div>

                         <div className="my-4 border-b-4 border-black"></div>

                         <div className="flex justify-between items-end text-black mb-12">
                             <span className="text-2xl font-black uppercase tracking-wide">{t('total')}</span>
                             <div className="flex items-baseline gap-1">
                                 <span className="text-4xl font-black tracking-tighter">{total}</span>
                                 <span className="text-sm font-bold text-gray-500 uppercase">{t('sar')}</span>
                             </div>
                         </div>
                         
                         <div className="mt-auto flex flex-col items-center gap-2 opacity-80 mb-6">
                             <div className="h-16 w-full max-w-[240px] flex items-stretch gap-[2px] justify-center overflow-hidden bg-transparent">
                                 {barcodeLines.map((line: any) => (
                                     <div key={line.id} className="bg-black" style={{ width: line.width }}></div>
                                 ))}
                             </div>
                             <span className="text-[10px] tracking-[0.5em] font-sans text-gray-600 font-bold">1289405820</span>
                         </div>

                         <div className="mt-4 flex flex-col gap-3">
                            {isWorkshop && !isFinalized && !isAgreed && !isReadOnly && (
                                <Button variant="primary" onClick={onFinish}>Finish Invoice (إنهاء)</Button>
                            )}

                            {!isWorkshop && (
                                <>
                                    {isFinalized && !isAgreed && !isReadOnly ? (
                                        <Button variant="primary" onClick={onAgree}>✓ {t('agreeBill')}</Button>
                                    ) : !isAgreed && !isReadOnly ? (
                                        <div className="p-4 bg-gray-50 rounded-xl text-center border border-gray-200">
                                            <p className="text-sm text-gray-500 font-bold animate-pulse">Waiting for workshop to finalize bill...</p>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-green-50 rounded-xl text-center border border-green-200">
                                            <p className="text-sm text-green-600 font-bold">Invoice Accepted ✓</p>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {isWorkshop && (isFinalized || isAgreed) && (
                                <div className={`p-4 rounded-xl text-center border ${isAgreed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-sm font-bold ${isAgreed ? 'text-green-600' : 'text-gray-500'}`}>
                                        {isAgreed ? "User accepted the invoice" : "Waiting for user acceptance..."}
                                    </p>
                                </div>
                            )}

                            {isReadOnly && (
                                <div className="p-4 bg-gray-100 rounded-xl text-center border border-gray-300">
                                    <p className="text-sm text-gray-600 font-bold">Order Completed / Archived</p>
                                </div>
                            )}
                         </div>
                     </div>
                 </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // Global Settings
  const [lang, setLang] = useState<Lang>('ar');
  const [theme, setTheme] = useState<Theme>('light');

  // Navigation & Role State
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  
  // Dashboard Tabs State
  const [dashboardView, setDashboardView] = useState<DashboardView>('main');
  const [ordersTab, setOrdersTab] = useState<OrdersTab>('current');
  // Sat7a Navigation State
  const [sat7aTab, setSat7aTab] = useState<Sat7aTab>('requests');
  // Workshop Navigation State
  const [workshopTab, setWorkshopTab] = useState<WorkshopTab>('orders');
  // User Navigation State
  const [userTab, setUserTab] = useState<UserTab>('home');
  const [requestsSubTab, setRequestsSubTab] = useState<RequestsSubTab>('current');
  
  // Data State for Signup
  const [formData, setFormData] = useState<UserData>({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    notifications: [],
    garage: [],
    walletBalance: 500, // Default 500 SAR
    flatbedPlate: '',
    flatbedLat: 0,
    flatbedLng: 0,
    workshopPhone: '',
    workshopLat: 0,
    workshopLng: 0
  });

  const [photoVerification, setPhotoVerification] = useState(false);
  const [photoUploaded, setPhotoUploaded] = useState(false);

  // Workshop Signup Files Status
  const [comRegUploaded, setComRegUploaded] = useState(false);
  const [munLicUploaded, setMunLicUploaded] = useState(false);

  // Data State for Login
  const [loginData, setLoginData] = useState({
    identifier: '',
    password: ''
  });
  
  // Current logged in user
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // Database (Local Storage)
  const [registeredUsers, setRegisteredUsers] = useState<UserData[]>(() => {
    try {
      const saved = localStorage.getItem('carva_users');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  // Dynamic Workshops created by Users (Persistent)
  const [customWorkshops, setCustomWorkshops] = useState<Workshop[]>(() => {
    try {
      const saved = localStorage.getItem('carva_workshops');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  // Rejected Requests State (Sat7a)
  const [rejectedReqIds, setRejectedReqIds] = useState<number[]>(() => {
    try {
        const saved = localStorage.getItem('carva_rejected_requests');
        return saved ? JSON.parse(saved) : [];
    } catch(e) { return []; }
  });

  // Verification State
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState(false);

  // UI State
  const [notification, setNotification] = useState({ show: false, message: '', type: 'error' as 'error' | 'success' });
  const [popupNotification, setPopupNotification] = useState({ show: false, title: '', message: '', onClick: undefined as undefined | (() => void) });
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  // Create Request State
  const [carSearchTerm, setCarSearchTerm] = useState('');
  const [selectedCar, setSelectedCar] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  const [workshopSearchTerm, setWorkshopSearchTerm] = useState('');
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);

  // Problem Description State (New)
  const [problemDesc, setProblemDesc] = useState('');
  const [incidentTime, setIncidentTime] = useState('12:00');
  const [isAccident, setIsAccident] = useState(false);
  const [accidentPhoto, setAccidentPhoto] = useState<string | null>(null);
  const [carPhoto, setCarPhoto] = useState<string | null>(null);
  const [canDrive, setCanDrive] = useState(false);

  // Garage State
  const [showAddCarForm, setShowAddCarForm] = useState(false);
  const [newCarData, setNewCarData] = useState({
    name: '',
    year: '',
    color: '',
    plate: '',
    photo: '' as string | undefined
  });
  const [addCarSearchTerm, setAddCarSearchTerm] = useState('');
  const [editingCarId, setEditingCarId] = useState<number | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Confirmation Modal State
  const [showConfirmation, setShowConfirmation] = useState<{
    type: 'delete' | 'edit' | 'arrival';
    carId?: number;
    isOpen: boolean;
  }>({ type: 'delete', isOpen: false });

  // Map Selection State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number}>({ lat: 24.7136, lng: 46.6753 });
  const [mapDestination, setMapDestination] = useState<{lat: number, lng: number} | null>(null);
  const [mapDistance, setMapDistance] = useState<number>(0);
  
  // Active Requests State (Sat7a view)
  const [availableRequests, setAvailableRequests] = useState<(ActiveRequest & { distClient: number, distDest: number })[]>([]);
  // Sat7a Real Location
  const [sat7aLocation, setSat7aLocation] = useState({ lat: 24.7136, lng: 46.6753 });

  // MATCHING STATE
  const [matchedRequest, setMatchedRequest] = useState<ActiveRequest | null>(null);
  const [liveDistance, setLiveDistance] = useState<number>(0);

  // Workshop Details View State
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<ActiveRequest | null>(null);

  // WORKSHOP WAIT TIMER
  const [workshopTimer, setWorkshopTimer] = useState(300); // 5 minutes in seconds
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastNotifiedMessageId = useRef<number | string | null>(null);

  // Leaflet Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const sat7aMarkerRef = useRef<any>(null);

  // Dropdown ref
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Swipe State
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // Refs for click outside handling
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Helpers
  const t = (key: keyof typeof TRANSLATIONS.ar | string): string => {
    // @ts-ignore
    return TRANSLATIONS[lang][key] || key;
  };

  const showNotification = (msg: string, type: 'error' | 'success' = 'error') => {
    setNotification({ show: true, message: msg, type });
  };
  
  const showPopup = (title: string, message: string, onClick?: () => void) => {
    setPopupNotification({ show: true, title, message, onClick });
  };

  const closePopup = useCallback(() => {
    setPopupNotification(prev => ({ ...prev, show: false }));
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLang = () => setLang(prev => prev === 'ar' ? 'en' : 'ar');

  const checkGuestAccess = () => {
      if (currentUser?.username === 'guest') {
          setCurrentUser(null);
          setCurrentView('home');
          return false;
      }
      return true;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
          setIsYearDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
      if (currentView === 'chat_view' || currentView === 'workshop_user_chat') {
          setPopupNotification(prev => ({ ...prev, show: false }));
          setHasUnreadMessages(false);
      }
  }, [currentView]);

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            (error) => { console.log(error); }
        );
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'carva_workshops') {
        try { const newVal = e.newValue ? JSON.parse(e.newValue) : []; setCustomWorkshops(newVal); } catch(err) {}
      }
      if (e.key === 'carva_users') {
        try { const newVal = e.newValue ? JSON.parse(e.newValue) : []; setRegisteredUsers(newVal); } catch(err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
      if (currentView === 'workshop_selection') {
          setWorkshopSearchTerm('');
          try {
              const saved = localStorage.getItem('carva_workshops');
              if (saved) { setCustomWorkshops(JSON.parse(saved)); }
          } catch(e) {}
      }
  }, [currentView]);

  useEffect(() => {
    if (currentUser?.role === 'سطحة' && navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (position) => { setSat7aLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); },
            (error) => {},
            { enableHighAccuracy: true }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentUser?.role]); 

  // Polling logic for Active Requests status changes (Accepted, etc.)
  useEffect(() => {
      if (currentUser?.role === 'مستخدم') {
          const interval = setInterval(() => {
              const LS_KEY = 'carva_active_requests';
              const raw = localStorage.getItem(LS_KEY);
              if (raw) {
                  try {
                      const allReqs: ActiveRequest[] = JSON.parse(raw);
                      const myReq = allReqs.find(r => r.username === currentUser.username);
                      
                      if (myReq && myReq.status === 'accepted') {
                           if (currentView !== 'chat_view') {
                               if (matchedRequest?.status !== 'accepted') {
                                   setMatchedRequest(myReq);
                                   showPopup(t('requestAccepted'), t('driverOnWay'), () => {
                                       setMatchedRequest(myReq);
                                       setCurrentView('chat_view');
                                   });
                                   setCurrentView('chat_view');
                               }
                           }
                      }
                      
                      if (myReq) setMatchedRequest(myReq);

                      if (myReq && myReq.chatMessages && matchedRequest) {
                          const msgs = myReq.chatMessages;
                          const lastMsg = msgs[msgs.length - 1];
                          const msgId = lastMsg.id || (lastMsg.time + lastMsg.text);
                          
                          if (lastMsg && lastMsg.sender !== 'user' && (!matchedRequest.chatMessages || msgs.length > matchedRequest.chatMessages.length)) {
                              if (msgId !== lastNotifiedMessageId.current) {
                                  if (currentView !== 'chat_view') {
                                      lastNotifiedMessageId.current = msgId;
                                      showPopup(t('chatTitle'), lastMsg.text || t('image'), () => { setCurrentView('chat_view'); });
                                  }
                              }
                          }
                      }
                  } catch(e) {}
              }
          }, 2000);
          return () => clearInterval(interval);
      }
  }, [currentUser, currentView, matchedRequest]);

  // Request Creation / Sync
  useEffect(() => {
    const LS_KEY = 'carva_active_requests';
    if ((currentView === 'page_w' || currentView === 'page_waiting_workshop') && currentUser && selectedCar) {
      const existing = localStorage.getItem(LS_KEY);
      let requests: ActiveRequest[] = [];
      try { requests = existing ? JSON.parse(existing) : []; } catch (e) { requests = []; }
      
      const myExistingReqIndex = requests.findIndex(r => r.username === currentUser.username);
      const myExistingReq = myExistingReqIndex !== -1 ? requests[myExistingReqIndex] : null;

      let shouldUpdate = false;
      let newReq = myExistingReq;

      let destLat = 24.7136;
      let destLng = 46.6753;
      let destName = t('destCustom');

      if (selectedWorkshop) {
          destLat = selectedWorkshop.lat || (24.7136 + (selectedWorkshop.id * 0.01)); 
          destLng = selectedWorkshop.lng || (46.6753 + (selectedWorkshop.id * 0.01));
          destName = lang === 'ar' ? selectedWorkshop.nameAr : selectedWorkshop.nameEn;
      } else if (mapDestination) {
          destLat = mapDestination.lat;
          destLng = mapDestination.lng;
          destName = t('destCustom');
      }

      const initialStatus = selectedWorkshop ? 'waiting_workshop' : 'pending';
      const problemDetails = { problemDescription: problemDesc, incidentTime, isAccident, accidentReportImage: accidentPhoto || undefined, carImage: carPhoto || undefined, canDrive: canDrive };

      if (!myExistingReq) {
          newReq = {
            id: Date.now(),
            username: currentUser.username,
            name: currentUser.name,
            car: selectedCar,
            year: selectedYear || 2024,
            userLat: userLocation.lat,
            userLng: userLocation.lng,
            destLat,
            destLng,
            destName,
            timestamp: Date.now(),
            status: initialStatus,
            chatMessages: [],
            negotiationChatMessages: [],
            billItems: [],
            laborCost: 0,
            billTotal: 0,
            ...problemDetails
          };
          requests.push(newReq);
          shouldUpdate = true;
      } else if (myExistingReq.status === 'pending' || myExistingReq.status === 'waiting_workshop' || myExistingReq.status === 'negotiation') {
          let nextStatus = myExistingReq.status;
          if (currentView === 'page_w' && myExistingReq.status === 'negotiation') { nextStatus = 'pending'; }

          requests[myExistingReqIndex] = {
              ...myExistingReq,
              userLat: userLocation.lat,
              userLng: userLocation.lng,
              destLat, destLng, destName,
              car: selectedCar, 
              year: selectedYear || myExistingReq.year,
              status: nextStatus,
              ...problemDetails
          };
          shouldUpdate = true;
      }

      if (shouldUpdate) { localStorage.setItem(LS_KEY, JSON.stringify(requests)); }

      const pollInterval = setInterval(() => {
        const currentData = localStorage.getItem(LS_KEY);
        if (currentData) {
            try {
                const allReqs: ActiveRequest[] = JSON.parse(currentData);
                const myReq = allReqs.find(r => r.username === currentUser.username);
                
                if (currentView === 'page_waiting_workshop') {
                    if (myReq) {
                        if (myReq.status === 'negotiation') {
                            setMatchedRequest(myReq);
                            showPopup(t('nounWorkshop'), t('negotiating'), () => setCurrentView('workshop_user_chat'));
                            setCurrentView('workshop_user_chat');
                        } else if (myReq.status === 'pending') {
                             if (canDrive) {
                                // If canDrive, we should be going to completed/red screen after payment, logic handled in handleUserAgree
                                // But if status is pending and we are here, we might just go to red screen
                                setCurrentView('page_red_screen');
                             } else {
                                setCurrentView('page_w');
                             }
                        } else if (myReq.status !== 'waiting_workshop') {
                           showNotification('Request Cancelled or Rejected', 'error');
                           setCurrentView('workshop_selection');
                        }
                    } else {
                       showNotification('Request Cancelled', 'error');
                       setCurrentView('workshop_selection');
                    }
                }

                if ((currentView === 'page_w' || currentView === 'dashboard_user') && myReq && myReq.status === 'accepted') {
                    setMatchedRequest(myReq);
                    showPopup(t('requestAccepted'), t('driverOnWay'));
                    setCurrentView('chat_view');
                    const newNotif = { id: Date.now(), title: t('requestAccepted'), message: t('driverOnWay'), read: false, time: 'Now' };
                    setCurrentUser(prev => prev ? ({...prev, notifications: [newNotif, ...prev.notifications]}) : null);
                }
            } catch (e) {}
        }
      }, 1000);
      return () => { clearInterval(pollInterval); };
    }
  }, [currentView, currentUser, selectedCar, selectedYear, mapDestination, selectedWorkshop, lang, userLocation, problemDesc, incidentTime, isAccident, accidentPhoto, carPhoto, canDrive]);

  useEffect(() => {
    let interval: any;
    if (currentView === 'page_waiting_workshop') {
        setWorkshopTimer(300);
        interval = setInterval(() => {
            setWorkshopTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    const LS_KEY = 'carva_active_requests';
                    const raw = localStorage.getItem(LS_KEY);
                    if (raw) {
                        try {
                            const all = JSON.parse(raw);
                            const remaining = all.filter((r: ActiveRequest) => r.username !== currentUser?.username);
                            localStorage.setItem(LS_KEY, JSON.stringify(remaining));
                        } catch(e) {}
                    }
                    showNotification('Workshop did not respond in time.', 'error');
                    setCurrentView('workshop_selection');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'dashboard_sat7a' && sat7aTab === 'requests') {
       const fetchRequests = () => {
          const LS_KEY = 'carva_active_requests';
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
             try {
                 const requests: ActiveRequest[] = JSON.parse(raw);
                 // Only show pending requests that CANNOT drive themselves AND have not been rejected
                 const pending = requests.filter(r => r && r.status === 'pending' && !r.canDrive && !rejectedReqIds.includes(r.id));
                 
                 const withDist = pending.map(req => {
                   const distClient = calculateDistance(sat7aLocation.lat, sat7aLocation.lng, req.userLat, req.userLng) || 0;
                   const distDest = calculateDistance(sat7aLocation.lat, sat7aLocation.lng, req.destLat, req.destLng) || 0;
                   return { ...req, distClient, distDest };
                 });
                 withDist.sort((a, b) => a.distClient - b.distClient);
                 setAvailableRequests(withDist);
             } catch (e) { setAvailableRequests([]); }
          } else { setAvailableRequests([]); }
       };
       fetchRequests();
       const interval = setInterval(fetchRequests, 2000);
       return () => clearInterval(interval);
    }
  }, [currentView, sat7aLocation, sat7aTab, rejectedReqIds]);

  useEffect(() => {
      // Payment Polling (User View)
      if (currentView === 'page_waiting_payment' && matchedRequest) {
           const interval = setInterval(() => {
                const raw = localStorage.getItem('carva_active_requests');
                if (raw) {
                    try {
                        const all: ActiveRequest[] = JSON.parse(raw);
                        const myReq = all.find(r => r.id === matchedRequest.id);
                        if (myReq && myReq.isPaid) {
                             // Payment Complete Logic for Sat7a
                             setMatchedRequest(myReq);
                             // Update local user wallet balance if driver
                             if (currentUser?.role === 'سطحة') {
                                 const driverData = registeredUsers.find(u => u.username === currentUser.username);
                                 if (driverData) setCurrentUser(driverData);
                             }

                             showPopup(t('paymentComplete'), t('pageLTitle'));
                             // Archive Logic here or redirect
                             // Move to History and remove from Active
                             const historyRaw = localStorage.getItem('carva_order_history') || '[]';
                             const history = JSON.parse(historyRaw);
                             localStorage.setItem('carva_order_history', JSON.stringify([...history, myReq]));
                             
                             const remaining = all.filter(r => r.id !== myReq.id);
                             localStorage.setItem('carva_active_requests', JSON.stringify(remaining));

                             setCurrentView('dashboard_sat7a');
                             clearInterval(interval);
                        }
                    } catch (e) {}
                }
           }, 2000);
           return () => clearInterval(interval);
      }
  }, [currentView, matchedRequest, currentUser, registeredUsers]);

  useEffect(() => {
      // Workshop Notification Polling for User Arrival
      if (currentUser?.role === 'ورشة') {
           const interval = setInterval(() => {
                const raw = localStorage.getItem('carva_active_requests');
                if (raw) {
                    try {
                        const all: ActiveRequest[] = JSON.parse(raw);
                        const myWs = customWorkshops.find(w => w.nameAr === currentUser?.name || w.nameEn === currentUser?.name);
                        
                        all.forEach((req) => {
                             const isMyDest = req.destName === currentUser?.name || (myWs && (req.destName === myWs.nameAr || req.destName === myWs.nameEn)); 
                             if (isMyDest && req.status === 'arrived_at_dest') {
                                 // Check if we already notified for this state? (Can use localStorage to track notification state)
                                 const notifiedKey = `notified_arrival_${req.id}`;
                                 if (!localStorage.getItem(notifiedKey)) {
                                     showPopup(t('nounUser'), t('userAtWorkshop'));
                                     localStorage.setItem(notifiedKey, 'true');
                                 }
                             }
                        });
                    } catch(e) {}
                }
           }, 3000);
           return () => clearInterval(interval);
      }
  }, [currentUser]);

  useEffect(() => {
      if ((currentView === 'workshop_user_chat' || currentView === 'bill_view') && matchedRequest) {
          const interval = setInterval(() => {
              const LS_KEY = 'carva_active_requests';
              const raw = localStorage.getItem(LS_KEY);
              if (raw) {
                  try {
                      const all = JSON.parse(raw);
                      const myReq = all.find((r: ActiveRequest) => r.id === matchedRequest.id);
                      if (myReq) {
                          setMatchedRequest(myReq);
                          if (myReq.negotiationChatMessages && myReq.negotiationChatMessages.length > (matchedRequest.negotiationChatMessages?.length || 0)) {
                             const lastMsg = myReq.negotiationChatMessages[myReq.negotiationChatMessages.length - 1];
                             const msgId = lastMsg.id || (lastMsg.time + lastMsg.text);
                             if (lastMsg.sender !== (currentUser?.role === 'ورشة' ? 'workshop' : 'user') && lastMsg.sender !== 'system') {
                                 if (currentView !== 'workshop_user_chat' && msgId !== lastNotifiedMessageId.current) {
                                     lastNotifiedMessageId.current = msgId;
                                     showPopup(t('chatTitle'), lastMsg.text || t('image'));
                                 }
                             }
                          }
                      } else {
                          // Check history if not found in active
                          const histRaw = localStorage.getItem('carva_order_history');
                          if (histRaw) {
                              const hist = JSON.parse(histRaw);
                              const hReq = hist.find((r: any) => r.id === matchedRequest.id);
                              if (hReq) {
                                  setMatchedRequest(hReq);
                                  return; // Found in history, no need to alert cancel
                              }
                          }

                          showNotification('Order Cancelled', 'error');
                          if (currentUser?.role === 'ورشة') setCurrentView('dashboard_workshop');
                          else setCurrentView('workshop_selection');
                          clearInterval(interval);
                      }
                  } catch(e) {}
              }
          }, 1000);
          return () => clearInterval(interval);
      }
      
      if ((currentView === 'match_user_view' || currentView === 'match_sat7a_view' || currentView === 'chat_view') && matchedRequest) {
          const LS_KEY = 'carva_active_requests';
          const interval = setInterval(() => {
              const raw = localStorage.getItem(LS_KEY);
              let myReq = null;
              if (raw) { try { const all = JSON.parse(raw); myReq = all.find((r: ActiveRequest) => r.id === matchedRequest.id); } catch (e) {} }
              if (myReq) {
                  if (myReq.chatMessages && myReq.chatMessages.length > (matchedRequest.chatMessages?.length || 0)) {
                      if (currentView !== 'chat_view') {
                          const lastMsg = myReq.chatMessages[myReq.chatMessages.length - 1];
                          const msgId = lastMsg.id || (lastMsg.time + lastMsg.text);
                          if (lastMsg.sender !== (currentUser?.role === 'سطحة' ? 'driver' : 'user')) {
                              if (msgId !== lastNotifiedMessageId.current) {
                                  lastNotifiedMessageId.current = msgId;
                                  setHasUnreadMessages(true);
                                  showPopup(t('chatTitle'), lastMsg.text || t('image'), () => setCurrentView('chat_view'));
                              }
                          }
                      }
                  }
                  
                  // Optimistic state update to avoid flicker if local changes happened
                  // IMPORTANT: Update if DB has changes (status, conf, OR chat messages)
                  if (myReq.userConfirmed !== matchedRequest.userConfirmed || 
                      myReq.sat7aConfirmed !== matchedRequest.sat7aConfirmed || 
                      myReq.status !== matchedRequest.status ||
                      (myReq.chatMessages?.length || 0) !== (matchedRequest.chatMessages?.length || 0)) {
                       setMatchedRequest(myReq);
                  }
                  
                  // Check Confirmation Flags to Transition to Payment/Red Screen
                  if (myReq.status === 'arrived_at_dest') {
                        if (currentUser?.role === 'سطحة') {
                             if (currentView !== 'page_waiting_payment') setCurrentView('page_waiting_payment');
                        } else if (currentUser?.role === 'مستخدم') {
                             if (currentView !== 'payment_view' && currentView !== 'page_red_screen') setCurrentView('payment_view');
                        }
                        setShowConfirmation({ ...showConfirmation, isOpen: false });
                        clearInterval(interval);
                        return;
                  }

                  if (myReq.sat7aLat && myReq.sat7aLng) {
                      let targetLat, targetLng;
                      if (myReq.status === 'accepted') { targetLat = myReq.userLat; targetLng = myReq.userLng; } 
                      else { targetLat = myReq.destLat; targetLng = myReq.destLng; }
                      const dist = calculateDistance(myReq.sat7aLat, myReq.sat7aLng, targetLat, targetLng);
                      setLiveDistance(dist);
                  }
              } else {
                   const historyRaw = localStorage.getItem('carva_order_history');
                   const history = historyRaw ? JSON.parse(historyRaw) : [];
                   const completedReq = history.find((h: any) => h.id === matchedRequest.id);
                   if (completedReq) {
                       if (matchedRequest.status !== 'completed' && matchedRequest.status !== 'cancelled') {
                           if (currentUser?.role === 'سطحة') setCurrentView('dashboard_sat7a'); // Or history
                           else if (currentUser?.role === 'مستخدم') setCurrentView('page_red_screen');
                       }
                       setMatchedRequest(completedReq);
                       clearInterval(interval);
                       return;
                   } else {
                       if (currentUser?.role === 'سطحة' && matchedRequest.status !== 'cancelled') { 
                            setCurrentView('dashboard_sat7a'); showNotification('User Cancelled', 'error'); 
                       }
                       clearInterval(interval);
                   }
              }
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [currentView, matchedRequest, currentUser]);

  useEffect(() => {
      if (mapContainerRef.current) {
          const L = (window as any).L;
          if (!L) return;
          if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
          let map: any;

          if (currentView === 'map_selection') {
              let initialCenter: [number, number] = [userLocation.lat, userLocation.lng];
              if (selectedWorkshop) {
                  const wsLat = selectedWorkshop.lat || (24.7136 + (selectedWorkshop.id * 0.01));
                  const wsLng = selectedWorkshop.lng || (46.6753 + (selectedWorkshop.id * 0.01));
                  initialCenter = [wsLat, wsLng];
              }
              map = L.map(mapContainerRef.current).setView(initialCenter, 13);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
              
              const userIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
              const destIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });

              userMarkerRef.current = L.marker(initialCenter, { icon: userIcon }).addTo(map).bindPopup(t('nounUser'));
              if (navigator.geolocation && !selectedWorkshop) {
                  navigator.geolocation.getCurrentPosition((position) => {
                       const { latitude, longitude } = position.coords;
                       setUserLocation({ lat: latitude, lng: longitude });
                       userMarkerRef.current.setLatLng([latitude, longitude]);
                       map.setView([latitude, longitude], 13);
                  });
              }
              if (selectedWorkshop) {
                  setMapDestination({ lat: initialCenter[0], lng: initialCenter[1] });
                  destMarkerRef.current = L.marker(initialCenter, { icon: destIcon }).addTo(map).bindPopup(lang === 'ar' ? selectedWorkshop.nameAr : selectedWorkshop.nameEn).openPopup();
              }
              map.on('click', (e: any) => {
                  const { lat, lng } = e.latlng;
                  setMapDestination({ lat, lng });
                  if (destMarkerRef.current) { destMarkerRef.current.setLatLng([lat, lng]); } else { destMarkerRef.current = L.marker([lat, lng], { icon: destIcon }).addTo(map).bindPopup(t('destination')).openPopup(); }
                  if (routeLineRef.current) routeLineRef.current.remove();
                  const currentPos = userMarkerRef.current.getLatLng();
                  const points = [currentPos, [lat, lng]];
                  routeLineRef.current = L.polyline(points, { color: 'blue', dashArray: '10, 10' }).addTo(map);
                  setMapDistance(calculateDistance(currentPos.lat, currentPos.lng, lat, lng));
              });

          } else if (currentView === 'workshop_location_select') {
               let initialCenter: [number, number] = [userLocation.lat || 24.7136, userLocation.lng || 46.6753];
               map = L.map(mapContainerRef.current).setView(initialCenter, 13);
               L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
               const workshopIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
               map.on('click', (e: any) => {
                  const { lat, lng } = e.latlng;
                  if (selectedRole === 'ورشة') { setFormData(prev => ({ ...prev, workshopLat: lat, workshopLng: lng })); } 
                  else if (selectedRole === 'سطحة') { setFormData(prev => ({ ...prev, flatbedLat: lat, flatbedLng: lng })); }
                  if (destMarkerRef.current) { destMarkerRef.current.setLatLng([lat, lng]); } else { destMarkerRef.current = L.marker([lat, lng], { icon: workshopIcon }).addTo(map); }
               });
               const existingLat = selectedRole === 'ورشة' ? formData.workshopLat : formData.flatbedLat;
               const existingLng = selectedRole === 'ورشة' ? formData.workshopLng : formData.flatbedLng;
               if (existingLat && existingLng && existingLat !== 0) {
                   destMarkerRef.current = L.marker([existingLat, existingLng], { icon: workshopIcon }).addTo(map);
                   map.setView([existingLat, existingLng], 13);
               } else if (navigator.geolocation) {
                   navigator.geolocation.getCurrentPosition((pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 13); });
               }

          } else if ((currentView === 'match_user_view' || currentView === 'match_sat7a_view' || currentView === 'request_details_view') && (matchedRequest || selectedRequestForDetails)) {
              // Handle Details View Map Logic
              const req = currentView === 'request_details_view' ? selectedRequestForDetails : matchedRequest;
              if (!req) return;

              const center = [req.userLat, req.userLng] as [number, number];
              map = L.map(mapContainerRef.current).setView(center, 13);
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
              const userIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
              const sat7aIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
              const destIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });

              const markers = [];
              
              // Always show User and Destination in Details View
              const uM = L.marker([req.userLat, req.userLng], { icon: userIcon }).addTo(map).bindPopup(t('nounUser'));
              markers.push(uM);
              
              const dM = L.marker([req.destLat, req.destLng], { icon: destIcon }).addTo(map).bindPopup(req.destName);
              markers.push(dM);

              if (currentView === 'match_sat7a_view') {
                  // For driver view, plot their own location from state to ensure it shows
                  const sM = L.marker([sat7aLocation.lat, sat7aLocation.lng], { icon: sat7aIcon }).addTo(map).bindPopup(t('nounSat7a')).openPopup();
                  markers.push(sM);
              } else if (currentView === 'match_user_view') {
                  if (req.sat7aLat && req.sat7aLng) {
                      const sM = L.marker([req.sat7aLat, req.sat7aLng], { icon: sat7aIcon }).addTo(map).bindPopup(t('nounSat7a'));
                      markers.push(sM);
                  }
              }

              if (markers.length > 0) { const group = new L.featureGroup(markers); map.fitBounds(group.getBounds().pad(0.2)); }
          }
          if (map) { mapInstanceRef.current = map; setTimeout(() => map.invalidateSize(), 100); }
          return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
      }
  }, [currentView, matchedRequest?.id, matchedRequest?.status, sat7aLocation.lat, sat7aLocation.lng, selectedRequestForDetails]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [matchedRequest?.chatMessages, matchedRequest?.negotiationChatMessages, currentView]);

  const handleWorkshopSelect = (ws: Workshop) => { 
    setSelectedWorkshop(ws); 
    if (ws) { 
        if (canDrive) {
            // User can drive, skip searching for flatbed
             setCurrentView('page_waiting_workshop'); 
        } else {
             setCurrentView('page_waiting_workshop'); 
        }
    } else { 
        if (canDrive) {
             setCurrentView('page_red_screen');
        } else {
             setCurrentView('page_w'); 
        }
    } 
  };

  const handleSendMessage = (imgBase64?: string, isNegotiation = false) => {
      if ((!chatInput.trim() && !imgBase64) || !matchedRequest) return;
      // Removed blocking logic for pending status
      
      const isReadOnly = matchedRequest.status === 'completed' || matchedRequest.status === 'cancelled';
      if (isReadOnly) return;

      const newMessage: ChatMessage = { id: Date.now(), sender: currentUser?.role === 'سطحة' ? 'driver' : currentUser?.role === 'ورشة' ? 'workshop' : 'user', text: chatInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), image: imgBase64 };
      try {
          const LS_KEY = 'carva_active_requests';
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
              const all = JSON.parse(raw);
              const updated = all.map((r: ActiveRequest) => {
                  if (r.id === matchedRequest.id) {
                      if (isNegotiation) { const msgs = r.negotiationChatMessages || []; return { ...r, negotiationChatMessages: [...msgs, newMessage] }; } 
                      else { const msgs = r.chatMessages || []; return { ...r, chatMessages: [...msgs, newMessage] }; }
                  }
                  return r;
              });
              localStorage.setItem(LS_KEY, JSON.stringify(updated));
              setMatchedRequest(prev => {
                  if (!prev) return null;
                  if (isNegotiation) { return { ...prev, negotiationChatMessages: [...(prev.negotiationChatMessages || []), newMessage] }; } 
                  else { return { ...prev, chatMessages: [...(prev.chatMessages || []), newMessage] }; }
              });
              setChatInput('');
          }
      } catch (e) { showNotification('Failed to send message'); }
  };

  const handleAcceptRequest = (req: ActiveRequest) => {
      const LS_KEY = 'carva_active_requests';
      const raw = localStorage.getItem(LS_KEY);
      if (raw && currentUser) {
          try {
            const all: ActiveRequest[] = JSON.parse(raw);
            const updated = all.map(r => {
                if (r.id === req.id) {
                    return {
                        ...r,
                        status: 'accepted' as const,
                        driverName: currentUser.name,
                        driverPlate: currentUser.flatbedPlate || 'Unknown',
                        sat7aLat: sat7aLocation.lat,
                        sat7aLng: sat7aLocation.lng,
                        sat7aConfirmed: false // reset confirmation
                    };
                }
                return r;
            });
            localStorage.setItem(LS_KEY, JSON.stringify(updated));
            const updatedReq = updated.find(r => r.id === req.id);
            if (updatedReq) {
                setMatchedRequest(updatedReq);
                setCurrentView('match_sat7a_view');
            }
          } catch(e) {}
      }
  };

  const handleRejectRequest = (reqId: number) => {
      setRejectedReqIds(prev => {
          const updated = [...prev, reqId];
          localStorage.setItem('carva_rejected_requests', JSON.stringify(updated));
          return updated;
      });
      // Return to list if viewing details
      if (currentView === 'request_details_view') {
          setCurrentView('dashboard_sat7a');
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isNegotiation = false) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { handleSendMessage(reader.result as string, isNegotiation); }; reader.readAsDataURL(file); } e.target.value = ''; };
  const handleProblemPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'accident' | 'car') => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { if (type === 'accident') setAccidentPhoto(reader.result as string); else setCarPhoto(reader.result as string); }; reader.readAsDataURL(file); } };
  const updateRequestStatus = (reqId: number, status: ActiveRequest['status'] | 'cancelled') => { const LS_KEY = 'carva_active_requests'; const raw = localStorage.getItem(LS_KEY); if (raw) { try { const all: ActiveRequest[] = JSON.parse(raw); let updated; if (status === 'cancelled') { updated = all.filter(r => r.id !== reqId); } else { updated = all.map(r => r.id === reqId ? { ...r, status } : r); } localStorage.setItem(LS_KEY, JSON.stringify(updated)); return true; } catch(e) {} } return false; };
  
  const unreadCount = currentUser?.notifications.filter(n => !n.read).length || 0;
  const handleGuestLogin = () => {
      const guestUser: UserData = { name: 'Guest User', username: 'guest', email: 'guest@carva.com', password: '', confirmPassword: '', role: 'مستخدم', joinDate: new Date().toISOString().split('T')[0], notifications: [], garage: [], walletBalance: 500 };
      setCurrentUser(guestUser);
      setCurrentView('dashboard_user');
  };
  const handleLoginInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => { setLoginData(prev => ({ ...prev, [field]: e.target.value })); };
  const handleLoginSubmit = () => {
      if (!loginData.identifier || !loginData.password) { showNotification(t('errorFill')); return; }
      const user = registeredUsers.find(u => (u.username === loginData.identifier || u.email === loginData.identifier) && u.password === loginData.password);
      if (user) {
          setCurrentUser(user);
          if (user.role === 'سطحة') setCurrentView('dashboard_sat7a');
          else if (user.role === 'ورشة') setCurrentView('dashboard_workshop');
          else setCurrentView('dashboard_user');
      } else if (loginData.identifier === 'admin' && loginData.password === 'admin') {
           setCurrentUser({ name: 'Admin', username: 'admin', email: 'admin@carva.com', password: 'admin', confirmPassword: 'admin', role: 'ورشة', notifications: [], garage: [] });
           setCurrentView('dashboard_dev');
      } else { showNotification(t('errorLogin')); }
  };
  const handleRoleSelect = (role: Role) => { setSelectedRole(role); setFormData(prev => ({ ...prev, role })); setCurrentView('signup_form'); };
  const handleInputChange = (field: keyof UserData) => (e: React.ChangeEvent<HTMLInputElement>) => { setFormData(prev => ({ ...prev, [field]: e.target.value })); };
  const handlePhotoUpload = () => { setPhotoVerification(true); setTimeout(() => { setPhotoVerification(false); setPhotoUploaded(true); setFormData(prev => ({ ...prev, flatbedPhoto: 'uploaded' })); }, 2000); };
  const handleWorkshopUpload = (field: 'commercialReg' | 'municipalLicense') => { if (field === 'commercialReg') { setTimeout(() => { setComRegUploaded(true); setFormData(p => ({...p, commercialReg: 'uploaded'})); }, 1000); } else { setTimeout(() => { setMunLicUploaded(true); setFormData(p => ({...p, municipalLicense: 'uploaded'})); }, 1000); } };
  const handleSignupSubmit = () => {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) { showNotification(t('errorFill')); return; }
      if (selectedRole === 'ورشة') { if (!formData.workshopPhone || (!formData.workshopLat || formData.workshopLat === 0)) { showNotification(t('errorFill')); return; } } 
      else { if (!formData.username) { showNotification(t('errorFill')); return; } }
      if (formData.password !== formData.confirmPassword) { showNotification(t('errorPassMatch')); return; }
      if (selectedRole !== 'ورشة') { const usernameExists = registeredUsers.some(u => u.username.toLowerCase() === formData.username.toLowerCase()); if (usernameExists) { showNotification(t('errorUserExists')); return; } }
      const emailExists = registeredUsers.some(u => u.email.toLowerCase() === formData.email.toLowerCase()); if (emailExists) { showNotification(t('errorEmailExists')); return; }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!emailRegex.test(formData.email)) { showNotification(t('errorEmail')); return; }
      const passRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/; if (!passRegex.test(formData.password)) { showNotification('Password must contain 1 Capital Letter and 1 Number'); return; }
      setCurrentView('verification'); setOtpCode('');
  };
  const handleVerificationSubmit = () => {
      if (otpCode === '123456') {
          const newUser: UserData = { ...formData, joinDate: new Date().toISOString().split('T')[0], garage: [], notifications: [{ id: 1, title: t('welcomeTitle'), message: 'skibidi 67', read: false, time: 'Now' }], walletBalance: 500 };
          setRegisteredUsers(prev => { const updated = [...prev, newUser]; localStorage.setItem('carva_users', JSON.stringify(updated)); return updated; });
          setCurrentUser(newUser);
          if (newUser.role === 'ورشة') {
             const newWs: Workshop = { id: Date.now() + Math.floor(Math.random() * 1000), nameAr: newUser.name, nameEn: newUser.name, locationAr: 'موقع محدد', locationEn: 'Selected Location', rating: 5.0, distance: 2.0, image: 'https://images.unsplash.com/photo-1580273916550-e323be2ed5fa?auto=format&fit=crop&w=800&q=80', lat: newUser.workshopLat, lng: newUser.workshopLng };
             setCustomWorkshops(prev => { const updated = [...prev, newWs]; localStorage.setItem('carva_workshops', JSON.stringify(updated)); return updated; });
             setCurrentView('dashboard_workshop');
          } else if (newUser.role === 'سطحة') {
              if (newUser.flatbedLat && newUser.flatbedLng) { setSat7aLocation({ lat: newUser.flatbedLat, lng: newUser.flatbedLng }); }
              setCurrentView('dashboard_sat7a');
          } else { setCurrentView('dashboard_user'); }
      } else { setOtpError(true); showNotification(t('errorCode')); }
  };
  
  const getFilteredCars = () => { if (!carSearchTerm) return ALL_CAR_MODELS; const term = carSearchTerm.toLowerCase(); return ALL_CAR_MODELS.filter(car => car.en.toLowerCase().includes(term) || car.ar.includes(term)); };
  
  const getFilteredWorkshops = () => { 
      const allWorkshops = customWorkshops; 
      if (!workshopSearchTerm) return allWorkshops; 
      const term = workshopSearchTerm.toLowerCase(); 
      return allWorkshops.filter(ws => ws.nameEn.toLowerCase().includes(term) || ws.nameAr.includes(term)); 
  };

  const getFilteredAddCars = () => {
      if (!addCarSearchTerm) return ALL_CAR_MODELS;
      const term = addCarSearchTerm.toLowerCase();
      return ALL_CAR_MODELS.filter(car => car.en.toLowerCase().includes(term) || car.ar.includes(term));
  };
  
  const handleAddCar = () => {
      if (!newCarData.name || !newCarData.year || !newCarData.color || !newCarData.plate) { showNotification(t('errorFill')); return; }
      if (editingCarId) { setShowConfirmation({ type: 'edit', isOpen: true, carId: editingCarId }); } else {
          const exists = registeredUsers.some(u => u.garage.some(c => c.plate === newCarData.plate));
          if (exists) { setVerificationRequired(true); setVerifying(true); setTimeout(() => { setVerifying(false); }, 3000); return; }
          const newId = Math.floor(Math.random() * 10000); const model = ALL_CAR_MODELS.find(m => m.en === newCarData.name);
          const carObj: UserCar = { id: newId, nameEn: newCarData.name, nameAr: model?.ar || newCarData.name, year: parseInt(newCarData.year), color: newCarData.color, plate: newCarData.plate, photo: newCarData.photo };
          if (currentUser) {
              const updatedUser = { ...currentUser, garage: [...currentUser.garage, carObj] }; setCurrentUser(updatedUser);
              setRegisteredUsers(prev => { const updated = prev.map(u => u.username === currentUser.username ? updatedUser : u); localStorage.setItem('carva_users', JSON.stringify(updated)); return updated; });
          }
          setShowAddCarForm(false); showNotification(t('carAdded'), 'success');
      }
  };
  const handleEditCar = (car: UserCar) => { setNewCarData({ name: car.nameEn, year: car.year.toString(), color: car.color, plate: car.plate, photo: car.photo }); setEditingCarId(car.id); setShowAddCarForm(true); };
  const handleDeleteCar = (id: number) => { setShowConfirmation({ type: 'delete', isOpen: true, carId: id }); };
  const confirmDeleteCar = () => { if (currentUser && showConfirmation.carId) { const updatedGarage = currentUser.garage.filter(c => c.id !== showConfirmation.carId); const updatedUser = { ...currentUser, garage: updatedGarage }; setCurrentUser(updatedUser); setRegisteredUsers(prev => { const updated = prev.map(u => u.username === currentUser.username ? updatedUser : u); localStorage.setItem('carva_users', JSON.stringify(updated)); return updated; }); showNotification(t('carDeleted'), 'success'); } setShowConfirmation({ ...showConfirmation, isOpen: false }); };
  const saveCarToGarage = () => { if (currentUser && editingCarId) { const model = ALL_CAR_MODELS.find(m => m.en === newCarData.name); const updatedGarage = currentUser.garage.map(c => { if (c.id === editingCarId) { return { ...c, nameEn: newCarData.name, nameAr: model?.ar || newCarData.name, year: parseInt(newCarData.year), color: newCarData.color, plate: newCarData.plate, photo: newCarData.photo }; } return c; }); const updatedUser = { ...currentUser, garage: updatedGarage }; setCurrentUser(updatedUser); setRegisteredUsers(prev => { const updated = prev.map(u => u.username === currentUser.username ? updatedUser : u); localStorage.setItem('carva_users', JSON.stringify(updated)); return updated; }); showNotification(t('carUpdated'), 'success'); setShowAddCarForm(false); } setShowConfirmation({ ...showConfirmation, isOpen: false }); };
  const handleBellClick = () => { if (currentUser?.username === 'guest') { setCurrentUser(null); setCurrentView('home'); return; } setShowNotifDropdown(!showNotifDropdown); };
  const markNotificationAsRead = (id: number) => { if (currentUser) { const updatedNotifs = currentUser.notifications.map(n => n.id === id ? { ...n, read: true } : n); const updatedUser = { ...currentUser, notifications: updatedNotifs }; setCurrentUser(updatedUser); setRegisteredUsers(prev => { const updated = prev.map(u => u.username === currentUser.username ? updatedUser : u); localStorage.setItem('carva_users', JSON.stringify(updated)); return updated; }); } };
  const handleTouchStart = (e: React.TouchEvent) => { setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = (id: number) => { if (touchStart - touchEnd > 75 && touchEnd !== 0) { if (currentUser) { const updatedNotifs = currentUser.notifications.filter(n => n.id !== id); const updatedUser = { ...currentUser, notifications: updatedNotifs }; setCurrentUser(updatedUser); setRegisteredUsers(prev => { const updated = prev.map(u => u.username === currentUser.username ? updatedUser : u); localStorage.setItem('carva_users', JSON.stringify(updated)); return updated; }); } } setTouchStart(0); setTouchEnd(0); };
  
  // Revised Handle Arrival Confirmation & Trip Calculation
  const handleArrivalConfirm = () => { 
      const LS_KEY = 'carva_active_requests'; 
      const raw = localStorage.getItem(LS_KEY); 
      if (raw && matchedRequest) { 
          try { 
              const all = JSON.parse(raw); 
              const isSat7a = currentUser?.role === 'سطحة';
              let alreadyConfirmedByOther = false;
              
              const updated = all.map((r: ActiveRequest) => { 
                  if (r.id === matchedRequest.id) { 
                      alreadyConfirmedByOther = isSat7a ? !!r.userConfirmed : !!r.sat7aConfirmed;
                      const updates: any = { [isSat7a ? 'sat7aConfirmed' : 'userConfirmed']: true };
                      
                      // Transition Logic
                      if (alreadyConfirmedByOther) {
                          if (r.status === 'accepted') {
                              // Transition to Picked Up (Heading to Workshop)
                              updates.status = 'picked_up';
                              // Reset confirmations for the next leg (Arrival at Dest)
                              updates.userConfirmed = false;
                              updates.sat7aConfirmed = false;
                          } else if (r.status === 'picked_up') {
                              // Transition to Payment (Arrived at Dest)
                              updates.status = 'arrived_at_dest';
                              // Calculate Cost strictly: 1.5 SAR per 100m = 15 SAR per 1 km
                              const dist = calculateDistance(r.userLat, r.userLng, r.destLat, r.destLng);
                              const cost = Math.ceil(dist * 15); 
                              updates.tripCost = cost;
                              updates.isPaid = false;
                          }
                      }
                      return { ...r, ...updates }; 
                  } 
                  return r; 
              }); 
              
              localStorage.setItem(LS_KEY, JSON.stringify(updated)); 
              
              const myUpdatedReq = updated.find((r: ActiveRequest) => r.id === matchedRequest.id);
              if (myUpdatedReq) {
                  setMatchedRequest(myUpdatedReq);
                  
                  // Immediate View Transition for Payment
                  if (myUpdatedReq.status === 'arrived_at_dest') {
                      if (isSat7a) {
                          setCurrentView('page_waiting_payment');
                      } else {
                          setCurrentView('payment_view');
                      }
                  }
              }

              setShowConfirmation({ ...showConfirmation, isOpen: false }); 

          } catch (e) {} 
      } 
  };

  const handlePayment = () => {
      if (!matchedRequest || !matchedRequest.tripCost || !currentUser) return;
      const cost = matchedRequest.tripCost;
      const balance = currentUser.walletBalance || 0;

      if (balance < cost) {
          showNotification(t('insufficientFunds'));
          return;
      }

      // 1. Deduct from User
      const newBalance = balance - cost;
      const updatedUser = { ...currentUser, walletBalance: newBalance };
      
      // 2. Add to Driver (Find Driver User)
      let allUsers = [...registeredUsers];
      let driverUpdated = false;

      // Update current user in the big list
      allUsers = allUsers.map(u => u.username === currentUser.username ? updatedUser : u);

      // Find driver and credit them
      if (matchedRequest.driverName) {
           // Try to match by name (best effort in this mock)
           const driverIndex = allUsers.findIndex(u => u.name === matchedRequest.driverName && u.role === 'سطحة');
           if (driverIndex !== -1) {
               const driver = allUsers[driverIndex];
               const driverNewBalance = (driver.walletBalance || 0) + cost;
               allUsers[driverIndex] = { ...driver, walletBalance: driverNewBalance };
               driverUpdated = true;
           }
      }

      // Save everything
      setCurrentUser(updatedUser);
      setRegisteredUsers(allUsers);
      localStorage.setItem('carva_users', JSON.stringify(allUsers));

      // Update Request Status
      const LS_KEY = 'carva_active_requests';
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
          const all = JSON.parse(raw);
          const updated = all.map((r: ActiveRequest) => {
              if (r.id === matchedRequest.id) {
                  return { ...r, isPaid: true, status: 'completed' };
              }
              return r;
          });
          localStorage.setItem(LS_KEY, JSON.stringify(updated));
          setMatchedRequest({ ...matchedRequest, isPaid: true, status: 'completed' });
          showPopup(t('paymentSuccess'), `${cost} ${t('sar')}`);
          setCurrentView('page_red_screen');
      }
  };
  
  const handleUpdateBill = (newItems: BillItem[], newLabor: number) => { const LS_KEY = 'carva_active_requests'; const raw = localStorage.getItem(LS_KEY); if (raw && matchedRequest) { const all = JSON.parse(raw); const newTotal = newItems.reduce((acc, item) => acc + (item.price * item.quantity), 0) + newLabor; const updated = all.map((r: ActiveRequest) => r.id === matchedRequest.id ? { ...r, billItems: newItems, laborCost: newLabor, billTotal: newTotal } : r); localStorage.setItem(LS_KEY, JSON.stringify(updated)); setMatchedRequest(prev => prev ? ({...prev, billItems: newItems, laborCost: newLabor, billTotal: newTotal}) : null); } };
  const handleFinishBill = () => { const LS_KEY = 'carva_active_requests'; const raw = localStorage.getItem(LS_KEY); if (raw && matchedRequest) { const all = JSON.parse(raw); const updated = all.map((r: ActiveRequest) => r.id === matchedRequest.id ? { ...r, isBillFinalized: true } : r); localStorage.setItem(LS_KEY, JSON.stringify(updated)); setMatchedRequest(prev => prev ? ({...prev, isBillFinalized: true}) : null); } };
  const handleUserAgree = () => { 
      if (matchedRequest && matchedRequest.isBillFinalized) { 
          // Inject System Message
          const systemMsg: ChatMessage = {
              id: Date.now(),
              sender: 'system',
              text: `${matchedRequest.name} agreed with ${matchedRequest.destName} on ${matchedRequest.billTotal}`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };

          const LS_KEY = 'carva_active_requests';
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
              const all = JSON.parse(raw);
              const updated = all.map((r: ActiveRequest) => {
                  if (r.id === matchedRequest.id) {
                      const msgs = r.negotiationChatMessages || [];
                      // If canDrive is true, we mark as completed/paid/driving_self and skip flatbed search
                      const nextStatus = canDrive ? 'completed' : 'pending';
                      const updates = { 
                          ...r, 
                          status: nextStatus, 
                          negotiationChatMessages: [...msgs, systemMsg],
                      };
                      return updates;
                  }
                  return r;
              });
              localStorage.setItem(LS_KEY, JSON.stringify(updated));
              setMatchedRequest(prev => {
                  if (!prev) return null;
                  const msgs = prev.negotiationChatMessages || [];
                  return { ...prev, status: canDrive ? 'completed' : 'pending', negotiationChatMessages: [...msgs, systemMsg] };
              });
          }
          if (canDrive) {
             setCurrentView('page_red_screen');
          } else {
             setCurrentView('page_w'); 
          }
      } 
  };

  const WorkshopRequestsList = () => {
      const [requests, setRequests] = useState<ActiveRequest[]>([]);
      useEffect(() => {
          const fetchRequests = () => {
              const LS_KEY = 'carva_active_requests';
              const raw = localStorage.getItem(LS_KEY);
              try {
                  const all: ActiveRequest[] = raw ? JSON.parse(raw) : [];
                  const myWs = customWorkshops.find(w => w.nameAr === currentUser?.name || w.nameEn === currentUser?.name || (currentUser?.workshopLat && w.lat === currentUser.workshopLat && w.lng === currentUser.workshopLng));
                  const incoming = all.filter((r) => { if (r.destName === currentUser?.name) return true; if (myWs) { if (r.destName === myWs.nameAr) return true; if (r.destName === myWs.nameEn) return true; const latDiff = Math.abs(r.destLat - (myWs.lat || 0)); const lngDiff = Math.abs(r.destLng - (myWs.lng || 0)); if (latDiff < 0.0001 && lngDiff < 0.0001) return true; } return false; });
                  incoming.sort((a, b) => { if (a.status === 'waiting_workshop' && b.status !== 'waiting_workshop') return -1; if (a.status !== 'waiting_workshop' && b.status === 'waiting_workshop') return 1; return 0; });
                  setRequests(incoming);
              } catch (e) { setRequests([]); }
          };
          fetchRequests(); const interval = setInterval(fetchRequests, 1000); return () => clearInterval(interval);
      }, []);
      return (
          <div className="flex-1 w-full p-6 overflow-y-auto pb-24">
              <h2 className="text-2xl font-bold text-[#0a3461] dark:text-white mb-6 text-right">{t('myOrdersTitle')}</h2>
              <div className="flex flex-col gap-4">
                  {requests.length > 0 ? requests.map(req => (
                      <div key={req.id} className={`bg-white dark:bg-[#1f2937] p-5 rounded-3xl shadow-lg border-r-4 ${req.status === 'negotiation' ? 'border-purple-500' : 'border-[#2f5cd6]'} flex flex-col gap-3 transition-all`} onClick={() => { if (req.status === 'negotiation') { setMatchedRequest(req); setCurrentView('workshop_user_chat'); } }}>
                          <div className="flex justify-between items-start">
                              <div><h3 className="font-bold text-[#0a3461] dark:text-white text-lg">{req.car} ({req.year})</h3><p className="text-sm text-gray-400">{req.name}</p></div>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'picked_up' ? 'bg-green-100 text-green-600' : req.status === 'waiting_workshop' ? 'bg-orange-100 text-orange-600' : req.status === 'negotiation' ? 'bg-purple-100 text-purple-600' : 'bg-yellow-100 text-yellow-600'}`}>{req.status === 'waiting_workshop' ? 'Waiting for Approval' : req.status === 'negotiation' ? 'Negotiating Bill' : req.status === 'picked_up' ? t('headingToDest') : req.status === 'completed' ? 'Completed' : t('driverOnWay')}</span>
                          </div>
                          {req.status === 'waiting_workshop' && (
                              <div className="flex gap-2 mt-2 justify-end">
                                  <button onClick={(e) => { e.stopPropagation(); updateRequestStatus(req.id, 'cancelled'); }} className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center shadow-sm">❌</button>
                                  <button onClick={(e) => { e.stopPropagation(); setSelectedRequestForDetails(req); setCurrentView('request_details_view'); }} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm">📄</button>
                                  <button onClick={(e) => { e.stopPropagation(); updateRequestStatus(req.id, 'negotiation'); setMatchedRequest(req); setCurrentView('workshop_user_chat'); }} className="w-10 h-10 rounded-full bg-green-100 hover:bg-green-200 text-green-600 flex items-center justify-center shadow-sm">✅</button>
                              </div>
                          )}
                      </div>
                  )) : ( <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p>{t('noRequests')}</p></div> )}
              </div>
          </div>
      );
  };

  const WorkshopMessagesList = () => {
    const [messagesList, setMessagesList] = useState<ActiveRequest[]>([]);
    useEffect(() => {
        const fetchMessages = () => {
            const rawActive = localStorage.getItem('carva_active_requests');
            const rawHistory = localStorage.getItem('carva_order_history');
            const active: ActiveRequest[] = rawActive ? JSON.parse(rawActive) : [];
            const history: ActiveRequest[] = rawHistory ? JSON.parse(rawHistory) : [];
            const all = [...active, ...history];

            const myWs = customWorkshops.find(w => w.nameAr === currentUser?.name || w.nameEn === currentUser?.name);
            const chats = all.filter(r => { 
                const isMyDest = r.destName === currentUser?.name || (myWs && (r.destName === myWs.nameAr || r.destName === myWs.nameEn)); 
                return isMyDest && r.status !== 'waiting_workshop'; 
            });
            // Sort by latest message time or timestamp
            chats.sort((a,b) => b.timestamp - a.timestamp);
            setMessagesList(chats);
        }; fetchMessages(); const interval = setInterval(fetchMessages, 2000); return () => clearInterval(interval);
    }, []);
    return (
        <div className="flex-1 w-full p-6 overflow-y-auto pb-24">
             <h2 className="text-2xl font-bold text-[#0a3461] dark:text-white mb-6 text-right">{t('tabMessages')}</h2>
             <div className="flex flex-col gap-4">
                 {messagesList.length > 0 ? messagesList.map(req => {
                     const lastMsg = req.negotiationChatMessages && req.negotiationChatMessages.length > 0 ? req.negotiationChatMessages[req.negotiationChatMessages.length - 1] : { text: 'Start chatting...', time: '' };
                     const isCompleted = req.status === 'completed' || req.status === 'cancelled';
                     return (
                         <div key={req.id} onClick={() => { setMatchedRequest(req); setCurrentView('workshop_user_chat'); }} className={`bg-white dark:bg-[#1f2937] p-4 rounded-2xl shadow-sm border ${isCompleted ? 'border-gray-200 opacity-80' : 'border-gray-100'} flex gap-4 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                             <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden"><img src={`https://ui-avatars.com/api/?name=${req.name}&background=random`} alt="User" className="w-full h-full object-cover" /></div>
                             <div className="flex-1 overflow-hidden"><div className="flex justify-between items-center mb-1"><h3 className="font-bold text-[#0a3461] dark:text-white truncate">{req.name}</h3><span className="text-xs text-gray-400">{lastMsg.time}</span></div><p className="text-sm text-gray-500 truncate">{lastMsg.text}</p></div>
                             {isCompleted && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Archived</span>}
                         </div>
                     );
                 }) : ( <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p>{t('emptyNotifications')}</p></div> )}
             </div>
        </div>
    );
  };
  
  const UserMessagesList = () => {
    const [chatList, setChatList] = useState<ActiveRequest[]>([]);
    useEffect(() => {
        const fetchMessages = () => {
            if (!currentUser) return;
            const rawActive = localStorage.getItem('carva_active_requests');
            const rawHistory = localStorage.getItem('carva_order_history');
            const active: ActiveRequest[] = rawActive ? JSON.parse(rawActive) : [];
            const history: ActiveRequest[] = rawHistory ? JSON.parse(rawHistory) : [];
            const all = [...active, ...history];

            const myChats = all.filter(r => r.username === currentUser.username && r.status !== 'waiting_workshop');
            myChats.sort((a,b) => b.timestamp - a.timestamp);
            setChatList(myChats);
        }; fetchMessages(); const interval = setInterval(fetchMessages, 2000); return () => clearInterval(interval);
    }, [currentUser]);

    return (
        <div className="flex-1 w-full p-6 overflow-y-auto pb-24">
             <h2 className="text-2xl font-bold text-[#0a3461] dark:text-white mb-6 text-right">{t('tabMessages')}</h2>
             <div className="flex flex-col gap-4">
                 {chatList.length > 0 ? chatList.map(req => {
                     const isNegotiation = req.status === 'negotiation' || (req.negotiationChatMessages && req.negotiationChatMessages.length > 0);
                     // If sat7a assigned, use driver chat, else workshop chat
                     const chatArr = (req.driverName && !isNegotiation) ? req.chatMessages : req.negotiationChatMessages;
                     const lastMsg = chatArr && chatArr.length > 0 ? chatArr[chatArr.length - 1] : { text: 'Start chatting...', time: '' };
                     const displayName = (req.driverName && !isNegotiation) ? (req.driverName || 'Driver') : req.destName;
                     const isCompleted = req.status === 'completed' || req.status === 'cancelled';
                     
                     return (
                         <div key={req.id} onClick={() => { setMatchedRequest(req); setCurrentView(isNegotiation ? 'workshop_user_chat' : 'chat_view'); }} className={`bg-white dark:bg-[#1f2937] p-4 rounded-2xl shadow-sm border ${isCompleted ? 'border-gray-200 opacity-80' : 'border-gray-100'} flex gap-4 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                             <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden"><img src={`https://ui-avatars.com/api/?name=${displayName}&background=random`} alt="Other" className="w-full h-full object-cover" /></div>
                             <div className="flex-1 overflow-hidden">
                                 <div className="flex justify-between items-center mb-1">
                                     <h3 className="font-bold text-[#0a3461] dark:text-white truncate">{displayName}</h3>
                                     <span className="text-xs text-gray-400">{lastMsg.time}</span>
                                 </div>
                                 <p className="text-sm text-gray-500 truncate">{lastMsg.text}</p>
                             </div>
                             {isNegotiation && <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-1 rounded-full font-bold">Workshop</span>}
                             {isCompleted && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Archived</span>}
                         </div>
                     );
                 }) : ( <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p>{t('emptyNotifications')}</p></div> )}
             </div>
        </div>
    );
  };

  const Sat7aMessagesList = () => {
    const [messagesList, setMessagesList] = useState<ActiveRequest[]>([]);
    useEffect(() => {
        const fetchMessages = () => {
            const rawActive = localStorage.getItem('carva_active_requests');
            const rawHistory = localStorage.getItem('carva_order_history');
            const active: ActiveRequest[] = rawActive ? JSON.parse(rawActive) : [];
            const history: ActiveRequest[] = rawHistory ? JSON.parse(rawHistory) : [];
            const all = [...active, ...history];

            // Filter for orders where this driver was assigned
            const myChats = all.filter(r => r.driverName === currentUser?.name);
            myChats.sort((a,b) => b.timestamp - a.timestamp);
            setMessagesList(myChats);
        }; fetchMessages(); const interval = setInterval(fetchMessages, 2000); return () => clearInterval(interval);
    }, [currentUser]);

    return (
        <div className="flex-1 w-full p-6 overflow-y-auto pb-24">
             <h2 className="text-2xl font-bold text-[#0a3461] dark:text-white mb-6 text-right">{t('tabMessages')}</h2>
             <div className="flex flex-col gap-4">
                 {messagesList.length > 0 ? messagesList.map(req => {
                     const chatArr = req.chatMessages;
                     const lastMsg = chatArr && chatArr.length > 0 ? chatArr[chatArr.length - 1] : { text: 'Start chatting...', time: '' };
                     const isCompleted = req.status === 'completed' || req.status === 'cancelled';
                     return (
                         <div key={req.id} onClick={() => { setMatchedRequest(req); setCurrentView('chat_view'); }} className={`bg-white dark:bg-[#1f2937] p-4 rounded-2xl shadow-sm border ${isCompleted ? 'border-gray-200 opacity-80' : 'border-gray-100'} flex gap-4 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors`}>
                             <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden"><img src={`https://ui-avatars.com/api/?name=${req.name}&background=random`} alt="User" className="w-full h-full object-cover" /></div>
                             <div className="flex-1 overflow-hidden"><div className="flex justify-between items-center mb-1"><h3 className="font-bold text-[#0a3461] dark:text-white truncate">{req.name}</h3><span className="text-xs text-gray-400">{lastMsg.time}</span></div><p className="text-sm text-gray-500 truncate">{lastMsg.text}</p></div>
                             {isCompleted && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Archived</span>}
                         </div>
                     );
                 }) : ( <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p>{t('emptyNotifications')}</p></div> )}
             </div>
        </div>
    );
  };

  const OrdersList = ({ isSat7a = false }) => {
      const LS_KEY = 'carva_active_requests'; const HISTORY_KEY = 'carva_order_history';
      const activeRaw = localStorage.getItem(LS_KEY); const historyRaw = localStorage.getItem(HISTORY_KEY);
      let activeRequests: ActiveRequest[] = []; let historyRequests: ActiveRequest[] = [];
      try { activeRequests = activeRaw ? JSON.parse(activeRaw) : []; } catch(e) {}
      try { historyRequests = historyRaw ? JSON.parse(historyRaw) : []; } catch(e) {}
      const myActive = activeRequests.filter(r => { if (isSat7a) return r.driverName === currentUser?.name || r.status === 'accepted' || r.status === 'picked_up'; return r.username === currentUser?.username; });
      const myHistory = historyRequests.filter(r => { if (isSat7a) return r.driverName === currentUser?.name; return r.username === currentUser?.username; });
      const mappedActive = myActive.map(r => ({ id: r.id.toString(), type: 'current' as const, date: new Date(r.timestamp).toLocaleDateString(), time: new Date(r.timestamp).toLocaleTimeString(), location: r.destName, car: r.car, status: r.status, billTotal: r.billTotal || 0, originalRequest: r }));
      const mappedHistory = myHistory.map(r => ({ id: r.id.toString(), type: r.status === 'completed' ? 'completed' as const : 'cancelled' as const, date: new Date(r.timestamp).toLocaleDateString(), time: new Date(r.timestamp).toLocaleTimeString(), location: r.destName, car: r.car, billTotal: r.billTotal || 0, originalRequest: r }));
      // Removed dummy orders, showing only real data
      const allOrders = [...mappedActive, ...mappedHistory];

      const handleOrderClick = (order: any) => {
          if (order.originalRequest) {
              const req = order.originalRequest as ActiveRequest; 
              setMatchedRequest(req);
              
              if (order.type !== 'current') {
                  // If viewing history, decide which view based on role
                  if (req.driverName) {
                      setCurrentView('chat_view'); // Sat7a flow history
                  } else {
                      setCurrentView('workshop_user_chat'); // Workshop flow history
                  }
                  return;
              }

              if (req.status === 'negotiation') { setCurrentView('workshop_user_chat'); } 
              else if (req.status === 'pending') {
                   if (req.canDrive) setCurrentView('page_red_screen');
                   else setCurrentView('page_w'); 
              } 
              else if (req.status === 'accepted' || req.status === 'picked_up') { setCurrentView('chat_view'); } 
              else if (req.status === 'waiting_workshop') { setCurrentView('page_waiting_workshop'); }
              else if (req.status === 'arrived_at_dest') { 
                  if(isSat7a) setCurrentView('page_waiting_payment'); 
                  else setCurrentView('payment_view'); 
              }
          }
      };
      
      const displayedOrders = requestsSubTab === 'current' 
          ? allOrders.filter(o => o.type === 'current') 
          : allOrders.filter(o => o.type !== 'current');

      return (
      <div className="w-full animate-fadeIn max-w-lg mx-auto h-full flex flex-col pt-4">
           {(!isSat7a && userTab === 'requests') && (
               <div className="flex justify-center mb-6">
                   <div className="bg-gray-200 dark:bg-gray-800 rounded-full p-1 flex relative w-full max-w-xs">
                        {/* Sliding Background */}
                        <div 
                            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#2f5cd6] rounded-full transition-all duration-300 ease-in-out shadow-md z-0 ${requestsSubTab === 'current' ? 'right-1' : 'right-[calc(50%+4px)]'}`}
                        ></div>
                        
                        <button 
                            onClick={() => setRequestsSubTab('current')} 
                            className={`flex-1 relative z-10 py-2 rounded-full text-sm font-bold transition-colors duration-300 ${requestsSubTab === 'current' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                             {t('currentOrders')}
                        </button>
                        <button 
                            onClick={() => setRequestsSubTab('history')} 
                            className={`flex-1 relative z-10 py-2 rounded-full text-sm font-bold transition-colors duration-300 ${requestsSubTab === 'history' ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                             {t('previousOrders')}
                        </button>
                   </div>
               </div>
           )}
           <div className="flex-1 overflow-y-auto pb-24 px-6">
               <div className="flex flex-col gap-4">
                   {displayedOrders.map(order => (
                       <div key={order.id} onClick={() => handleOrderClick(order)} className={`bg-white dark:bg-[#1f2937] p-5 rounded-3xl shadow-lg border border-gray-50 dark:border-gray-700 flex flex-col gap-3 cursor-pointer hover:border-[#2f5cd6] transition-colors`}>
                           <div className="flex justify-between items-start">
                               <div><h3 className="font-bold text-[#0a3461] dark:text-white text-lg">{order.car}</h3><span className="text-xs text-gray-400">ID: #{order.id}</span></div>
                               <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.type === 'current' ? 'bg-blue-100 text-blue-600' : order.type === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{t(order.type === 'current' ? 'nounSat7a' : order.type === 'completed' ? 'done' : 'tabCancelled')}</span>
                           </div>
                           <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                               <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{order.date}</div>
                               <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{order.time}</div>
                           </div>
                           {order.type === 'current' && ( <p className="text-center text-xs text-[#2f5cd6] font-bold mt-1">{t('resumeOrder')}</p> )}
                       </div>
                   ))}
                   {displayedOrders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                           <p>No orders found.</p>
                        </div>
                   )}
               </div>
           </div>
      </div>
      );
  };

  const renderContent = () => {
    switch (currentView) {
      // ... (home, login_form, role_selection same as before) ...
      case 'home':
        return (
            <div className="flex flex-col gap-6 w-full animate-fadeIn items-center justify-center h-full px-8">
              <h1 className="text-6xl font-extrabold text-[#0a3461] dark:text-white mb-8 tracking-tighter drop-shadow-sm transition-colors duration-700">{t('appTitle')}</h1>
              <Button variant="primary" onClick={() => setCurrentView('login_form')}>{t('login')}</Button>
              <Button variant="secondary" onClick={() => setCurrentView('role_selection')}>{t('signup')}</Button>
              <div className="mt-4"><span onClick={handleGuestLogin} className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold cursor-pointer hover:underline text-sm transition-colors">{t('guest')}</span></div>
            </div>
        );
      
      case 'login_form':
        return (
            <div className="flex flex-col gap-8 w-full max-w-md mx-auto animate-slideUp h-full overflow-y-auto hide-scrollbar justify-center px-8 pt-12 pb-10">
              <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-4 text-center">{t('loginTitle')}</h2>
              <InputField label={t('loginIdentifier')} value={loginData.identifier} onChange={handleLoginInputChange('identifier')} dir="ltr" />
              <InputField label={t('password')} type="password" value={loginData.password} onChange={handleLoginInputChange('password')} dir="ltr" />
              <div className="flex flex-col gap-4 mt-8 items-center">
                <Button variant="primary" onClick={handleLoginSubmit}>{t('enter')}</Button>
                <button onClick={() => setCurrentView('home')} className="w-64 py-3 px-6 rounded-2xl text-lg font-bold transition-all duration-300 ease-in-out cursor-pointer text-center select-none shadow-lg active:scale-95 bg-white text-[#2f5cd6] border-2 border-[#2f5cd6] hover:bg-[#193685] hover:text-white hover:border-[#193685]">
                     {t('back')}
                </button>
              </div>
            </div>
        );

      case 'role_selection':
        return (
            <div className="flex flex-col gap-8 w-full max-w-md mx-auto h-full justify-center animate-slideUp px-8 pt-12">
              <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-4 text-center">{t('roleTitle')}</h2>
              <div className="flex flex-col gap-4 items-center w-full">
                  <Button variant="secondary" onClick={() => handleRoleSelect('سطحة')}>{t('roleSat7a')}</Button>
                  <Button variant="primary" onClick={() => handleRoleSelect('مستخدم')}>{t('roleUser')}</Button>
                  <Button variant="secondary" onClick={() => handleRoleSelect('ورشة')}>{t('roleWorkshop')}</Button>
              </div>
              <div className="mt-8 text-center flex justify-center">
                <button onClick={() => setCurrentView('home')} className="w-64 py-3 px-6 rounded-2xl text-lg font-bold transition-all duration-300 ease-in-out cursor-pointer text-center select-none shadow-lg active:scale-95 bg-white text-[#2f5cd6] border-2 border-[#2f5cd6] hover:bg-[#193685] hover:text-white hover:border-[#193685]">
                     {t('back')}
                </button>
              </div>
            </div>
        );

      case 'signup_form':
        return (
            <div className="flex flex-col gap-8 w-full max-w-md mx-auto animate-slideUp pb-10 h-full overflow-y-auto hide-scrollbar px-8 pt-12">
              <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-4 text-center">{t('detailsTitle')}</h2>
              <InputField label={t('nameLabel')} value={formData.name} onChange={handleInputChange('name')} />
              {selectedRole !== 'ورشة' && ( <InputField label={t('usernameLabel')} value={formData.username} onChange={handleInputChange('username')} dir="ltr" /> )}
              <InputField label={t('emailLabel')} value={formData.email} onChange={handleInputChange('email')} dir="ltr" type="email" />
              <InputField label={t('passwordLabel')} type="password" value={formData.password} onChange={handleInputChange('password')} dir="ltr" />
              <InputField label={t('confirmPasswordLabel')} type="password" value={formData.confirmPassword} onChange={handleInputChange('confirmPassword')} dir="ltr" />

              {selectedRole === 'سطحة' && (
                  <>
                      <InputField label={t('flatbedPlate')} value={formData.flatbedPlate || ''} onChange={handleInputChange('flatbedPlate')} placeholder="ABC 1234" />
                      <div className="flex flex-col gap-2">
                          <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg">{t('flatbedPhoto')}</label>
                          <button onClick={handlePhotoUpload} className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-[#2f5cd6] hover:text-[#2f5cd6] transition-all bg-gray-50 dark:bg-[#1f2937]">
                              {photoVerification ? ( <span className="animate-pulse">{t('analyzingPhoto')}</span> ) : photoUploaded ? ( <span className="text-green-500 font-bold">✓ {t('fileUploaded')}</span> ) : ( <> <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> {t('uploadPhotoOptional')} </> )}
                          </button>
                      </div>
                  </>
              )}

              {selectedRole === 'ورشة' && (
                  <>
                      <InputField label={t('workshopPhoneLabel')} value={formData.workshopPhone || ''} onChange={handleInputChange('workshopPhone')} dir="ltr" type="tel" />
                      <div className="flex flex-col gap-2">
                          <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg">{t('workshopLocationLabel')}</label>
                          <button onClick={() => setCurrentView('workshop_location_select')} className={`w-full py-4 rounded-2xl border-2 font-bold transition-all flex items-center justify-center gap-2 ${formData.workshopLat ? 'bg-green-50 border-green-500 text-green-600' : 'border-[#2f5cd6] text-[#2f5cd6] hover:bg-blue-50'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {formData.workshopLat ? t('locationSelected') : t('pickLocation')}
                          </button>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                           <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg">{t('commercialRegLabel')}</label>
                           <button onClick={() => handleWorkshopUpload('commercialReg')} className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 transition-colors">{comRegUploaded ? `✓ {t('fileUploaded')}` : t('uploadFile')}</button>
                      </div>
                      <div className="flex flex-col gap-2">
                           <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg">{t('municipalLicenseLabel')}</label>
                           <button onClick={() => handleWorkshopUpload('municipalLicense')} className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 transition-colors">{munLicUploaded ? `✓ {t('fileUploaded')}` : t('uploadFile')}</button>
                      </div>
                  </>
              )}
              <div className="flex flex-col gap-4 mt-8 items-center">
                <Button variant="primary" onClick={handleSignupSubmit}>{t('register')}</Button>
                <button onClick={() => setCurrentView('role_selection')} className="w-64 py-3 px-6 rounded-2xl text-lg font-bold transition-all duration-300 ease-in-out cursor-pointer text-center select-none shadow-lg active:scale-95 bg-white text-[#2f5cd6] border-2 border-[#2f5cd6] hover:bg-[#193685] hover:text-white hover:border-[#193685]">
                     {t('back')}
                </button>
              </div>
            </div>
        );

      case 'verification':
        return (
            <div className="flex flex-col gap-8 w-full max-w-md mx-auto animate-slideUp text-center h-full overflow-y-auto hide-scrollbar justify-center px-8 pt-12 pb-10">
              <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-2">{t('verifyTitle')}</h2>
              <p className="text-gray-500 mb-4">{t('verifyMsg')} <span className="text-[#2f5cd6] font-bold">{formData.email}</span></p>
              <OTPInput value={otpCode} onChange={setOtpCode} isError={otpError} />
              <div className="flex flex-col gap-4 mt-8 items-center">
                <Button variant="primary" onClick={handleVerificationSubmit}>{t('verifyBtn')}</Button>
                <span className="text-gray-400 cursor-pointer hover:text-[#2f5cd6] dark:hover:text-[#4c7bf4] transition-colors">{t('resendBtn')}</span>
                <button onClick={() => setCurrentView('signup_form')} className="w-64 py-3 px-6 rounded-2xl text-lg font-bold transition-all duration-300 ease-in-out cursor-pointer text-center select-none shadow-lg active:scale-95 bg-white text-[#2f5cd6] border-2 border-[#2f5cd6] hover:bg-[#193685] hover:text-white hover:border-[#193685]">
                     {t('back')}
                </button>
              </div>
            </div>
        );
      
      case 'page_waiting_workshop':
          return (
              <div className="flex flex-col h-full w-full items-center justify-center animate-fadeIn relative pb-20 px-8">
                  <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200" />
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={553} strokeDashoffset={553 - (553 * workshopTimer) / 300} className="text-[#2f5cd6] transition-all duration-1000 ease-linear" />
                      </svg>
                      <span className="absolute text-4xl font-bold font-mono text-[#0a3461] dark:text-white">{formatTime(workshopTimer)}</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#0a3461] dark:text-white text-center mb-2">Waiting for Workshop Approval</h2>
                  <p className="text-gray-500 text-sm text-center mb-8">The workshop has 5 minutes to accept your request</p>
                  
                  <button 
                      onClick={() => {
                          if (matchedRequest) updateRequestStatus(matchedRequest.id, 'cancelled');
                          setCurrentView('workshop_selection');
                      }}
                      className="w-full max-w-xs py-3 rounded-2xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 transition-colors"
                  >
                      {t('cancel')}
                  </button>
              </div>
          );

      case 'dashboard_user':
          return (
              <div className="flex flex-col h-full w-full relative pb-20 pt-10">
                  {matchedRequest && matchedRequest.status === 'pending' && userTab === 'home' && (
                       <div onClick={() => setCurrentView(canDrive ? 'page_red_screen' : 'page_w')} className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-[#0a3461] text-white px-6 py-3 rounded-full shadow-xl z-40 flex items-center gap-3 cursor-pointer animate-bounce">
                           <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                           <span className="font-bold text-sm">{canDrive ? 'Heading to Workshop' : t('searchingStatus')}</span>
                       </div>
                  )}
                  {matchedRequest && (matchedRequest.status === 'accepted' || matchedRequest.status === 'picked_up') && userTab === 'home' && (
                       <div onClick={() => setCurrentView('chat_view')} className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-xl z-40 flex items-center gap-3 cursor-pointer animate-pulse">
                           <div className="w-3 h-3 bg-white rounded-full"></div>
                           <span className="font-bold text-sm">{t('driverOnWay')}</span>
                       </div>
                  )}

                  {userTab === 'home' && (
                    <div className="flex flex-col gap-6 w-full animate-fadeIn items-center px-8">
                        <div className="w-full flex justify-between items-center px-2 mb-2">
                            <div className="flex items-center gap-2">
                                <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2937] shadow-sm flex items-center justify-center text-gray-600 dark:text-white">{theme === 'light' ? '☀️' : '🌙'}</button>
                                <button onClick={toggleLang} className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2937] shadow-sm flex items-center justify-center text-gray-600 dark:text-white font-bold text-xs">{lang === 'ar' ? 'EN' : 'AR'}</button>
                                <div className="relative">
                                    <button onClick={handleBellClick} className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2937] shadow-sm flex items-center justify-center text-gray-600 dark:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></button>
                                    {unreadCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-[#111827]"></span>}
                                </div>
                                {showNotifDropdown && (
                                     <div ref={notifDropdownRef} className="absolute top-16 left-4 z-50 w-72 bg-white dark:bg-[#1f2937] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-80 overflow-y-auto">
                                         <h4 className="p-4 font-bold border-b dark:border-gray-700 text-[#0a3461] dark:text-white">{t('notifications')}</h4>
                                         {currentUser?.notifications.length === 0 ? ( <p className="p-4 text-center text-gray-400 text-sm">{t('emptyNotifications')}</p> ) : ( currentUser?.notifications.map(n => ( <div key={n.id} onClick={() => markNotificationAsRead(n.id)} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => handleTouchEnd(n.id)} className={`p-4 border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer relative overflow-hidden transition-colors ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}><div className="flex justify-between items-start mb-1"><span className={`text-sm font-bold ${!n.read ? 'text-[#2f5cd6] dark:text-[#4c7bf4]' : 'text-gray-700 dark:text-gray-300'}`}>{n.title}</span><span className="text-[10px] text-gray-400">{n.time}</span></div><p className="text-xs text-gray-500 dark:text-gray-400">{n.message}</p>{!n.read && <div className="absolute top-4 right-2 w-2 h-2 bg-red-500 rounded-full"></div>}</div> )) )}
                                     </div>
                                 )}
                                 <div onClick={() => setCurrentView('profile')} className="w-10 h-10 rounded-full bg-cyan-400 text-white flex items-center justify-center font-bold cursor-pointer shadow-md border-2 border-white">{currentUser?.name.substring(0, 2).toUpperCase()}</div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1"><h1 className="text-2xl font-black text-[#0a3461] dark:text-white tracking-tight">كارفا</h1><div className="w-6 h-6 bg-[#2f5cd6] rounded-md flex items-center justify-center text-white text-xs font-bold shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg></div></div>
                                <span className="text-xs text-gray-500 font-bold -mt-1">{t('nounUser')}</span>
                            </div>
                        </div>

                        {/* Revised Top Section: Welcome Card + Green Wallet */}
                        <div className="flex gap-4 w-full mb-2">
                             {/* Welcome Card */}
                             <div className="flex-1 bg-gradient-to-r from-[#2f5cd6] to-[#193685] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                                 <div className="relative z-10 text-right h-full flex flex-col justify-center">
                                     <h2 className="text-3xl font-bold mb-1">{t('welcomeBack')} {currentUser?.name.split(' ')[0]}</h2>
                                     <p className="opacity-90 text-sm font-medium">{t('carStatus')}</p>
                                 </div>
                             </div>

                             {/* Wallet Card - Green Gradient */}
                             <div className="w-1/3 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl p-4 text-white shadow-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-5 -mt-5"></div>
                                  <div className="relative z-10 flex flex-col items-center">
                                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                      </div>
                                      <h3 className="font-bold text-xs opacity-90">{t('myWallet')}</h3>
                                      <span className="font-mono font-bold text-lg">{currentUser?.walletBalance || 0}</span>
                                  </div>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div onClick={() => setCurrentView('create_request')} className="col-span-2 bg-[#0a3461] p-5 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all group flex items-center justify-between">
                                 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
                                 <div className="text-right"><h3 className="text-xl font-bold text-white mb-1">{t('createRequest')}</h3><p className="text-xs text-blue-200">{t('newRequestDesc')}</p></div>
                            </div>
                            
                            {/* Garage Card */}
                            <div onClick={() => setCurrentView('garage')} className="col-span-2 bg-white dark:bg-[#1f2937] p-4 rounded-2xl shadow-md cursor-pointer hover:shadow-lg hover:border-[#2f5cd6] border border-transparent transition-all flex flex-col items-center justify-center gap-2 h-32">
                                 <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                                 <h3 className="font-bold text-[#0a3461] dark:text-white text-sm">{t('myGarage')}</h3>
                            </div>
                        </div>
                    </div>
                  )}

                  {userTab === 'requests' && <OrdersList isSat7a={false} />}
                  {userTab === 'messages' && <UserMessagesList />}

                  <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1f2937] border-t border-gray-200 dark:border-gray-700 p-2 pb-6 z-50 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                       <button onClick={() => { setUserTab('home'); setRequestsSubTab('history'); setCurrentView('dashboard_user'); }} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${userTab === 'home' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                           <span className="text-xs font-bold">{t('tabHome')}</span>
                       </button>
                       <button onClick={() => { setUserTab('requests'); setRequestsSubTab('current'); }} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${userTab === 'requests' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                           <span className="text-xs font-bold">{t('tabRequests')}</span>
                       </button>
                       <button onClick={() => { setUserTab('messages'); }} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${userTab === 'messages' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                           <span className="text-xs font-bold">{t('tabMessages')}</span>
                       </button>
                  </div>
              </div>
          );

      case 'dashboard_sat7a':
           return (
              <div className="flex flex-col h-full w-full relative pb-20 pt-10">
                   <div className="w-full flex justify-between items-center px-8 mb-6">
                        <div className="flex items-center gap-2">
                             <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2937] shadow-sm flex items-center justify-center text-gray-600 dark:text-white">{theme === 'light' ? '☀️' : '🌙'}</button>
                             <button onClick={toggleLang} className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2937] shadow-sm flex items-center justify-center text-gray-600 dark:text-white font-bold text-xs">{lang === 'ar' ? 'EN' : 'AR'}</button>
                             <div className="w-10 h-10 rounded-full bg-cyan-400 text-white flex items-center justify-center font-bold cursor-pointer shadow-md border-2 border-white">{currentUser?.name.substring(0, 2).toUpperCase()}</div>
                        </div>
                        <div className="flex flex-col items-end">
                             <h1 className="text-2xl font-black text-[#0a3461] dark:text-white tracking-tight">كارفا</h1>
                             <span className="text-xs text-gray-500 font-bold -mt-1">{t('nounSat7a')}</span>
                        </div>
                   </div>

                   {/* Sat7a Dashboard Top Section */}
                   {sat7aTab === 'requests' && (
                       <>
                           <div className="flex gap-4 w-full mb-6 px-8">
                                 {/* Welcome Card */}
                                 <div className="flex-1 bg-gradient-to-r from-[#2f5cd6] to-[#193685] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                                     <div className="relative z-10 text-right h-full flex flex-col justify-center">
                                         <h2 className="text-3xl font-bold mb-1">{t('welcomeBack')} {currentUser?.name.split(' ')[0]}</h2>
                                         <p className="opacity-90 text-sm font-medium">{t('carStatus')}</p>
                                     </div>
                                 </div>

                                 {/* Wallet Card - Green Gradient */}
                                 <div className="w-1/3 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl p-4 text-white shadow-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-5 -mt-5"></div>
                                      <div className="relative z-10 flex flex-col items-center">
                                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-1">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                          </div>
                                          <h3 className="font-bold text-xs opacity-90">{t('myWallet')}</h3>
                                          <span className="font-mono font-bold text-lg">{currentUser?.walletBalance || 0}</span>
                                      </div>
                                 </div>
                            </div>
                       </>
                   )}

                   {sat7aTab === 'requests' && (
                       <div className="flex-1 w-full p-6 overflow-y-auto pb-24 px-8">
                           <h2 className="text-2xl font-bold text-[#0a3461] dark:text-white mb-6 text-right">{t('searchResultsTitle')}</h2>
                           <div className="flex flex-col gap-4">
                               {availableRequests.length > 0 ? availableRequests.map(req => (
                                   <div key={req.id} className="bg-white dark:bg-[#1f2937] p-5 rounded-3xl shadow-lg border border-gray-50 dark:border-gray-700 flex flex-col gap-3">
                                       <div className="flex justify-between items-start">
                                            <div><h3 className="font-bold text-[#0a3461] dark:text-white text-lg">{req.car}</h3><p className="text-sm text-gray-400">{req.name}</p></div>
                                            <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-xs font-bold">{req.distClient} {t('km')}</span>
                                       </div>
                                       <div className="text-right text-sm text-gray-500">
                                            <p>{t('distanceToDest')}: {req.distDest} {t('km')}</p>
                                            <p className="font-bold text-[#2f5cd6] mt-1">{t('destination')}: {req.destName}</p>
                                       </div>
                                       <div className="grid grid-cols-3 gap-2 mt-2">
                                           <button 
                                              onClick={() => { setSelectedRequestForDetails(req); setCurrentView('request_details_view'); }} 
                                              className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
                                           >
                                              {t('viewDetails')}
                                           </button>
                                           <button 
                                              onClick={() => handleRejectRequest(req.id)} 
                                              className="bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-100"
                                           >
                                              {t('rejectRequest')}
                                           </button>
                                           <button 
                                              onClick={() => handleAcceptRequest(req)} 
                                              className="bg-[#2f5cd6] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#193685]"
                                           >
                                              {t('acceptRequest')}
                                           </button>
                                       </div>
                                   </div>
                               )) : (
                                   <div className="flex flex-col items-center justify-center py-20 text-gray-400"><p>{t('noRequests')}</p></div>
                               )}
                           </div>
                       </div>
                   )}

                   {sat7aTab === 'my_orders' && <OrdersList isSat7a={true} />}
                   {sat7aTab === 'messages' && <Sat7aMessagesList />}

                   <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1f2937] border-t border-gray-200 dark:border-gray-700 p-2 pb-6 z-50 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                       <button onClick={() => setSat7aTab('requests')} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${sat7aTab === 'requests' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                           <span className="text-xs font-bold">{t('tabRequests')}</span>
                       </button>
                       <button onClick={() => setSat7aTab('my_orders')} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${sat7aTab === 'my_orders' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                           <span className="text-xs font-bold">{t('tabMyOrders')}</span>
                       </button>
                       <button onClick={() => setSat7aTab('messages')} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${sat7aTab === 'messages' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                           <span className="text-xs font-bold">{t('tabMessages')}</span>
                       </button>
                   </div>
              </div>
           );

      case 'dashboard_workshop':
           return (
              <div className="flex flex-col h-full w-full relative pb-20 pt-10">
                   <div className="w-full flex justify-between items-center px-8 mb-6">
                        <div className="flex items-center gap-2">
                             <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2937] shadow-sm flex items-center justify-center text-gray-600 dark:text-white">{theme === 'light' ? '☀️' : '🌙'}</button>
                             <button onClick={toggleLang} className="w-10 h-10 rounded-full bg-white dark:bg-[#1f2937] shadow-sm flex items-center justify-center text-gray-600 dark:text-white font-bold text-xs">{lang === 'ar' ? 'EN' : 'AR'}</button>
                             <div className="w-10 h-10 rounded-full bg-cyan-400 text-white flex items-center justify-center font-bold cursor-pointer shadow-md border-2 border-white">{currentUser?.name.substring(0, 2).toUpperCase()}</div>
                        </div>
                        <div className="flex flex-col items-end">
                             <h1 className="text-2xl font-black text-[#0a3461] dark:text-white tracking-tight">كارفا</h1>
                             <span className="text-xs text-gray-500 font-bold -mt-1">{t('nounWorkshop')}</span>
                        </div>
                   </div>

                   {/* Workshop Dashboard Top Section */}
                   {workshopTab === 'orders' && (
                       <div className="flex gap-4 w-full mb-6 px-8">
                             {/* Welcome Card */}
                             <div className="flex-1 bg-gradient-to-r from-[#2f5cd6] to-[#193685] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
                                 <div className="relative z-10 text-right h-full flex flex-col justify-center">
                                     <h2 className="text-3xl font-bold mb-1">{t('welcomeBack')} {currentUser?.name.split(' ')[0]}</h2>
                                     <p className="opacity-90 text-sm font-medium">{t('carStatus')}</p>
                                 </div>
                             </div>

                             {/* Wallet Card - Green Gradient */}
                             <div className="w-1/3 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl p-4 text-white shadow-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-5 -mt-5"></div>
                                  <div className="relative z-10 flex flex-col items-center">
                                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                      </div>
                                      <h3 className="font-bold text-xs opacity-90">{t('myWallet')}</h3>
                                      <span className="font-mono font-bold text-lg">{currentUser?.walletBalance || 0}</span>
                                  </div>
                             </div>
                        </div>
                   )}

                   {workshopTab === 'orders' && <WorkshopRequestsList />}
                   {workshopTab === 'messages' && <WorkshopMessagesList />}

                   <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1f2937] border-t border-gray-200 dark:border-gray-700 p-2 pb-6 z-50 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                       <button onClick={() => setWorkshopTab('orders')} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${workshopTab === 'orders' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                           <span className="text-xs font-bold">{t('tabRequests')}</span>
                       </button>
                       <button onClick={() => setWorkshopTab('messages')} className={`flex flex-col items-center gap-1 p-2 w-full transition-colors ${workshopTab === 'messages' ? 'text-[#2f5cd6]' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                           <span className="text-xs font-bold">{t('tabMessages')}</span>
                       </button>
                   </div>
              </div>
           );

      case 'request_details_view':
          const req = selectedRequestForDetails;
          if (!req) return null;
          return (
             <div className="flex flex-col gap-6 w-full animate-slideUp pb-10 h-full overflow-y-auto hide-scrollbar px-8 pt-6">
                 <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-2 text-center">{t('requestDetails')}</h2>
                 
                 {/* Map Section */}
                 <div className="w-full h-48 rounded-3xl overflow-hidden shadow-md border-2 border-gray-100 relative">
                     <div ref={mapContainerRef} className="w-full h-full"></div>
                     <div className="absolute bottom-2 right-2 bg-white/80 px-2 py-1 rounded-lg text-xs font-bold shadow-sm z-[400] pointer-events-none">
                         {t('distance')}: {calculateDistance(req.userLat, req.userLng, req.destLat, req.destLng)} {t('km')}
                     </div>
                 </div>

                 {/* User & Car Info */}
                 <div className="bg-white dark:bg-[#1f2937] p-5 rounded-3xl shadow-lg border border-gray-50 dark:border-gray-700">
                     <h3 className="text-xl font-bold text-[#0a3461] dark:text-white mb-4 border-b pb-2">{t('detailsTitle')}</h3>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <p className="text-xs text-gray-500">{t('clientName')}</p>
                             <p className="font-bold text-gray-900 dark:text-white">{req.name}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500">{t('carType')}</p>
                             <p className="font-bold text-gray-900 dark:text-white">{req.car} ({req.year})</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500">{t('destination')}</p>
                             <p className="font-bold text-[#2f5cd6]">{req.destName}</p>
                         </div>
                         <div>
                             <p className="text-xs text-gray-500">{t('incidentTime')}</p>
                             <p className="font-bold text-gray-900 dark:text-white">{req.incidentTime || 'N/A'}</p>
                         </div>
                     </div>
                 </div>

                 {/* Problem Description */}
                 <div className="bg-white dark:bg-[#1f2937] p-5 rounded-3xl shadow-lg border border-gray-50 dark:border-gray-700">
                     <h3 className="text-xl font-bold text-[#0a3461] dark:text-white mb-2">{t('probDescTitle')}</h3>
                     <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-sm min-h-[60px]">
                         {req.problemDescription || 'No description provided.'}
                     </p>
                     
                     {/* Images */}
                     <div className="flex gap-4 mt-4 overflow-x-auto pb-2">
                         {req.carImage && (
                             <div className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
                                 <img src={req.carImage} alt="Car" className="w-full h-full object-cover" />
                             </div>
                         )}
                         {req.accidentReportImage && (
                             <div className="flex-shrink-0 w-32 h-32 rounded-xl overflow-hidden border border-gray-200 relative">
                                 <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center font-bold text-white text-xs z-10">{t('isAccident')}</div>
                                 <img src={req.accidentReportImage} alt="Accident" className="w-full h-full object-cover" />
                             </div>
                         )}
                     </div>
                 </div>

                 {/* Action Buttons for Sat7a */}
                 {currentUser?.role === 'سطحة' && req.status === 'pending' && (
                     <div className="grid grid-cols-2 gap-4 mt-4">
                         <button onClick={() => handleRejectRequest(req.id)} className="py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors">
                             {t('rejectRequest')}
                         </button>
                         <button onClick={() => handleAcceptRequest(req)} className="py-4 bg-[#2f5cd6] text-white rounded-2xl font-bold hover:bg-[#193685] transition-colors shadow-lg">
                             {t('acceptRequest')}
                         </button>
                     </div>
                 )}

                 <div className="mt-auto pt-4 text-center">
                     <span onClick={() => {
                        if (currentUser?.role === 'سطحة') setCurrentView('dashboard_sat7a');
                        else if (currentUser?.role === 'ورشة') setCurrentView('dashboard_workshop');
                        else setCurrentView('dashboard_user');
                     }} className="text-gray-400 cursor-pointer hover:text-[#2f5cd6] dark:hover:text-[#4c7bf4] transition-colors">{t('back')}</span>
                 </div>
             </div>
          );

      case 'page_w':
          return (
              <div className="flex flex-col h-full w-full items-center justify-center gap-8 relative pb-20 flex-1 px-8">
                  <div className="w-40 h-40 rounded-full border-8 border-[#2f5cd6]/30 border-t-[#2f5cd6] animate-spin"></div>
                  
                  <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-[#0a3461] dark:text-white animate-pulse">{t('searchingFlatbed')}</h2>
                      <p className="text-gray-500 text-sm">We are connecting you to the nearest driver...</p>
                  </div>

                  <div className="flex flex-col gap-4 w-full max-w-xs mt-8">
                      <Button variant="primary" onClick={() => setCurrentView('dashboard_user')}>
                          {t('backToDash')}
                      </Button>
                      
                      <button 
                          onClick={() => {
                              if (matchedRequest) {
                                  updateRequestStatus(matchedRequest.id, 'cancelled');
                                  setCurrentView('workshop_selection');
                              } else {
                                  setCurrentView('dashboard_user');
                              }
                          }}
                          className="w-full py-4 rounded-2xl border-2 border-red-100 text-red-500 font-bold hover:bg-red-50 transition-colors"
                      >
                          {t('cancelOrder')}
                      </button>
                  </div>
              </div>
          );

      case 'match_sat7a_view':
          const isSat7aView = true;
          return (
             <div className="flex flex-col h-full w-full relative animate-fadeIn flex-1">
                 <div className="absolute top-0 left-0 right-0 bg-white dark:bg-[#1f2937] p-6 z-[50] shadow-md flex items-center justify-between gap-4 rounded-b-3xl">
                     <button onClick={() => setCurrentView('chat_view')} className="flex flex-col items-center gap-1 text-[#2f5cd6] dark:text-[#4c7bf4] relative">
                         <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                         </div>
                         <span className="text-xs font-bold">{t('chat')}</span>
                         {hasUnreadMessages && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white"></span>}
                     </button>
                     
                     <div className="flex-1 text-center">
                         <h2 className="font-bold text-[#0a3461] dark:text-white">{matchedRequest?.name}</h2>
                         <p className="text-xs text-gray-400">{matchedRequest?.status === 'accepted' ? 'Pickup' : 'Dropoff'}</p>
                     </div>

                     {!matchedRequest?.sat7aConfirmed ? (
                         <button 
                             onClick={() => setShowConfirmation({ type: 'arrival', isOpen: true })} 
                             className="px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all bg-[#2f5cd6] text-white hover:bg-[#193685]"
                         >
                             {matchedRequest?.status === 'accepted' ? t('flatbedArrivedSat7aBtn') : t('arrivedWorkshop')}
                         </button>
                     ) : (
                         <button 
                             disabled 
                             className="px-4 py-2 rounded-xl font-bold text-sm shadow-sm transition-all bg-gray-100 text-gray-400 cursor-default"
                         >
                             {t('waitingForConfirmation')}
                         </button>
                     )}
                 </div>

                 <div className="flex-1 w-full relative z-0 h-full" ref={mapContainerRef} style={{ minHeight: '100%' }}></div>
             </div>
          );

      case 'match_user_view':
          return (
             <div className="flex flex-col h-full w-full relative animate-fadeIn flex-1">
                 <div className="flex-1 w-full relative z-0 h-full" ref={mapContainerRef} style={{ minHeight: '100%' }}></div>
                 
                 {/* Back button overlay */}
                 <button onClick={() => setCurrentView('dashboard_user')} className="absolute top-4 left-4 z-[50] p-3 bg-white dark:bg-[#1f2937] rounded-full shadow-lg text-gray-600 dark:text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                 </button>

                 <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1f2937] p-8 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-[50] animate-slideUp">
                      <div className="w-16 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
                      <div className="flex justify-between items-center mb-6">
                          <div><h2 className="text-xl font-black text-[#0a3461] dark:text-white">{matchedRequest?.status === 'accepted' ? t('driverOnWay') : matchedRequest?.status === 'picked_up' ? t('headingToDest') : t('arrivedDest')}</h2><p className="text-sm text-gray-500">{matchedRequest?.driverName}</p></div>
                          <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-md"><img src={`https://ui-avatars.com/api/?name=${matchedRequest?.driverName}&background=random`} alt="Avatar" className="w-full h-full object-cover" /></div>
                      </div>
                      <div className="flex gap-4">
                          <button onClick={() => setCurrentView('chat_view')} className="flex-1 py-4 bg-[#2f5cd6] text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-[#193685] transition-all flex items-center justify-center gap-2 relative"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>{t('chat')}{hasUnreadMessages && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border border-white"></span>}</button>
                          
                          {!matchedRequest?.userConfirmed ? (
                              <button 
                                  onClick={() => setShowConfirmation({ type: 'arrival', isOpen: true })} 
                                  className="flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all bg-white text-gray-700 border-2 border-gray-100 hover:bg-gray-50"
                              >
                                  {matchedRequest?.status === 'accepted' ? t('flatbedArrivedUserBtn') : t('arrivedWorkshop')}
                              </button>
                          ) : (
                              <button 
                                  disabled 
                                  className="flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all bg-gray-100 text-gray-400 cursor-default"
                              >
                                  {t('waitingForConfirmation')}
                              </button>
                          )}
                      </div>
                 </div>
             </div>
          );

      case 'chat_view':
          const chatReq = matchedRequest;
          if (!chatReq) return null; // Or redirect
          const isSat7aChat = currentUser?.role === 'سطحة';
          const chatMessages = chatReq.chatMessages || [];
          const chatPartnerName = isSat7aChat ? chatReq.name : (chatReq.driverName || 'Driver');

          return (
              <div className="flex flex-col h-full w-full relative animate-fadeIn bg-gray-50 dark:bg-[#111827]">
                  {/* Chat Header */}
                  <div className="bg-white dark:bg-[#1f2937] p-4 shadow-sm flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setCurrentView(isSat7aChat ? 'match_sat7a_view' : 'match_user_view')} className="text-gray-500 hover:text-[#2f5cd6]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden"><img src={`https://ui-avatars.com/api/?name=${chatPartnerName}&background=random`} alt="Avatar" className="w-full h-full object-cover" /></div>
                          <div>
                              <h3 className="font-bold text-[#0a3461] dark:text-white">{chatPartnerName}</h3>
                              <p className="text-xs text-green-500 font-bold">{t('driverOnWay')}</p> 
                          </div>
                      </div>
                      <button 
                          onClick={() => setCurrentView(isSat7aChat ? 'match_sat7a_view' : 'match_user_view')} 
                          className="w-10 h-10 bg-blue-50 text-[#2f5cd6] rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          </svg>
                      </button>
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                      {chatMessages.map((msg, idx) => {
                          const isMe = msg.sender === (isSat7aChat ? 'driver' : 'user');
                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] p-3 rounded-2xl ${isMe ? 'bg-[#2f5cd6] text-white rounded-br-none' : 'bg-white dark:bg-[#1f2937] text-gray-800 dark:text-white rounded-bl-none shadow-sm'}`}>
                                      {msg.image && <img src={msg.image} alt="Sent" className="w-full rounded-lg mb-2" />}
                                      <p className="text-sm">{msg.text}</p>
                                      <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{msg.time}</span>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={messagesEndRef}></div>
                  </div>

                  {/* Input Area */}
                  <div className="bg-white dark:bg-[#1f2937] p-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-[#2f5cd6] transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                      <input 
                          type="text" 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)} 
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(undefined, false)}
                          placeholder={t('typeMessage')} 
                          className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-3 outline-none text-sm text-gray-900 dark:text-white"
                      />
                      <button onClick={() => handleSendMessage(undefined, false)} className="w-10 h-10 bg-[#2f5cd6] rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, false)} />
                  </div>
              </div>
          );

      case 'workshop_user_chat':
          const wsReq = matchedRequest;
          if (!wsReq) return null;
          const isWorkshop = currentUser?.role === 'ورشة';
          const wsMsgs = wsReq.negotiationChatMessages || [];
          const wsPartnerName = isWorkshop ? wsReq.name : wsReq.destName;
          
          return (
              <div className="flex flex-col h-full w-full relative animate-fadeIn bg-gray-50 dark:bg-[#111827]">
                  {/* Header */}
                  <div className="bg-white dark:bg-[#1f2937] p-4 shadow-sm flex items-center justify-between z-10">
                      <div className="flex items-center gap-3">
                          <button onClick={() => {
                              if (isWorkshop) setCurrentView('dashboard_workshop');
                              else setCurrentView('dashboard_user');
                          }} className="text-gray-500 hover:text-[#2f5cd6]">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                              {wsPartnerName.substring(0,1).toUpperCase()}
                          </div>
                          <div>
                              <h3 className="font-bold text-[#0a3461] dark:text-white">{wsPartnerName}</h3>
                              <p className="text-xs text-purple-500 font-bold">{t('negotiating')}</p>
                          </div>
                      </div>
                      
                      {/* Bill Button */}
                      <button onClick={() => setCurrentView('bill_view')} className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl font-bold text-sm shadow-sm hover:bg-yellow-300 transition-colors flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 3.5H9m4.5 3.5H9M19 11c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          {t('billTitle')}
                      </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                      {wsMsgs.map((msg, idx) => {
                          if (msg.sender === 'system') {
                              return (
                                  <div key={idx} className="flex justify-center my-2">
                                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">{msg.text}</span>
                                  </div>
                              );
                          }
                          const isMe = msg.sender === (isWorkshop ? 'workshop' : 'user');
                          return (
                              <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[80%] p-3 rounded-2xl ${isMe ? 'bg-purple-600 text-white rounded-br-none' : 'bg-white dark:bg-[#1f2937] text-gray-800 dark:text-white rounded-bl-none shadow-sm'}`}>
                                      {msg.image && <img src={msg.image} alt="Sent" className="w-full rounded-lg mb-2" />}
                                      <p className="text-sm">{msg.text}</p>
                                      <span className={`text-[10px] block mt-1 ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>{msg.time}</span>
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={messagesEndRef}></div>
                  </div>

                  {/* Input */}
                  <div className="bg-white dark:bg-[#1f2937] p-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                      <input 
                          type="text" 
                          value={chatInput} 
                          onChange={(e) => setChatInput(e.target.value)} 
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(undefined, true)}
                          placeholder={t('typeMessage')} 
                          className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-full px-4 py-3 outline-none text-sm text-gray-900 dark:text-white"
                      />
                      <button onClick={() => handleSendMessage(undefined, true)} className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, true)} />
                  </div>
              </div>
          );
      
      case 'page_green_screen':
          return <div className="w-full h-screen bg-green-500 animate-fadeIn flex items-center justify-center"></div>;

      case 'page_red_screen':
          return <div className="w-full h-screen bg-red-500 animate-fadeIn flex items-center justify-center"></div>;

      case 'page_waiting_payment':
           return (
               <div className="w-full h-screen bg-white animate-fadeIn flex flex-col items-center justify-center gap-8">
                    <div className="w-24 h-24 rounded-full border-4 border-[#2f5cd6] border-t-transparent animate-spin"></div>
                    <h2 className="text-2xl font-bold text-[#0a3461]">{t('waitingPayment')}</h2>
               </div>
           );

      case 'payment_view':
           return (
               <div className="flex flex-col h-full w-full relative animate-fadeIn bg-white dark:bg-[#1f2937] p-8 pt-12 items-center">
                    <h2 className="text-3xl font-black text-[#0a3461] dark:text-white mb-8">{t('paymentTitle')}</h2>
                    
                    <div className="w-full max-w-sm bg-gray-50 dark:bg-gray-800 rounded-3xl p-8 mb-6 shadow-lg border border-gray-100 dark:border-gray-700">
                         <div className="flex justify-between items-center mb-4">
                              <span className="text-gray-500 dark:text-gray-400">{t('tripCost')}</span>
                              <span className="text-2xl font-bold text-[#0a3461] dark:text-white">{matchedRequest?.tripCost || 0} {t('sar')}</span>
                         </div>
                         <div className="h-px bg-gray-200 dark:bg-gray-700 w-full mb-4"></div>
                         <div className="flex justify-between items-center">
                              <span className="text-gray-500 dark:text-gray-400">{t('walletBalance')}</span>
                              <span className={`text-xl font-bold ${(currentUser?.walletBalance || 0) < (matchedRequest?.tripCost || 0) ? 'text-red-500' : 'text-green-500'}`}>
                                  {currentUser?.walletBalance || 0} {t('sar')}
                              </span>
                         </div>
                    </div>

                    <div className="w-full max-w-sm">
                         <Button variant="primary" onClick={handlePayment}>{t('pay')}</Button>
                         {(currentUser?.walletBalance || 0) < (matchedRequest?.tripCost || 0) && (
                             <p className="text-center text-red-500 font-bold mt-4 animate-bounce">{t('insufficientFunds')}</p>
                         )}
                    </div>
               </div>
           );

      case 'bill_view':
           return (
               <BillView 
                  matchedRequest={matchedRequest} 
                  currentUser={currentUser} 
                  t={t}
                  onUpdate={handleUpdateBill}
                  onFinish={handleFinishBill}
                  onAgree={handleUserAgree}
                  onBack={() => setCurrentView('workshop_user_chat')} 
               />
           );

      case 'profile':
        return (
            <div className="flex flex-col gap-6 w-full animate-slideUp pb-10 h-full overflow-y-auto hide-scrollbar px-8 pt-6">
                <div className="bg-gradient-to-br from-[#2f5cd6] to-[#193685] rounded-3xl p-8 text-white shadow-xl text-center">
                    <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold border-4 border-white/30">
                        {currentUser?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <h2 className="text-3xl font-bold mb-1">{currentUser?.name}</h2>
                    <p className="opacity-80">@{currentUser?.username}</p>
                </div>
                
                <div className="bg-white dark:bg-[#1f2937] rounded-3xl p-6 shadow-lg border border-gray-50 dark:border-gray-700">
                     <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
                         <span className="text-gray-500 dark:text-gray-400 font-bold">{t('memberSince')}</span>
                         <span className="font-bold text-[#0a3461] dark:text-white">{currentUser?.joinDate}</span>
                     </div>
                     <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
                         <span className="text-gray-500 dark:text-gray-400 font-bold">{t('emailProfile')}</span>
                         <span className="font-bold text-[#0a3461] dark:text-white">{currentUser?.email}</span>
                     </div>
                     <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-gray-700">
                         <span className="text-gray-500 dark:text-gray-400 font-bold">{t('walletBalance')}</span>
                         <span className="font-bold text-green-500">{currentUser?.walletBalance || 0} {t('sar')}</span>
                     </div>
                     <div className="flex items-center justify-between">
                         <span className="text-gray-500 dark:text-gray-400 font-bold">{t('accountSettings')}</span>
                         <button className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold hover:underline">{t('editProfile')}</button>
                     </div>
                </div>

                <div className="flex flex-col gap-4 mt-4 items-center">
                    <Button variant="secondary" onClick={() => { setCurrentUser(null); setCurrentView('home'); }}>{t('logout')}</Button>
                    <button onClick={() => {
                        if (currentUser?.role === 'سطحة') setCurrentView('dashboard_sat7a');
                        else if (currentUser?.role === 'ورشة') setCurrentView('dashboard_workshop');
                        else setCurrentView('dashboard_user');
                    }} className="w-64 py-3 px-6 rounded-2xl text-lg font-bold transition-all duration-300 ease-in-out cursor-pointer text-center select-none shadow-lg active:scale-95 bg-white text-[#2f5cd6] border-2 border-[#2f5cd6] hover:bg-[#193685] hover:text-white hover:border-[#193685]">
                         {t('backToDash')}
                    </button>
                </div>
                
                <p className="text-center text-gray-400 text-xs mt-4">{t('rights')} © 2024</p>
            </div>
        );

      case 'create_request':
        const userGarage = currentUser?.garage || [];
        return (
            <div className="flex flex-col gap-6 w-full animate-slideUp pb-10 h-full px-8 pt-6">
                 <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-2 text-center">{t('createRequest')}</h2>
                 
                 {userGarage.length === 0 ? (
                     <div className="flex-1 flex flex-col items-center justify-center">
                         <div className="text-center py-10 px-4">
                             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-4 mx-auto">🚗</div>
                             <p className="text-[#0a3461] dark:text-white font-bold text-xl">ماعندك سيارات في الكراج</p>
                         </div>
                         <Button variant="secondary" onClick={() => setCurrentView('garage')}>{t('addCar')}</Button>
                     </div>
                 ) : (
                     <div className="flex-1 overflow-y-auto">
                         <div className="flex flex-col gap-4">
                             {userGarage.map(car => (
                                 <div 
                                     key={car.id} 
                                     onClick={() => { 
                                         setSelectedCar(car.nameEn); 
                                         setSelectedYear(car.year); 
                                         setCurrentView('problem_description'); 
                                     }} 
                                     className="bg-white dark:bg-[#1f2937] p-5 rounded-3xl shadow-lg border border-gray-50 dark:border-gray-700 cursor-pointer hover:border-[#2f5cd6] transition-all flex justify-between items-center group"
                                 >
                                     <div className="flex gap-4 items-center">
                                         {car.photo ? (
                                             <img src={car.photo} alt={car.nameEn} className="w-16 h-16 rounded-xl object-cover" />
                                         ) : (
                                             <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🚗</div>
                                         )}
                                         <div>
                                             <h3 className="text-xl font-bold text-[#0a3461] dark:text-white group-hover:text-[#2f5cd6] transition-colors">{lang === 'ar' ? car.nameAr : car.nameEn}</h3>
                                             <p className="text-gray-400 text-sm mt-1">{car.year} • {car.color}</p>
                                             <span className="inline-block mt-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-widest text-gray-600 dark:text-gray-300">{car.plate}</span>
                                         </div>
                                     </div>
                                     <div className="w-10 h-10 rounded-full bg-[#2f5cd6]/10 flex items-center justify-center text-[#2f5cd6]">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}

                 <div className="mt-auto text-center pt-4">
                     <span onClick={() => setCurrentView('dashboard_user')} className="text-gray-400 cursor-pointer hover:text-[#2f5cd6] dark:hover:text-[#4c7bf4] transition-colors">{t('back')}</span>
                 </div>
            </div>
        );

      case 'problem_description':
          return (
            <div className="flex flex-col gap-6 w-full animate-slideUp pb-10 h-full overflow-y-auto hide-scrollbar px-8 pt-6">
                <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-2 text-center">{t('probDescTitle')}</h2>
                
                <div className="w-full">
                    <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg mb-2 block text-right">{t('probDescTitle')}</label>
                    <textarea 
                        value={problemDesc}
                        onChange={(e) => setProblemDesc(e.target.value)}
                        placeholder={t('probDescPlaceholder')}
                        className="w-full p-4 rounded-2xl border-2 border-[#2f5cd6]/30 dark:border-[#4c7bf4]/30 focus:border-[#2f5cd6] dark:focus:border-[#4c7bf4] outline-none text-right bg-white dark:bg-[#1f2937] text-[#0a3461] dark:text-white h-32 resize-none"
                    ></textarea>
                </div>

                <div className="w-full">
                    <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg mb-2 block text-right">{t('incidentTime')}</label>
                    <input 
                        type="time" 
                        value={incidentTime}
                        onChange={(e) => setIncidentTime(e.target.value)}
                        className="w-full p-4 rounded-2xl border-2 border-[#2f5cd6]/30 bg-white dark:bg-[#1f2937] text-[#0a3461] dark:text-white text-center text-xl font-bold"
                    />
                </div>

                {/* Professional Switches */}
                <div className="flex items-center justify-between bg-white dark:bg-[#1f2937] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-[#0a3461] dark:text-white font-bold text-lg">{t('canDriveLabel')}</span>
                    <button 
                        onClick={() => setCanDrive(!canDrive)} 
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2f5cd6] ${canDrive ? 'bg-[#2f5cd6]' : 'bg-gray-300'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${!canDrive ? '-translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-[#1f2937] p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <span className="text-[#0a3461] dark:text-white font-bold text-lg">{t('isAccident')}</span>
                    <button 
                        onClick={() => setIsAccident(!isAccident)} 
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${isAccident ? 'bg-red-500' : 'bg-gray-300'}`}
                    >
                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isAccident ? '-translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </div>

                {isAccident && (
                    <div className="w-full animate-fadeIn">
                        <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg mb-2 block text-right">{t('accidentReport')}</label>
                        <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-[#1f2937] relative overflow-hidden group hover:border-[#2f5cd6] transition-colors">
                            <input type="file" onChange={(e) => handleProblemPhotoSelect(e, 'accident')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            {accidentPhoto ? (
                                <img src={accidentPhoto} alt="Report" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400 group-hover:text-[#2f5cd6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-gray-400 group-hover:text-[#2f5cd6] font-bold mt-1 block">{t('uploadPhoto')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="w-full">
                    <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold text-lg mb-2 block text-right">{t('carPhotoOptional')}</label>
                    <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-[#1f2937] relative overflow-hidden group hover:border-[#2f5cd6] transition-colors">
                        <input type="file" onChange={(e) => handleProblemPhotoSelect(e, 'car')} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                        {carPhoto ? (
                            <img src={carPhoto} alt="Car" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400 group-hover:text-[#2f5cd6]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-gray-400 group-hover:text-[#2f5cd6] font-bold mt-1 block">{t('uploadPhoto')}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-auto">
                     <Button variant="primary" onClick={() => setCurrentView('workshop_selection')}>{t('next')}</Button>
                     <div className="mt-4 text-center"><span onClick={() => setCurrentView('create_request')} className="text-gray-400 cursor-pointer hover:text-[#2f5cd6] dark:hover:text-[#4c7bf4] transition-colors">{t('back')}</span></div>
                </div>
            </div>
          );

      case 'workshop_selection':
        return (
            <div className="flex flex-col gap-6 w-full animate-slideUp pb-24 h-full relative px-8 pt-6">
                 <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-2 text-center">{t('workshopsTitle')}</h2>
                 <input 
                    type="text" 
                    value={workshopSearchTerm} 
                    onChange={(e) => setWorkshopSearchTerm(e.target.value)} 
                    placeholder={t('searchWorkshop')}
                    className="w-full p-4 rounded-2xl border-2 border-[#2f5cd6]/30 dark:border-[#4c7bf4]/30 focus:border-[#2f5cd6] dark:focus:border-[#4c7bf4] outline-none text-right bg-white dark:bg-[#1f2937] text-[#2f5cd6] dark:text-[#4c7bf4]"
                 />
                 
                 <div className="flex-1 overflow-y-auto pr-1">
                     <div className="flex flex-col gap-4">
                         {/* Option for just flatbed (no workshop) - Only show if CANNOT drive */}
                         {!canDrive && (
                             <div onClick={() => { setSelectedWorkshop(null); setCurrentView('map_selection'); }} className="bg-gradient-to-r from-orange-400 to-red-500 p-1 rounded-3xl shadow-lg cursor-pointer transform hover:scale-[1.02] transition-all">
                                 <div className="bg-white dark:bg-[#1f2937] rounded-[22px] p-4 flex items-center gap-4 h-full">
                                     <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl">🚚</div>
                                     <div className="flex-1 text-right">
                                         <h3 className="font-bold text-[#0a3461] dark:text-white text-lg">{t('flatbedOtherDest')}</h3>
                                         <p className="text-xs text-gray-400">{t('destCustom')}</p>
                                     </div>
                                 </div>
                             </div>
                         )}

                         {getFilteredWorkshops().length > 0 ? getFilteredWorkshops().map(ws => (
                             <div key={ws.id} onClick={() => handleWorkshopSelect(ws)} className="bg-white dark:bg-[#1f2937] p-4 rounded-3xl shadow-lg border border-gray-50 dark:border-gray-700 cursor-pointer hover:border-[#2f5cd6] transition-all flex items-center gap-4">
                                 <img src={ws.image} alt="ws" className="w-20 h-20 rounded-2xl object-cover" />
                                 <div className="flex-1 text-right">
                                     <div className="flex justify-between items-start">
                                         <span className="bg-yellow-100 text-yellow-600 text-[10px] font-bold px-2 py-1 rounded-full">★ {ws.rating}</span>
                                         <h3 className="font-bold text-[#0a3461] dark:text-white">{lang === 'ar' ? ws.nameAr : ws.nameEn}</h3>
                                     </div>
                                     <p className="text-xs text-gray-400 mt-1">{lang === 'ar' ? ws.locationAr : ws.locationEn}</p>
                                     <p className="text-xs text-[#2f5cd6] font-bold mt-2">{ws.distance} {t('workshopDistance')}</p>
                                 </div>
                             </div>
                         )) : (
                             <div className="text-center py-10 text-gray-400"><p>No workshops found</p></div>
                         )}
                     </div>
                 </div>

                 <div className="absolute bottom-0 w-full pb-4 bg-gray-50 dark:bg-[#111827]">
                     <span onClick={() => setCurrentView('create_request')} className="block text-center text-gray-400 cursor-pointer hover:text-[#2f5cd6] dark:hover:text-[#4c7bf4] transition-colors">{t('back')}</span>
                 </div>
            </div>
        );

      case 'map_selection':
          return (
             <div className="flex flex-col h-full w-full relative animate-fadeIn flex-1">
                 <h2 className="absolute top-6 left-0 right-0 text-center text-2xl font-bold text-[#0a3461] dark:text-white z-10 drop-shadow-md">{t('mapTitle')}</h2>
                 <div className="flex-1 w-full relative z-0 h-full rounded-3xl overflow-hidden shadow-inner border-4 border-white dark:border-[#1f2937]" ref={mapContainerRef}></div>
                 
                 <div className="absolute bottom-8 left-6 right-6 z-10 flex flex-col gap-4">
                     {mapDestination && (
                         <div className="bg-white dark:bg-[#1f2937] p-4 rounded-2xl shadow-lg animate-slideUp">
                             <div className="flex justify-between items-center">
                                 <span className="font-bold text-[#2f5cd6] dark:text-[#4c7bf4]">{mapDistance} {t('km')}</span>
                                 <span className="text-gray-500 text-sm">{t('distance')}</span>
                             </div>
                         </div>
                     )}
                     <Button variant="primary" onClick={() => setCurrentView('page_w')}>
                         {mapDestination ? t('confirmLocation') : t('pickLocation')}
                     </Button>
                     <Button variant="secondary" onClick={() => setCurrentView('workshop_selection')}>{t('back')}</Button>
                 </div>
             </div>
          );
      
      case 'workshop_location_select':
          return (
             <div className="flex flex-col h-full w-full relative animate-fadeIn flex-1">
                 <h2 className="absolute top-6 left-0 right-0 text-center text-2xl font-bold text-[#0a3461] dark:text-white z-[50] drop-shadow-md bg-white/80 dark:bg-black/50 py-2 rounded-xl mx-4 backdrop-blur-sm">{t('pickLocation')}</h2>
                 <div className="flex-1 w-full relative z-0 h-full rounded-3xl overflow-hidden shadow-inner border-4 border-white dark:border-[#1f2937]" ref={mapContainerRef}></div>
                 <div className="absolute bottom-8 left-6 right-6 z-[50] flex flex-col gap-4">
                     <Button variant="primary" onClick={() => setCurrentView('signup_form')}>
                         {t('confirmLocation')}
                     </Button>
                 </div>
             </div>
          );

      case 'garage':
        return (
            <div className="flex flex-col gap-6 w-full animate-slideUp pb-10 h-full relative px-8 pt-6">
                 <h2 className="text-3xl font-bold text-[#0a3461] dark:text-white mb-4 text-center">{t('myGarage')}</h2>
                 
                 <div className="flex-1 overflow-y-auto pr-1">
                     <div className="grid grid-cols-1 gap-4">
                         <div onClick={() => { setNewCarData({name:'', year:'', color:'', plate:'', photo:''}); setEditingCarId(null); setShowAddCarForm(true); }} className="border-2 border-dashed border-[#2f5cd6] dark:border-[#4c7bf4] rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors min-h-[160px]">
                             <div className="w-12 h-12 bg-[#2f5cd6] dark:bg-[#4c7bf4] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2">+</div>
                             <span className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold">{t('addCar')}</span>
                         </div>

                         {currentUser?.garage.map(car => (
                             <div key={car.id} className="bg-white dark:bg-[#1f2937] p-6 rounded-3xl shadow-lg border border-gray-50 dark:border-gray-700 relative group overflow-hidden">
                                 <div className="absolute top-0 right-0 w-24 h-24 bg-[#2f5cd6]/5 rounded-full -mr-8 -mt-8"></div>
                                 <div className="relative z-10 flex justify-between items-start gap-4">
                                     <div className="flex items-start gap-3">
                                         {car.photo ? (
                                             <img src={car.photo} alt={car.nameEn} className="w-20 h-20 rounded-xl object-cover shadow-sm" />
                                         ) : (
                                             <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-2xl">🚗</div>
                                         )}
                                         <div>
                                             <h3 className="text-xl font-bold text-[#0a3461] dark:text-white">{lang === 'ar' ? car.nameAr : car.nameEn}</h3>
                                             <p className="text-gray-400 text-sm">{car.year} • {car.color}</p>
                                             <div className="mt-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg inline-block border-2 border-gray-200 dark:border-gray-600">
                                                 <span className="font-mono font-bold text-gray-700 dark:text-gray-300 tracking-widest">{car.plate}</span>
                                             </div>
                                         </div>
                                     </div>
                                     <div className="flex flex-col gap-2">
                                         <button onClick={() => handleEditCar(car)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                         </button>
                                         <button onClick={() => handleDeleteCar(car.id)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                         </button>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>

                 <div className="mt-auto text-center pt-4">
                     <span onClick={() => setCurrentView('dashboard_user')} className="text-gray-400 cursor-pointer hover:text-[#2f5cd6] dark:hover:text-[#4c7bf4] transition-colors">{t('back')}</span>
                 </div>
            </div>
        );

      default:
        return <div>Unknown View</div>;
    }
  };

  return (
     <div className="h-[100dvh] w-full bg-white dark:bg-[#111827] overflow-hidden relative flex flex-col font-['Cairo']" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {renderContent()}
        
        {/* Modals */}
        <Notification
            message={notification.message}
            type={notification.type}
            isVisible={notification.show}
            onClose={() => setNotification(prev => ({ ...prev, show: false }))}
        />
        
        <PopupNotification
            title={popupNotification.title}
            message={popupNotification.message}
            isVisible={popupNotification.show}
            onClose={closePopup}
            onClick={popupNotification.onClick}
        />

        {/* Confirmation Modal */}
        {showConfirmation.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn p-4">
                <div className="bg-white dark:bg-[#1f2937] rounded-3xl p-6 shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700 transform transition-all scale-100">
                    <h3 className="text-xl font-bold text-[#0a3461] dark:text-white mb-2">{t('areYouSure')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        {showConfirmation.type === 'delete' ? t('confirmDeleteCar') : showConfirmation.type === 'edit' ? t('confirmEditCar') : t('confirmArrivalMsg')}
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowConfirmation({...showConfirmation, isOpen: false})} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">{t('no')}</button>
                        <button 
                            onClick={() => {
                                if (showConfirmation.type === 'delete') confirmDeleteCar();
                                else if (showConfirmation.type === 'edit') saveCarToGarage();
                                else if (showConfirmation.type === 'arrival') handleArrivalConfirm();
                            }} 
                            className="flex-1 py-3 rounded-xl bg-[#2f5cd6] text-white font-bold hover:bg-[#193685] transition-colors shadow-lg"
                        >
                            {t('yes')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Add Car Modal */}
        {showAddCarForm && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={() => setShowAddCarForm(false)}></div>
                <div className="bg-white dark:bg-[#1f2937] w-full sm:w-auto sm:min-w-[400px] sm:rounded-3xl rounded-t-3xl p-6 z-10 pointer-events-auto animate-slideUp max-h-[90vh] overflow-y-auto">
                    <h3 className="text-2xl font-bold text-[#0a3461] dark:text-white mb-6 text-center">{editingCarId ? t('editCar') : t('addCar')}</h3>
                    
                    <div className="flex flex-col gap-4">
                         {/* Form Inputs for Car */}
                         <div>
                             <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold mb-1 block text-right">{t('carType')}</label>
                             <input
                                 type="text"
                                 value={newCarData.name}
                                 onChange={(e) => { setNewCarData({...newCarData, name: e.target.value}); setAddCarSearchTerm(e.target.value); }}
                                 className="w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-right outline-none focus:border-[#2f5cd6] text-gray-900 dark:text-white"
                                 placeholder={t('searchPlaceholder')}
                             />
                             {newCarData.name && addCarSearchTerm && !ALL_CAR_MODELS.some(c => c.en === newCarData.name) && (
                                 <div className="max-h-40 overflow-y-auto mt-2 bg-white dark:bg-[#1f2937] border rounded-xl shadow-lg">
                                     {getFilteredAddCars().map((car, idx) => (
                                         <div key={idx} onClick={() => { setNewCarData({...newCarData, name: car.en}); setAddCarSearchTerm(''); }} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-right border-b last:border-0 dark:border-gray-700 text-gray-900 dark:text-white">
                                             {lang === 'ar' ? car.ar : car.en}
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>

                         <div className="relative" ref={yearDropdownRef}>
                             <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold mb-1 block text-right">{t('orderDate')}</label>
                             <div 
                                 onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                                 className="w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-right outline-none flex justify-between items-center cursor-pointer text-gray-900 dark:text-white"
                             >
                                 <span>{newCarData.year || t('selectYearPlaceholder')}</span>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                     <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                 </svg>
                             </div>
                             {isYearDropdownOpen && (
                                 <div className="absolute z-20 w-full mt-2 bg-white dark:bg-[#1f2937] border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                     {CAR_YEARS.map(year => (
                                         <div 
                                             key={year} 
                                             onClick={() => { setNewCarData({...newCarData, year: year.toString()}); setIsYearDropdownOpen(false); }}
                                             className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-center border-b last:border-0 dark:border-gray-700 text-gray-900 dark:text-white"
                                         >
                                             {year}
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                         
                         <div>
                             <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold mb-1 block text-right">{t('carColor')}</label>
                             <div className="flex flex-wrap gap-2 justify-end">
                                 {['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Brown', 'Green', 'Beige'].map(color => (
                                     <div 
                                        key={color} 
                                        onClick={() => setNewCarData({...newCarData, color})}
                                        className={`w-8 h-8 rounded-full cursor-pointer border-2 ${newCarData.color === color ? 'border-[#2f5cd6] scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color.toLowerCase() }}
                                        title={color}
                                     />
                                 ))}
                             </div>
                         </div>

                         <div>
                             <label className="text-[#2f5cd6] dark:text-[#4c7bf4] font-bold mb-1 block text-right">{t('plateNumber')}</label>
                             <input
                                 type="text"
                                 value={newCarData.plate}
                                 onChange={(e) => setNewCarData({...newCarData, plate: e.target.value})}
                                 className="w-full p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-center font-mono tracking-widest outline-none focus:border-[#2f5cd6] text-gray-900 dark:text-white"
                                 placeholder="ABC 1234"
                             />
                             <span className="text-xs text-gray-400 mt-1 block text-right">{t('plateHint')}</span>
                         </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                         <Button variant="primary" onClick={handleAddCar}>{editingCarId ? t('updateCar') : t('saveCar')}</Button>
                         <Button variant="secondary" onClick={() => setShowAddCarForm(false)}>{t('cancel')}</Button>
                    </div>
                </div>
            </div>
        )}
     </div>
   );
};

export default App;