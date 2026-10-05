import React, { useEffect, useMemo, useState } from 'react';
import { Home, ClipboardList, KeyRound, UserRound, CalendarDays, MapPin, Search, ArrowRight, ArrowLeft } from 'lucide-react';
import api from './api';
import ConciergeChat from './components/ConciergeChat';
import BookingFlow from './components/BookingFlow';
import OrdersTab from './components/OrdersTab';
import CheckInTab from './components/CheckInTab';
import AccountTab from './components/AccountTab';
import TourSection from './components/TourSection';
import CarSection from './components/CarSection';

const AUTH_STORAGE_KEY = 'luxstay_customer_token';
const USER_STORAGE_KEY = 'luxstay_customer_user';

const getDateInputValue = (offsetDays = 0, fromDate = new Date()) => {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + offsetDays);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const FALLBACK_DESTINATIONS = [
  { id: 1, name: 'Phú Quốc', slug: 'phu-quoc', locations: [
    { id: 1, name: 'Bãi Dài', slug: 'bai-dai' },
    { id: 2, name: 'Dương Đông', slug: 'duong-dong' },
    { id: 3, name: 'Ông Lang', slug: 'ong-lang' },
    { id: 4, name: 'Gành Dầu', slug: 'ganh-dau' },
    { id: 5, name: 'An Thới', slug: 'an-thoi' },
  ] },
  { id: 2, name: 'Nha Trang', slug: 'nha-trang', locations: [
    { id: 6, name: 'Trung tâm Nha Trang', slug: 'trung-tam-nha-trang' },
    { id: 7, name: 'Bãi biển Trần Phú', slug: 'tran-phu' },
    { id: 8, name: 'Hòn Tre', slug: 'hon-tre' },
    { id: 9, name: 'Vĩnh Hải', slug: 'vinh-hai' },
  ] },
  { id: 3, name: 'Đà Nẵng', slug: 'da-nang', locations: [
    { id: 10, name: 'Mỹ Khê', slug: 'my-khe' },
    { id: 11, name: 'An Thượng', slug: 'an-thuong' },
    { id: 12, name: 'Sơn Trà', slug: 'son-tra' },
    { id: 13, name: 'Bà Nà Hills', slug: 'ba-na-hills' },
  ] },
  { id: 4, name: 'Hà Nội', slug: 'ha-noi', locations: [
    { id: 14, name: 'Hoàn Kiếm', slug: 'hoan-kiem' },
    { id: 15, name: 'Ba Đình', slug: 'ba-dinh' },
    { id: 16, name: 'Tây Hồ', slug: 'tay-ho' },
    { id: 17, name: 'Cầu Giấy', slug: 'cau-giay' },
  ] },
  { id: 5, name: 'TP.HCM', slug: 'ho-chi-minh', locations: [
    { id: 18, name: 'Quận 1', slug: 'quan-1' },
    { id: 19, name: 'Thảo Điền', slug: 'thao-dien' },
    { id: 20, name: 'Phú Nhuận', slug: 'phu-nhuan' },
    { id: 21, name: 'Quận 7', slug: 'quan-7' },
  ] },
];

const normalizePlace = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .trim()
  .toLocaleLowerCase('vi');

const mapAvailableRoom = (room) => {
  const roomType = room.roomType || {};
  let amenities = [];
  try {
    amenities = Array.isArray(roomType.amenities)
      ? roomType.amenities
      : JSON.parse(roomType.amenities || '[]');
  } catch {
    amenities = [];
  }

  return {
    id: room.id,
    hotel_branch_id: room.hotel_branch_id,
    name: `${roomType.name || 'Phòng'} ${room.room_number}`,
    category: roomType.name || 'Standard',
    price: Number(roomType.base_price || room.price || 0),
    image: room.image_url || roomType.image_url || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1000&q=85',
    amenities: amenities.length ? amenities.slice(0, 4) : ['Wi-Fi', 'View', 'Air Conditioning'],
    rating: 4.8,
    roomNumber: room.room_number,
    floor: room.floor,
  };
};

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [authMode, setAuthMode] = useState('login');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authForm, setAuthForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('explore');
  const [checkInSubTab, setCheckInSubTab] = useState('online');
  const [checkInTargetId, setCheckInTargetId] = useState(null);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [homeNotice, setHomeNotice] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [hotelDestination, setHotelDestination] = useState('');
  const [selectedDestinationCity, setSelectedDestinationCity] = useState('');
  const [selectedDestinationCitySlug, setSelectedDestinationCitySlug] = useState('');
  const [selectedDestinationLocationSlug, setSelectedDestinationLocationSlug] = useState('');
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [destinationPickerOpen, setDestinationPickerOpen] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [destinationGroups, setDestinationGroups] = useState(FALLBACK_DESTINATIONS);
  const [hotelDirectory, setHotelDirectory] = useState([]);
  const [hotelResults, setHotelResults] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelSearchError, setHotelSearchError] = useState('');
  const [hotelFilterOpen, setHotelFilterOpen] = useState(false);
  const [minimumStars, setMinimumStars] = useState(0);
  const [maximumPrice, setMaximumPrice] = useState(10000000);
  const [mapOpen, setMapOpen] = useState(false);
  const [hotelGuestCounts, setHotelGuestCounts] = useState({ rooms: 1, adults: 2, children: 0, infants: 0 });
  const [guestExpanded, setGuestExpanded] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState('');

  const [bookingForm, setBookingForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    checkIn: getDateInputValue(1),
    checkOut: getDateInputValue(3),
    guests: 2
  });

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' đ';

  const refreshBranchOptions = async () => {
    try {
      const { data } = await api.get('/hotels/branches');
      const list = data?.data || [];
      setBranches(list);
      const hotels = [...new Map(list.filter((branch) => branch.hotel?.id)
        .map((branch) => [String(branch.hotel.id), branch.hotel])).values()];
      setHotelDirectory(hotels);
    } catch (error) {
      console.error('Failed to load branches', error);
    }
  };

  const loadAvailableRooms = async (branchId = selectedBranchId, checkIn = bookingForm.checkIn, checkOut = bookingForm.checkOut, guests = bookingForm.guests) => {
    if (!checkIn || !checkOut) return;

    setRoomsLoading(true);
    setRoomsError('');

    try {
      const params = {
        checkin_date: checkIn,
        checkout_date: checkOut,
        num_guests: guests,
      };

      if (branchId) params.hotel_branch_id = branchId;

      const { data } = await api.get('/rooms/available', { params });
      const rooms = (data?.data || []).map(mapAvailableRoom);

      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Failed to load rooms', error);
      setAvailableRooms([]);
      setRoomsError(error.response?.data?.message || 'Không thể tải danh sách phòng cho ngày đã chọn.');
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchAvailableRoomsForBranch = async (branchId) => {
    const params = {
      checkin_date: bookingForm.checkIn,
      checkout_date: bookingForm.checkOut,
      num_guests: Math.max(1, hotelGuestCounts.adults + hotelGuestCounts.children),
      hotel_branch_id: branchId,
    };
    const { data } = await api.get('/rooms/available', { params });
    return (data?.data || []).map(mapAvailableRoom);
  };

  const persistAuth = (token, userData) => {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const ensureCustomerProfile = async (userData) => {
    try {
      const { data } = await api.get('/auth/me');
      const profile = data?.data?.customerProfile;

      if (profile?.id) {
        const mergedUser = { ...userData, customerId: profile.id };
        persistAuth(localStorage.getItem(AUTH_STORAGE_KEY) || '', mergedUser);
        return profile.id;
      }

      const payload = {
        full_name: userData.full_name || userData.name || userData.email,
        email: userData.email,
        phone: userData.phone || '',
        address: '',
        id_type: 'CCCD',
        id_number: `TMP-${Date.now()}`,
        nationality: 'Vietnamese',
      };

      const createRes = await api.post('/customers', payload);
      const createdCustomerId = createRes?.data?.data?.id;
      if (!createdCustomerId) return null;

      const mergedUser = { ...userData, customerId: createdCustomerId };
      persistAuth(localStorage.getItem(AUTH_STORAGE_KEY) || '', mergedUser);
      return createdCustomerId;
    } catch (error) {
      console.error('Unable to ensure customer profile', error);
      return null;
    }
  };

  const clearAuth = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setAuthMode('login');
    setAuthForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setAuthError('');
  };

  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return;

    api.get('/auth/me')
      .then(({ data }) => {
        const me = data?.data ?? data?.user ?? null;
        if (me) {
          const normalizedUser = {
            id: me.id,
            full_name: me.full_name || me.name,
            email: me.email,
            phone: me.phone,
            role: me.role,
            customerId: me.customerProfile?.id || null,
          };
          persistAuth(token, normalizedUser);
        }
      })
      .catch(() => {
        clearAuth();
      });
  }, []);

  useEffect(() => {
    if (activeTab === 'hotel') {
      refreshBranchOptions();
      api.get('/hotels/cities')
        .then(({ data }) => {
          const cities = data?.data || [];
          setDestinationGroups(cities.length ? cities : FALLBACK_DESTINATIONS);
        })
        .catch((error) => {
          console.error('Failed to load destinations', error);
          setDestinationGroups(FALLBACK_DESTINATIONS);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'hotel-results') return;
    let isCurrentSearch = true;

    const searchHotels = async () => {
      setHotelsLoading(true);
      setHotelSearchError('');
      setHotelResults([]);

      try {
        const params = {
          city: selectedDestinationCitySlug || undefined,
          location: selectedDestinationLocationSlug || undefined,
          checkIn: bookingForm.checkIn,
          checkOut: bookingForm.checkOut,
          guests: Math.max(1, hotelGuestCounts.adults + hotelGuestCounts.children),
          hotelId: selectedHotelId || undefined,
        };
        const { data } = await api.get('/hotels/search', { params });
        let hotels = data?.data || [];
        if (selectedHotelId) hotels = hotels.filter((hotel) => String(hotel.id) === selectedHotelId);
        hotels = hotels.filter((hotel) => !hotel.status || hotel.status === 'Active');

        const results = await Promise.all(hotels.map(async (hotel) => {
          const hotelBranches = (hotel.branches || branches.filter((branch) => String(branch.hotel_id) === String(hotel.id)))
            .filter((branch) => !selectedDestinationCity || normalizePlace(branch.city) === normalizePlace(selectedDestinationCity));
          const branchResults = await Promise.all(hotelBranches.map(async (branch) => {
            try {
              return { branch, rooms: await fetchAvailableRoomsForBranch(branch.id) };
            } catch {
              return { branch, rooms: [] };
            }
          }));
          const rooms = branchResults.flatMap(({ branch, rooms: branchRooms }) => branchRooms.map((room) => ({
            ...room,
            hotel_branch_id: room.hotel_branch_id || branch.id,
          })));
          const prices = rooms.map((room) => room.price).filter((price) => price > 0);
          const firstBranch = hotelBranches[0];

          return {
            ...hotel,
            branches: hotelBranches,
            rooms,
            startingPrice: prices.length ? Math.min(...prices) : 0,
            heroImage: hotel.image_url || rooms[0]?.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85',
            displayAddress: hotel.address || firstBranch?.address || hotel.city,
            rating: Number(hotel.average_rating || hotel.star_rating || 0),
            reviewCount: Number(hotel.review_count || hotel.rating_count || 0),
            latitude: firstBranch?.latitude,
            longitude: firstBranch?.longitude,
          };
        }));

        if (isCurrentSearch) setHotelResults(results);
      } catch (error) {
        if (isCurrentSearch) {
          setHotelResults([]);
          setHotelSearchError(error.response?.data?.message || 'Không thể tải danh sách khách sạn lúc này.');
        }
      } finally {
        if (isCurrentSearch) setHotelsLoading(false);
      }
    };

    searchHotels();
    return () => { isCurrentSearch = false; };
  }, [activeTab, selectedDestinationCity, selectedDestinationCitySlug, selectedDestinationLocationSlug, selectedHotelId, bookingForm.checkIn, bookingForm.checkOut, hotelGuestCounts.adults, hotelGuestCounts.children]);

  useEffect(() => {
    if (!user) return;

    setBookingForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.full_name || '',
      phone: prev.phone || user.phone || '',
      email: prev.email || user.email || '',
    }));
  }, [user]);

  useEffect(() => {
    if (!homeNotice) return undefined;
    const timeout = window.setTimeout(() => setHomeNotice(''), 3200);
    return () => window.clearTimeout(timeout);
  }, [homeNotice]);

  const [myBookings, setMyBookings] = useState([]);
  const [tripItems, setTripItems] = useState([]);

  const handleAddTripItem = (item, mode = 'add') => {
    setTripItems((prev) => [...prev, item]);
    const itemLabel = item.type === 'tour' ? 'Tour du lịch' : item.type === 'car' ? 'Thuê xe' : 'Dịch vụ';
    setHomeNotice(mode === 'checkout'
      ? `${itemLabel} đã được thêm vào chuyến đi và sẵn sàng thanh toán.`
      : `${itemLabel} đã được thêm vào chuyến đi.`);
    if (mode === 'checkout') {
      setActiveTab('orders');
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');

    if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
      setAuthError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setAuthLoading(true);

    try {
      const payload = authMode === 'register'
        ? {
            full_name: authForm.full_name.trim(),
            email: authForm.email.trim(),
            phone: authForm.phone.trim(),
            password: authForm.password,
          }
        : {
            email: authForm.email.trim(),
            password: authForm.password,
          };

      const { data } = await api.post(`/auth/${authMode === 'register' ? 'register' : 'login'}`, payload);
      const responseData = data?.data ?? data ?? {};
      const token = responseData.token;
      const authUser = responseData.user ?? {
        id: responseData.id,
        full_name: responseData.full_name,
        email: responseData.email,
        phone: responseData.phone,
        role: responseData.role,
      };

      if (!token || !authUser) {
        throw new Error('Phản hồi xác thực không hợp lệ.');
      }

      persistAuth(token, authUser);
      setAuthModalOpen(false);
      setAuthForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      setAuthError(error.response?.data?.message || error.message || 'Đăng nhập không thành công.');
    } finally {
      setAuthLoading(false);
    }
  };

  const categoryGridItems = [
    { id: 'hotel', label: 'Khách sạn', icon: '🏨', tone: 'violet' },
    { id: 'tour', label: 'Tour du lịch', icon: '🗺️', tone: 'blue' },
    { id: 'car', label: 'Thuê xe', icon: '🚗', tone: 'green' },
    { id: 'services', label: 'Dịch vụ khác', icon: '🎁', tone: 'orange' },
  ];

  const scrollToRooms = () => {
    if (activeTab !== 'hotel') {
      setActiveTab('hotel');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById('hotel-search')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCategoryClick = (categoryId) => {
    if (categoryId === 'hotel') {
      setActiveTab('hotel');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (categoryId === 'tour') {
      setActiveTab('tour');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (categoryId === 'car') {
      setActiveTab('car');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (categoryId === 'services') {
      setConciergeOpen(true);
      return;
    }

    setHomeNotice('Dịch vụ này đang được chuẩn bị.');
  };

  const openDestinationPicker = () => {
    setDestinationSearch('');
    setDestinationPickerOpen(true);
  };

  const selectDestination = ({ label, city, citySlug, locationSlug, hotelId }) => {
    const normalizedCity = normalizePlace(city);
    const matchedHotel = hotelId
      ? hotelDirectory.find((hotel) => String(hotel.id) === String(hotelId))
      : null;
    const destinationCity = matchedHotel?.city || city;
    const matchedCity = destinationGroups.find((item) => String(item.id) === String(matchedHotel?.city_id)
      || normalizePlace(item.name) === normalizePlace(destinationCity));
    const matchedBranch = branches.find((branch) => matchedHotel
      ? String(branch.hotel_id) === String(matchedHotel.id)
      : normalizePlace(branch.city) === normalizedCity);

    setHotelDestination(label);
    setSelectedDestinationCity(matchedHotel?.city || matchedBranch?.city || city);
    setSelectedDestinationCitySlug(matchedCity?.slug || citySlug || '');
    setSelectedDestinationLocationSlug(matchedHotel ? '' : (locationSlug || ''));
    setSelectedHotelId(matchedHotel ? String(matchedHotel.id) : '');
    setSelectedBranchId(matchedBranch ? String(matchedBranch.id) : '');
    setDestinationSearch('');
    setDestinationPickerOpen(false);
  };

  const normalizedDestinationSearch = normalizePlace(destinationSearch);
  const filteredDestinationGroups = destinationGroups.map((destination) => ({
    ...destination,
    locations: (destination.locations || []).filter((area) => !normalizedDestinationSearch
      || normalizePlace(area.name).includes(normalizedDestinationSearch)
      || normalizePlace(destination.name).includes(normalizedDestinationSearch)),
  })).filter((destination) => !normalizedDestinationSearch
    || normalizePlace(destination.name).includes(normalizedDestinationSearch)
    || destination.locations.length > 0);

  const matchingHotels = normalizedDestinationSearch
    ? hotelDirectory.filter((hotel) => [hotel.name, hotel.city, hotel.address]
      .some((value) => normalizePlace(value).includes(normalizedDestinationSearch)))
    : [];

  const updateGuestCount = (key, delta) => {
    const next = {
      ...hotelGuestCounts,
      [key]: Math.max(key === 'rooms' ? 1 : 0, Math.min(10, hotelGuestCounts[key] + delta)),
    };
    setHotelGuestCounts(next);
    setBookingForm((form) => ({ ...form, guests: Math.max(1, next.adults + next.children) }));
  };

  const handleHotelSearch = (event) => {
    event.preventDefault();
    if (!selectedDestinationCity) {
      setHotelSearchError('Hãy chọn một điểm đến trước khi tìm khách sạn.');
      setDestinationPickerOpen(true);
      return;
    }
    if (bookingForm.checkOut <= bookingForm.checkIn) {
      setRoomsError('Ngày trả phòng phải sau ngày nhận phòng.');
      return;
    }
    setRoomsError('');
    setHotelSearchError('');
    setAvailableRooms([]);
    setSelectedHotel(null);
    setActiveTab('hotel-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredHotelResults = hotelResults.filter((hotel) => {
    const matchesStars = !minimumStars || Number(hotel.star_rating || 0) >= minimumStars;
    const matchesPrice = !hotel.startingPrice || hotel.startingPrice <= maximumPrice;
    return matchesStars && matchesPrice;
  });

  const openHotelDetail = (hotel) => {
    setSelectedHotel(hotel);
    setAvailableRooms(hotel.rooms || []);
    setSelectedBranchId(String(hotel.branches?.[0]?.id || ''));
    setActiveTab('hotel-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatStayDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return {
      day: date.toLocaleDateString('vi-VN', { day: '2-digit' }),
      month: date.toLocaleDateString('vi-VN', { month: 'long' }),
      monthYear: date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
    };
  };

  const conciergeBookingContext = useMemo(() => {
    const active =
      myBookings.find((b) => /active|đã nhận/i.test(b.status)) || myBookings[0];
    const guestName = bookingForm.fullName?.trim();
    if (!active && !guestName) return null;
    const roomLabel = active?.roomName || '';
    return {
      ...(guestName ? { guestName } : {}),
      ...(active
        ? {
            roomNumber: String(active.roomNumber).replace(/[^\dA-Za-z]/g, '') || active.roomNumber,
            roomType: active.roomName,
            checkinDate: active.checkIn,
            checkoutDate: active.checkOut,
            includesBreakfast: /deluxe|executive|presidential|suite|family/i.test(roomLabel),
          }
        : {}),
    };
  }, [myBookings, bookingForm.fullName]);

  const handleConciergeAction = (action) => {
    switch (action.action) {
      case 'VIEW_RESTAURANT_MENU':
      case 'ORDER_ROOM_SERVICE':
      case 'BOOK_SPA':
        alert('Quý khách vui lòng liên hệ trực tiếp quầy lễ tân để được phục vụ tốt nhất.');
        break;
      case 'VIEW_INVOICE':
        setActiveTab('orders');
        break;
      case 'BOOK_TRANSPORT':
        alert('Quý khách vui lòng liên hệ quầy lễ tân (1800-588-879) để đặt xe đón/tiễn sân bay.');
        break;
      default:
        break;
    }
  };

  const activeNavTab = ['explore', 'hotel', 'hotel-results', 'hotel-detail', 'tour', 'car'].includes(activeTab) ? 'home'
    : activeTab === 'orders' ? 'orders'
    : activeTab === 'checkin' ? 'checkin'
    : activeTab === 'account' ? 'account'
    : 'home';
  const isHotelFlow = ['hotel', 'hotel-results', 'hotel-detail'].includes(activeTab);

  const selectNavTab = (tab) => {
    const destinations = { home: 'explore', orders: 'orders', checkin: 'checkin', account: 'account' };
    setActiveTab(destinations[tab] || 'explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`pwa-container ${isHotelFlow ? 'hotel-flow-active' : ''}`}>
      {!isHotelFlow && <header className={`pwa-header ${activeTab === 'explore' ? 'pwa-header-home' : ''}`}>
        <div className="brand-logo">
          <span className="crown-icon">👋</span>
          <div className="brand-copy">
            <span className="brand-name">LuxHome</span>
            <h1>{activeTab === 'explore' ? `Xin chào, ${user?.full_name?.split(' ')[0] || 'bạn'}` : 'Kỳ nghỉ của bạn'}</h1>
          </div>
        </div>

        {user ? (
          <div className="header-user-wrap">
            <span className="header-user-name">{user.full_name || 'Khách hàng'}</span>
            <button type="button" className="header-logout-btn" onClick={clearAuth}>Đăng xuất</button>
          </div>
        ) : (
          <button type="button" className="header-guest-login-btn" onClick={() => { setAuthMode('login'); setAuthModalOpen(true); setAuthError(''); }}>
            Đăng nhập
          </button>
        )}

  </header>}

      {/* TAB 1: EXPLORE / SEARCH ROOMS */}
      {activeTab === 'explore' && (
        <main className="explore-main">
          <div className="quick-category-wrap">
            <div className="quick-categories">
              {categoryGridItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="quick-category"
                  onClick={() => handleCategoryClick(item.id)}
                >
                  <span className={`quick-category-icon tone-${item.tone}`} aria-hidden="true">{item.icon}</span>
                  <span className="quick-category-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {homeNotice && <div className="home-notice" role="status">{homeNotice}</div>}

          <section className="explore-section">
            <div className="explore-section-heading">
              <h2>Ưu đãi &amp; khuyến mãi</h2>
              <span className="section-sparkle" aria-hidden="true">✦</span>
            </div>
            <div className="promo-list">
              <article className="promo-card promo-card-primary">
                <span className="promo-tag">LUXHOME EXCLUSIVE</span>
                <h3>Giảm đến 20%</h3>
                <p>Ưu đãi đặc biệt khi đặt phòng trực tiếp trên LuxHome.</p>
                <button type="button" onClick={scrollToRooms}>Khám phá ngay <ArrowRight size={14} /></button>
              </article>
              <article className="promo-card promo-card-weekend">
                <span className="promo-tag">KỲ NGHỈ CUỐI TUẦN</span>
                <h3>Đổi gió cuối tuần</h3>
                <p>Chọn nơi nghỉ phù hợp cho chuyến đi sắp tới.</p>
                <button type="button" onClick={scrollToRooms}>Tìm phòng <ArrowRight size={14} /></button>
              </article>
            </div>
          </section>

        </main>
      )}

      {activeTab === 'tour' && (
        <main className="travel-page-shell">
          <TourSection
            onAddToCart={(item) => handleAddTripItem(item, 'add')}
            onDirectCheckout={(item) => handleAddTripItem(item, 'checkout')}
          />
        </main>
      )}

      {activeTab === 'car' && (
        <main className="travel-page-shell">
          <CarSection
            onAddToCart={(item) => handleAddTripItem(item, 'add')}
            onDirectCheckout={(item) => handleAddTripItem(item, 'checkout')}
          />
        </main>
      )}

      {activeTab === 'hotel' && (
        <main className="hotel-search-screen">
          <form className="hotel-search-form" onSubmit={handleHotelSearch}>
            <header className="hotel-search-header">
              <button type="button" className="hotel-search-back" onClick={() => setActiveTab('explore')} aria-label="Quay lại trang chủ">
                <ArrowLeft size={21} />
              </button>
              <h1>Tìm khách sạn</h1>
              <span className="hotel-search-header-spacer" aria-hidden="true" />
            </header>

            <button type="button" className="hotel-location-field" onClick={openDestinationPicker} aria-label="Chọn địa điểm">
              <span className={hotelDestination ? 'has-destination' : ''}>
                {hotelDestination || 'Tìm địa điểm hoặc khách sạn'}
              </span>
              <Search size={20} aria-hidden="true" />
            </button>

            <section className="hotel-detail-card hotel-date-card" aria-label="Ngày lưu trú">
              <CalendarDays className="hotel-detail-icon" size={21} aria-hidden="true" />
              <div className="hotel-date-item">
                <span className="hotel-detail-label">Nhận phòng</span>
                <strong>{formatStayDate(bookingForm.checkIn).day}</strong>
                <span className="hotel-date-month">{formatStayDate(bookingForm.checkIn).monthYear}</span>
                <div className="hotel-date-edit">
                  <span><CalendarDays size={12} aria-hidden="true" /> Chỉnh ngày</span>
                  <input
                    type="date"
                    className="hotel-date-native-input"
                    value={bookingForm.checkIn}
                    min={getDateInputValue()}
                    aria-label="Chỉnh ngày nhận phòng"
                    onChange={(event) => {
                      const checkIn = event.target.value;
                      setBookingForm((previous) => ({
                        ...previous,
                        checkIn,
                        checkOut: previous.checkOut <= checkIn
                          ? getDateInputValue(1, new Date(`${checkIn}T00:00:00`))
                          : previous.checkOut,
                      }));
                    }}
                  />
                </div>
              </div>
              <ArrowRight className="hotel-date-arrow" size={19} aria-hidden="true" />
              <div className="hotel-date-item">
                <span className="hotel-detail-label">Trả phòng</span>
                <strong>{formatStayDate(bookingForm.checkOut).day}</strong>
                <span className="hotel-date-month">{formatStayDate(bookingForm.checkOut).monthYear}</span>
                <div className="hotel-date-edit">
                  <span><CalendarDays size={12} aria-hidden="true" /> Chỉnh ngày</span>
                  <input
                    type="date"
                    className="hotel-date-native-input"
                    value={bookingForm.checkOut}
                    min={bookingForm.checkIn || getDateInputValue(1)}
                    aria-label="Chỉnh ngày trả phòng"
                    onChange={(event) => setBookingForm((previous) => ({ ...previous, checkOut: event.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className={`hotel-detail-card hotel-guests-card ${guestExpanded ? 'is-expanded' : ''}`}>
              <Users className="hotel-detail-icon" size={21} aria-hidden="true" />
              <button type="button" className="hotel-guest-summary" onClick={() => setGuestExpanded((expanded) => !expanded)} aria-expanded={guestExpanded}>
                <span className="hotel-detail-label">Khách và phòng</span>
                <span>{hotelGuestCounts.rooms} Phòng · {hotelGuestCounts.adults} Người lớn · {hotelGuestCounts.children} Trẻ em · {hotelGuestCounts.infants} Em bé</span>
              </button>
              {guestExpanded && (
                <div className="hotel-guest-options">
                  {[
                    ['rooms', 'Phòng'],
                    ['adults', 'Người lớn'],
                    ['children', 'Trẻ em'],
                    ['infants', 'Em bé'],
                  ].map(([key, label]) => (
                    <div className="hotel-guest-row" key={key}>
                      <span>{label}</span>
                      <div className="hotel-stepper">
                        <button type="button" onClick={() => updateGuestCount(key, -1)} aria-label={`Giảm ${label}`}><Minus size={15} /></button>
                        <strong>{hotelGuestCounts[key]}</strong>
                        <button type="button" onClick={() => updateGuestCount(key, 1)} aria-label={`Tăng ${label}`}><Plus size={15} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className={`hotel-detail-card hotel-promo-card ${promoExpanded ? 'is-expanded' : ''}`}>
              <Tag className="hotel-detail-icon" size={20} aria-hidden="true" />
              <button type="button" className="hotel-promo-trigger" onClick={() => setPromoExpanded((expanded) => !expanded)} aria-expanded={promoExpanded}>
                <span><strong>Mã ưu đãi</strong><small>{promoCode || 'Chọn hoặc nhập mã'}</small></span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              {promoExpanded && (
                <input
                  className="hotel-promo-input"
                  type="text"
                  placeholder="Nhập mã ưu đãi"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                  aria-label="Mã ưu đãi"
                />
              )}
            </section>

            {(hotelSearchError || roomsError) && <p className="hotel-form-error" role="alert">{hotelSearchError || roomsError}</p>}
            <button type="submit" className="hotel-search-button">Tìm kiếm</button>
          </form>
        </main>
      )}

      {destinationPickerOpen && activeTab === 'hotel' && (
        <section className="destination-picker-overlay" aria-label="Chọn điểm đến">
          <header className="hotel-search-header">
            <button type="button" className="hotel-search-back" onClick={() => setDestinationPickerOpen(false)} aria-label="Quay lại tìm kiếm">
              <ArrowLeft size={21} />
            </button>
            <h1>Chọn điểm đến</h1>
            <span className="hotel-search-header-spacer" aria-hidden="true" />
          </header>
          <label className="destination-picker-search">
            <Search size={18} aria-hidden="true" />
            <input
              autoFocus
              type="search"
              placeholder="Tìm địa điểm, khu vực hoặc khách sạn"
              value={destinationSearch}
              onChange={(event) => setDestinationSearch(event.target.value)}
              aria-label="Tìm địa điểm, khu vực hoặc khách sạn"
            />
          </label>
          <div className="destination-picker-list">
            <p className="destination-picker-kicker">
              {normalizedDestinationSearch ? 'ĐỊA ĐIỂM VÀ KHU VỰC' : 'ĐỊA ĐIỂM NỔI TIẾNG'}
            </p>
            {filteredDestinationGroups.map((destination) => (
              <section className="destination-picker-group" key={destination.id}>
                <button type="button" className="destination-city-option" onClick={() => selectDestination({ label: destination.name, city: destination.name, citySlug: destination.slug })}>
                  <MapPin size={17} aria-hidden="true" />
                  <span>{destination.name}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                {destination.locations.length > 0 && (
                  <div className="destination-area-options">
                    {destination.locations.map((area) => (
                      <button type="button" key={area.id} onClick={() => selectDestination({
                        label: `${area.name}, ${destination.name}`,
                        city: destination.name,
                        citySlug: destination.slug,
                        locationSlug: area.slug,
                      })}>
                        {area.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}

            {matchingHotels.length > 0 && (
              <section className="destination-hotel-suggestions">
                <p className="destination-picker-kicker">KHÁCH SẠN PHÙ HỢP</p>
                {matchingHotels.map((hotel) => (
                  <button type="button" className="destination-hotel-option" key={hotel.id} onClick={() => selectDestination({ label: hotel.name, city: hotel.city, hotelId: hotel.id })}>
                    <span className="destination-hotel-icon">⌂</span>
                    <span><strong>{hotel.name}</strong><small>{hotel.city}{hotel.address ? ` · ${hotel.address}` : ''}</small></span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                ))}
              </section>
            )}
            {normalizedDestinationSearch && filteredDestinationGroups.length === 0 && matchingHotels.length === 0 && (
              <p className="destination-no-results">Không tìm thấy địa điểm hoặc khách sạn phù hợp.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === 'hotel-results' && (
        <main className="hotel-results-screen">
          <header className="hotel-search-header hotel-results-header">
            <button type="button" className="hotel-search-back" onClick={() => setActiveTab('hotel')} aria-label="Sửa tìm kiếm">
              <ArrowLeft size={21} />
            </button>
            <h1>Kết quả khách sạn</h1>
            <button type="button" className="hotel-results-edit" onClick={() => setActiveTab('hotel')}>Sửa</button>
          </header>
          <div className="hotel-search-summary-grid">
            <div><span>Điểm đến</span><strong>{hotelDestination || selectedDestinationCity}</strong></div>
            <div><span>Ngày</span><strong>{formatStayDate(bookingForm.checkIn).day}/{new Date(`${bookingForm.checkIn}T00:00:00`).getMonth() + 1}–{formatStayDate(bookingForm.checkOut).day}/{new Date(`${bookingForm.checkOut}T00:00:00`).getMonth() + 1}</strong></div>
            <div><span>Phòng</span><strong>{hotelGuestCounts.rooms}</strong></div>
            <div><span>Khách</span><strong>{hotelGuestCounts.adults + hotelGuestCounts.children}</strong></div>
          </div>

          <div className="hotel-result-tools">
            <button type="button" onClick={() => setMapOpen(true)}><MapPin size={16} /> Bản đồ</button>
            <button type="button" onClick={() => setHotelFilterOpen(true)}><span aria-hidden="true">⚙</span> Bộ lọc</button>
            <span>{filteredHotelResults.length} khách sạn</span>
          </div>

          {hotelsLoading ? (
            <div className="rooms-empty">Đang tìm khách sạn phù hợp...</div>
          ) : hotelSearchError ? (
            <div className="rooms-error" role="alert">{hotelSearchError}</div>
          ) : filteredHotelResults.length === 0 ? (
            <div className="rooms-empty">Không tìm thấy khách sạn phù hợp với lựa chọn này.</div>
          ) : (
            <div className="hotel-results-list">
              {filteredHotelResults.map((hotel) => (
                <article className="hotel-result-card" key={hotel.id}>
                  <button type="button" className="hotel-result-main" onClick={() => openHotelDetail(hotel)}>
                    <img className="hotel-result-image" src={hotel.heroImage} alt={hotel.name} />
                    <span className="hotel-result-content">
                      <strong className="hotel-result-name">{hotel.name}</strong>
                      <span className="hotel-result-address"><MapPin size={13} /> {hotel.displayAddress}</span>
                      <span className="hotel-result-rating">
                        <span>{'★'.repeat(Math.max(0, Math.min(5, Number(hotel.star_rating || 0))))}</span>
                        {hotel.average_rating ? `${Number(hotel.average_rating).toFixed(1)} / 5` : `${hotel.star_rating || 0} sao`}
                        <small>{hotel.reviewCount ? `${hotel.reviewCount} đánh giá` : 'Chưa có đánh giá'}</small>
                      </span>
                      <span className="hotel-result-price">
                        {hotel.startingPrice ? <>{formatCurrency(hotel.startingPrice)} <small>/ đêm</small></> : 'Chưa có giá phòng'}
                      </span>
                    </span>
                    <ArrowRight className="hotel-result-arrow" size={18} />
                  </button>
                  <button type="button" className="hotel-result-detail-link" onClick={() => openHotelDetail(hotel)}>Xem chi tiết</button>
                </article>
              ))}
            </div>
          )}

          {hotelFilterOpen && (
            <div className="hotel-overlay" role="presentation" onClick={(event) => event.target === event.currentTarget && setHotelFilterOpen(false)}>
              <section className="hotel-filter-sheet" role="dialog" aria-modal="true" aria-label="Bộ lọc khách sạn">
                <header><h2>Bộ lọc</h2><button type="button" onClick={() => setHotelFilterOpen(false)} aria-label="Đóng bộ lọc">×</button></header>
                <label className="hotel-filter-price">
                  <span>Giá tối đa mỗi đêm</span>
                  <strong>{formatCurrency(maximumPrice)}</strong>
                  <input type="range" min="500000" max="10000000" step="250000" value={maximumPrice} onChange={(event) => setMaximumPrice(Number(event.target.value))} />
                </label>
                <div className="hotel-filter-stars">
                  <span>Hạng sao tối thiểu</span>
                  <div>{[0, 3, 4, 5].map((stars) => (
                    <button type="button" className={minimumStars === stars ? 'active' : ''} key={stars} onClick={() => setMinimumStars(stars)}>
                      {stars ? `${stars}+ sao` : 'Tất cả'}
                    </button>
                  ))}</div>
                </div>
                <button type="button" className="hotel-filter-apply" onClick={() => setHotelFilterOpen(false)}>Xem {filteredHotelResults.length} khách sạn</button>
              </section>
            </div>
          )}

          {mapOpen && (
            <div className="hotel-overlay" role="presentation" onClick={(event) => event.target === event.currentTarget && setMapOpen(false)}>
              <section className="hotel-map-sheet" role="dialog" aria-modal="true" aria-label="Bản đồ khách sạn">
                <header><h2>Bản đồ · {selectedDestinationCity}</h2><button type="button" onClick={() => setMapOpen(false)} aria-label="Đóng bản đồ">×</button></header>
                <iframe title={`Bản đồ ${selectedDestinationCity}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedDestinationCity)}&output=embed`} loading="lazy" />
              </section>
            </div>
          )}
        </main>
      )}

      {activeTab === 'hotel-detail' && selectedHotel && (
        <main className="hotel-detail-screen">
          <header className="hotel-search-header hotel-results-header">
            <button type="button" className="hotel-search-back" onClick={() => setActiveTab('hotel-results')} aria-label="Quay lại kết quả">
              <ArrowLeft size={21} />
            </button>
            <h1>Chi tiết khách sạn</h1>
            <span className="hotel-search-header-spacer" />
          </header>
          <img className="hotel-detail-hero" src={selectedHotel.heroImage} alt={selectedHotel.name} />
          <section className="hotel-detail-info">
            <h2>{selectedHotel.name}</h2>
            <p><MapPin size={15} /> {selectedHotel.displayAddress}</p>
            <div className="hotel-result-rating"><span>{'★'.repeat(Math.max(0, Math.min(5, Number(selectedHotel.star_rating || 0))))}</span> {selectedHotel.star_rating || 0} sao <small>{selectedHotel.reviewCount ? `${selectedHotel.reviewCount} đánh giá` : 'Chưa có đánh giá'}</small></div>
            {selectedHotel.description && <p className="hotel-detail-description">{selectedHotel.description}</p>}
          </section>
          <div className="hotel-detail-rooms-heading"><h2>Phòng còn trống</h2><span>{selectedHotel.rooms?.length || 0} phòng</span></div>
          {selectedHotel.rooms?.length ? (
            <div className="room-list hotel-detail-room-list">
              {selectedHotel.rooms.map((room) => (
                <article key={room.id} className="pwa-room-card">
                  <div className="room-img-wrapper" style={{ backgroundImage: `url(${room.image})` }}><div className="room-badge">{room.category}</div></div>
                  <div className="room-card-info">
                    <h3>{room.name}</h3>
                    <div className="room-amenities">{room.amenities.map((amenity, index) => <span key={index}>✓ {amenity}</span>)}</div>
                    <div className="room-price-row">
                      <div className="price-text">{formatCurrency(room.price)} <span>/đêm</span></div>
                      <button type="button" className="btn-book" onClick={() => { setSelectedBranchId(String(room.hotel_branch_id)); setShowBookingModal(room); }}>Đặt phòng</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="rooms-empty">Không có phòng trống phù hợp trong thời gian này.</div>}
        </main>
      )}

      {/* TAB 2: ĐƠN HÀNG (ORDERS) */}
      {activeTab === 'orders' && (
        <OrdersTab
          user={user}
          localBookings={myBookings}
          onGoToCheckIn={(booking) => {
            setCheckInTargetId(booking.id);
            setCheckInSubTab('online');
            setActiveTab('checkin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onGoToQR={(booking) => {
            setCheckInTargetId(booking.id);
            setCheckInSubTab('qr');
            setActiveTab('checkin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onGoToCheckout={(booking) => {
            setCheckInTargetId(booking.id);
            setCheckInSubTab('checkout');
            setActiveTab('checkin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBookAgain={() => {
            setActiveTab('explore');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onRequireAuth={() => {
            setAuthMode('login');
            setAuthModalOpen(true);
            setAuthError('');
          }}
        />
      )}

      {/* TAB 3: CHECK-IN */}
      {activeTab === 'checkin' && (
        <CheckInTab
          user={user}
          localBookings={myBookings}
          initialSubTab={checkInSubTab}
          targetBookingId={checkInTargetId}
          onBookingUpdated={(updated) => {
            setMyBookings(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
          }}
          onExploreMore={() => {
            setActiveTab('explore');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* TAB 4: TÀI KHOẢN (ACCOUNT) */}
      {activeTab === 'account' && (
        <AccountTab
          user={user}
          onLogout={clearAuth}
          onLoginRequest={() => {
            setAuthMode('login');
            setAuthModalOpen(true);
            setAuthError('');
          }}
          onGoToBooking={() => {
            setActiveTab('explore');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}


      {/* MODAL: BOOKING — Multi-step BookingFlow */}
      {showBookingModal && (
        <BookingFlow
          room={showBookingModal}
          user={user}
          bookingForm={bookingForm}
          onClose={() => setShowBookingModal(null)}
          onLoginRequest={() => { setShowBookingModal(null); setAuthMode('login'); setAuthModalOpen(true); setAuthError(''); }}
          onConfirm={async ({ contactInfo, bookingMode, totalPrice }) => {
            // Sync contactInfo back into bookingForm state
            setBookingForm((prev) => ({
              ...prev,
              fullName: contactInfo.fullName,
              phone: contactInfo.phone,
              email: contactInfo.email,
            }));

            const selectedRoom = availableRooms.find((room) => room.id === Number(showBookingModal?.id)) || showBookingModal;
            if (!selectedRoom?.id) throw new Error('Bạn chưa chọn phòng hợp lệ để đặt.');

            let customerId = user?.customerId;
            if (!customerId && user) {
              customerId = await ensureCustomerProfile(user);
            }

            const payload = {
              customer_id: customerId ? Number(customerId) : undefined,
              guest_name: contactInfo.fullName,
              guest_email: contactInfo.email,
              guest_phone: contactInfo.phone,
              room_id: Number(selectedRoom.id),
              hotel_branch_id: Number(selectedBranchId || selectedRoom.hotel_branch_id || 1),
              checkin_date: bookingForm.checkIn,
              checkout_date: bookingForm.checkOut,
              num_guests: Number(bookingForm.guests || 1),
              special_requests: 'Booked through LuxStay PWA',
              booking_source: user ? 'Web' : 'Guest',
            };

            const response = await api.post('/bookings', payload);
            const createdBooking = response?.data?.data;

            const newBk = {
              id: `BK${createdBooking?.id || Math.floor(1000 + Math.random() * 9000)}`,
              roomName: selectedRoom.name,
              roomNumber: selectedRoom.roomNumber || 'Dự kiến',
              checkIn: bookingForm.checkIn,
              checkOut: bookingForm.checkOut,
              totalPrice: totalPrice || (Number(selectedRoom.price || 0) * Math.max(1, Math.ceil((new Date(bookingForm.checkOut) - new Date(bookingForm.checkIn)) / (1000 * 60 * 60 * 24)))),
              status: 'Confirmed (Chờ Check-in)'
            };

            setMyBookings((prev) => [newBk, ...prev]);

            return {
              bookingId: createdBooking?.id,
              booking: createdBooking,
            };
          }}
        />
      )}

      {!isHotelFlow && (
        <ConciergeChat
          open={conciergeOpen}
          onOpenChange={setConciergeOpen}
          bookingContext={conciergeBookingContext}
          onSuggestedAction={handleConciergeAction}
        />
      )}

      {!user && authModalOpen && (
        <div className="modal-pwa auth-modal">
          <div className="modal-pwa-content auth-dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px' }}>Đăng nhập để xác nhận đặt phòng</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px' }} onClick={() => setAuthModalOpen(false)}>✕</button>
            </div>

            <div className="auth-toggle">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Đăng ký
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Họ và tên</span>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Nguyễn Văn A"
                    value={authForm.full_name}
                    onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })}
                    required
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="email@luxstay.vn"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </label>

              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Số điện thoại</span>
                  <input
                    type="tel"
                    className="auth-input"
                    placeholder="0901234567"
                    value={authForm.phone}
                    onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                    required
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Mật khẩu</span>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </label>

              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Xác nhận mật khẩu</span>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Nhập lại mật khẩu"
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    required
                  />
                </label>
              )}

              {authError && <div className="auth-error">{authError}</div>}

              <button type="submit" className="auth-submit" disabled={authLoading}>
                {authLoading ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
            </form>
          </div>
        </div>
      )}

      {!isHotelFlow && <nav className="tabbar" aria-label="Điều hướng chính">
        <button type="button" className={`tab ${activeNavTab === 'home' ? 'active' : ''}`} onClick={() => selectNavTab('home')} aria-current={activeNavTab === 'home' ? 'page' : undefined}>
          <Home aria-hidden="true" /><span>Trang chủ</span>
        </button>
        <button type="button" className={`tab ${activeNavTab === 'orders' ? 'active' : ''}`} onClick={() => selectNavTab('orders')} aria-current={activeNavTab === 'orders' ? 'page' : undefined}>
          <ClipboardList aria-hidden="true" /><span>Đơn hàng</span>
        </button>
        <button type="button" className={`tab ${activeNavTab === 'checkin' ? 'active' : ''}`} onClick={() => selectNavTab('checkin')} aria-current={activeNavTab === 'checkin' ? 'page' : undefined}>
          <KeyRound aria-hidden="true" /><span>Check-in</span>
        </button>
        <button type="button" className={`tab ${activeNavTab === 'account' ? 'active' : ''}`} onClick={() => selectNavTab('account')} aria-current={activeNavTab === 'account' ? 'page' : undefined}>
          <UserRound aria-hidden="true" /><span>Tài khoản</span>
        </button>
      </nav>}
    </div>
  );
}
