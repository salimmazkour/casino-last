import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import DateRangePicker from '../components/DateRangePicker';
import './Hotel.css';

export default function Hotel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('calendar');
  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [stays, setStays] = useState([]);
  const [mealPlans, setMealPlans] = useState([]);
  const [rateTypes, setRateTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [hotelPayments, setHotelPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showNewReservationModal, setShowNewReservationModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showReservationDetailModal, setShowReservationDetailModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedStay, setSelectedStay] = useState(null);

  const [calendarStartDate, setCalendarStartDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [calendarDays, setCalendarDays] = useState(14);
  const [reservationSearch, setReservationSearch] = useState('');
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingRateType, setEditingRateType] = useState(null);
  const [editingMealPlan, setEditingMealPlan] = useState(null);

  const [newReservation, setNewReservation] = useState({
    client_id: null,
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_nationality: '',
    guest_id_number: '',
    room_id: null,
    check_in_date: '',
    check_out_date: '',
    adults_count: 2,
    children_count: 0,
    meal_plan_id: null,
    special_requests: '',
    deposit_amount: 0,
    source: 'direct'
  });

  useEffect(() => {
    loadData();

    const roomsSubscription = supabase
      .channel('hotel-rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_rooms' }, () => {
        loadData();
      })
      .subscribe();

    const staysSubscription = supabase
      .channel('hotel-stays-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_stays' }, () => {
        loadData();
      })
      .subscribe();

    const reservationsSubscription = supabase
      .channel('hotel-reservations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hotel_reservations' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      roomsSubscription.unsubscribe();
      staysSubscription.unsubscribe();
      reservationsSubscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Nettoyer les statuts expirés avant de charger les données
      await supabase.rpc('cleanup_expired_hotel_statuses');

      const roomsRes = await supabase.from('hotel_rooms').select('*').order('room_number');
      if (roomsRes.error) throw roomsRes.error;
      setRooms(roomsRes.data || []);

      const reservationsRes = await supabase.from('hotel_reservations').select('*').gte('check_out_date', new Date().toISOString().split('T')[0]).order('check_in_date');
      if (reservationsRes.error) throw reservationsRes.error;

      const reservationsWithDetails = await Promise.all((reservationsRes.data || []).map(async (res) => {
        const room = roomsRes.data?.find(r => r.id === res.room_id);
        let mealPlan = null;
        let client = null;

        if (res.meal_plan_id) {
          const { data } = await supabase.from('hotel_meal_plans').select('*').eq('id', res.meal_plan_id).single();
          mealPlan = data;
        }

        if (res.client_id) {
          const { data } = await supabase.from('clients').select('*').eq('id', res.client_id).single();
          client = data;
        }

        return {
          ...res,
          hotel_rooms: room,
          hotel_meal_plans: mealPlan,
          clients: client
        };
      }));
      setReservations(reservationsWithDetails);

      const staysRes = await supabase.from('hotel_stays').select('*').eq('status', 'active').order('room_id');
      if (staysRes.error) throw staysRes.error;

      const staysWithDetails = await Promise.all((staysRes.data || []).map(async (stay) => {
        const room = roomsRes.data?.find(r => r.id === stay.room_id);
        let mealPlan = null;
        let reservation = null;

        if (stay.meal_plan_id) {
          const { data } = await supabase.from('hotel_meal_plans').select('*').eq('id', stay.meal_plan_id).single();
          mealPlan = data;
        }

        if (stay.reservation_id) {
          const { data } = await supabase.from('hotel_reservations').select('*').eq('id', stay.reservation_id).single();
          reservation = data;
        }

        const checkInDate = new Date(stay.check_in_date);
        const today = new Date();
        const nightsStayed = Math.ceil((today - checkInDate) / (1000 * 60 * 60 * 24));
        const pricePerNight = reservation?.room_price_per_night || 100;
        const calculatedRoomCharges = nightsStayed * pricePerNight;

        const restaurantCharges = parseFloat(stay.restaurant_charges || 0);

        const totalCharges = calculatedRoomCharges + restaurantCharges +
                            parseFloat(stay.mini_bar_charges || 0) +
                            parseFloat(stay.other_charges || 0);

        return {
          ...stay,
          hotel_rooms: room,
          hotel_meal_plans: mealPlan,
          hotel_reservations: reservation,
          calculated_room_charges: calculatedRoomCharges,
          calculated_restaurant_charges: restaurantCharges,
          calculated_total_charges: totalCharges,
          nights_stayed: nightsStayed
        };
      }));
      setStays(staysWithDetails);

      const mealPlansRes = await supabase.from('hotel_meal_plans').select('*').eq('active', true);
      console.log('Meal plans response:', mealPlansRes);
      if (mealPlansRes.error) {
        console.error('Meal plans error:', mealPlansRes.error);
        throw mealPlansRes.error;
      }
      console.log('Meal plans loaded:', mealPlansRes.data);
      setMealPlans(mealPlansRes.data || []);

      const rateTypesRes = await supabase.from('hotel_rate_types').select('*').eq('active', true).order('base_price');
      if (rateTypesRes.error) throw rateTypesRes.error;
      console.log('Rate types loaded:', rateTypesRes.data);
      setRateTypes(rateTypesRes.data || []);

      const clientsRes = await supabase.from('clients').select('*').order('first_name');
      if (clientsRes.error) throw clientsRes.error;
      setClients(clientsRes.data || []);

      const paymentsRes = await supabase
        .from('hotel_payments')
        .select(`
          *,
          hotel_stays (
            guest_name,
            room_id,
            check_in_date,
            check_out_date,
            hotel_rooms (room_number)
          )
        `)
        .order('created_at', { ascending: false });
      if (paymentsRes.error) throw paymentsRes.error;
      setHotelPayments(paymentsRes.data || []);

    } catch (error) {
      console.error('Erreur chargement données hôtel:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDates = () => {
    const dates = [];
    for (let i = 0; i < calendarDays; i++) {
      const date = new Date(calendarStartDate);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getReservationsForRoomAndDate = (roomId, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.filter(res => {
      if (res.status === 'cancelled') return false;
      return res.room_id === roomId &&
             res.check_in_date <= dateStr &&
             res.check_out_date > dateStr;
    });
  };

  const handleCreateReservation = async () => {
    try {
      if (!newReservation.guest_name || !newReservation.room_id ||
          !newReservation.check_in_date || !newReservation.check_out_date) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }

      if (!newReservation.rate_type_id) {
        alert('Veuillez sélectionner un tarif');
        return;
      }

      if (!newReservation.meal_plan_id) {
        alert('Veuillez sélectionner une formule repas');
        return;
      }

      const checkIn = new Date(newReservation.check_in_date);
      const checkOut = new Date(newReservation.check_out_date);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      if (nights < 1) {
        alert('La date de départ doit être après la date d\'arrivée');
        return;
      }

      // Vérifier les chevauchements de réservations
      // Une réservation chevauche si : check_in < nouvelle_check_out ET check_out > nouvelle_check_in
      // Le jour de check-out d'une réservation existante est disponible
      let overlapQuery = supabase
        .from('hotel_reservations')
        .select('*, clients(first_name, last_name, company_name)')
        .eq('room_id', newReservation.room_id)
        .in('status', ['confirmed', 'checked_in'])
        .or(`and(check_in_date.lt.${newReservation.check_out_date},check_out_date.gt.${newReservation.check_in_date})`);

      // Si on est en mode édition, exclure la réservation en cours
      if (editingReservation) {
        overlapQuery = overlapQuery.neq('id', editingReservation.id);
      }

      const { data: overlappingReservations, error: overlapError } = await overlapQuery;

      if (overlapError) throw overlapError;

      if (overlappingReservations && overlappingReservations.length > 0) {
        const conflictReservation = overlappingReservations[0];
        const clientName = conflictReservation.clients
          ? (conflictReservation.clients.company_name || `${conflictReservation.clients.first_name} ${conflictReservation.clients.last_name}`)
          : conflictReservation.guest_name;

        alert(
          `❌ Cette chambre est déjà réservée !\n\n` +
          `Client: ${clientName}\n` +
          `Du: ${new Date(conflictReservation.check_in_date).toLocaleDateString('fr-FR')}\n` +
          `Au: ${new Date(conflictReservation.check_out_date).toLocaleDateString('fr-FR')}\n\n` +
          `Veuillez choisir une autre chambre ou d'autres dates.`
        );
        return;
      }

      const room = rooms.find(r => r.id === newReservation.room_id);
      const roomPrice = 100;
      const mealPlan = mealPlans.find(m => m.id === newReservation.meal_plan_id);
      const mealPrice = mealPlan ? (mealPlan.price_adult * newReservation.adults_count +
                                    mealPlan.price_child * newReservation.children_count) : 0;

      const totalAmount = (roomPrice + mealPrice) * nights;
      const balanceDue = totalAmount - (newReservation.deposit_amount || 0);

      const reservationNumber = `RES${Date.now().toString().slice(-8)}`;

      const reservationData = {
        reservation_number: reservationNumber,
        room_id: newReservation.room_id,
        guest_name: newReservation.guest_name,
        guest_email: newReservation.guest_email || null,
        guest_phone: newReservation.guest_phone || null,
        guest_nationality: newReservation.guest_nationality || null,
        guest_id_number: newReservation.guest_id_number || null,
        check_in_date: newReservation.check_in_date,
        check_out_date: newReservation.check_out_date,
        number_of_guests: (newReservation.adults_count || 1) + (newReservation.children_count || 0),
        adults_count: newReservation.adults_count || 1,
        children_count: newReservation.children_count || 0,
        nights_count: nights,
        room_price_per_night: roomPrice,
        meal_plan_id: newReservation.meal_plan_id || null,
        meal_plan_price: mealPrice,
        total_amount: totalAmount,
        deposit_amount: newReservation.deposit_amount || 0,
        balance_due: balanceDue,
        special_requests: newReservation.special_requests || null,
        client_id: newReservation.client_id || null,
        source: newReservation.source || 'direct',
        status: 'confirmed',
        created_by: user.id
      };

      console.log(editingReservation ? 'Updating reservation with data:' : 'Creating reservation with data:', reservationData);

      let data, error;
      if (editingReservation) {
        // Mode édition : mettre à jour la réservation existante
        const updateData = { ...reservationData };
        delete updateData.reservation_number;
        delete updateData.created_by;

        const result = await supabase
          .from('hotel_reservations')
          .update(updateData)
          .eq('id', editingReservation.id)
          .select();

        data = result.data;
        error = result.error;
      } else {
        // Mode création : insérer une nouvelle réservation
        const result = await supabase.from('hotel_reservations').insert([reservationData]).select();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setShowNewReservationModal(false);
      setEditingReservation(null);
      setNewReservation({
        client_id: null, guest_name: '', guest_email: '', guest_phone: '',
        guest_nationality: '', guest_id_number: '', room_id: null,
        check_in_date: '', check_out_date: '', adults_count: 2, children_count: 0,
        meal_plan_id: null, special_requests: '', deposit_amount: 0, source: 'direct'
      });
      await loadData();
      alert(editingReservation ? '✓ Réservation modifiée avec succès!' : '✅ Réservation créée avec succès !');
    } catch (error) {
      console.error('Erreur création réservation:', error);
      alert('Erreur lors de la création de la réservation: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleCancelReservation = async (reservation) => {
    if (!confirm(`Voulez-vous vraiment annuler la réservation ${reservation.reservation_number} de ${reservation.guest_name} ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('hotel_reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservation.id);

      if (error) throw error;

      await loadData();
      alert('✅ Réservation annulée avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'annulation:', error);
      alert('❌ Erreur lors de l\'annulation de la réservation');
    }
  };

  const handleCheckin = async (reservation) => {
    setSelectedReservation(reservation);
    setShowCheckinModal(true);
  };

  const confirmCheckin = async () => {
    try {
      const checkOutDateOnly = selectedReservation.check_out_date.split('T')[0];

      const { data: stay, error: stayError } = await supabase.from('hotel_stays').insert([{
        reservation_id: selectedReservation.id,
        room_id: selectedReservation.room_id,
        guest_name: selectedReservation.guest_name,
        check_in_date: new Date().toISOString(),
        check_out_date: checkOutDateOnly,
        meal_plan_id: selectedReservation.meal_plan_id,
        status: 'active'
      }]).select().single();

      if (stayError) throw stayError;

      await supabase.from('hotel_reservations')
        .update({ status: 'checked_in', actual_check_in: new Date().toISOString() })
        .eq('id', selectedReservation.id);

      await supabase.from('hotel_rooms')
        .update({ status: 'occupied' })
        .eq('id', selectedReservation.room_id);

      alert('Check-in effectué avec succès !');
      setShowCheckinModal(false);
      setSelectedReservation(null);
      loadData();
    } catch (error) {
      console.error('Erreur check-in:', error);
      alert('Erreur lors du check-in: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleCheckout = async (stay) => {
    setSelectedStay(stay);
    setShowCheckoutModal(true);
  };

  const confirmCheckout = async (paymentData) => {
    try {
      await supabase.from('hotel_stays')
        .update({
          status: 'checked_out',
          actual_check_out: new Date().toISOString(),
          room_charges: selectedStay.calculated_room_charges || 0,
          restaurant_charges: selectedStay.calculated_restaurant_charges || 0,
          total_charges: selectedStay.calculated_total_charges || 0
        })
        .eq('id', selectedStay.id);

      if (selectedStay.reservation_id) {
        const actualCheckoutDate = new Date().toISOString().split('T')[0];
        await supabase.from('hotel_reservations')
          .update({
            status: 'checked_out',
            actual_check_out: new Date().toISOString(),
            check_out_date: actualCheckoutDate
          })
          .eq('id', selectedStay.reservation_id);
      }

      await supabase.from('hotel_rooms')
        .update({ status: 'cleaning' })
        .eq('id', selectedStay.room_id);

      for (const payment of paymentData.payments) {
        if (payment.amount > 0) {
          await supabase.from('hotel_payments').insert([{
            stay_id: selectedStay.id,
            payment_type: payment.type,
            amount: payment.amount,
            received_by: user.id
          }]);

          if (payment.type === 'client_account' && paymentData.clientId) {
            const { data: client } = await supabase
              .from('clients')
              .select('current_balance')
              .eq('id', paymentData.clientId)
              .single();

            if (client) {
              await supabase
                .from('clients')
                .update({ current_balance: client.current_balance - payment.amount })
                .eq('id', paymentData.clientId);

              await supabase.from('client_payments_history').insert([{
                client_id: paymentData.clientId,
                payment_type: 'debit',
                amount: payment.amount,
                description: `Check-out hôtel - Chambre ${selectedStay.hotel_rooms?.room_number}`,
                processed_by: user.id
              }]);
            }
          }
        }
      }

      alert('Check-out effectué avec succès !');
      setShowCheckoutModal(false);
      setSelectedStay(null);
      loadData();
    } catch (error) {
      console.error('Erreur check-out:', error);
      alert('Erreur lors du check-out');
    }
  };

  if (loading) {
    return (
      <div className="hotel-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement du module hôtel...</p>
        </div>
      </div>
    );
  }

  const calendarDates = generateCalendarDates();

  return (
    <div className="hotel-container">
      <div className="hotel-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/dashboard')} title="Retour au tableau de bord">
            ← Retour
          </button>
          <h1>🏨 Gestion Hôtelière</h1>
          <p className="subtitle">43 chambres • {stays.length} occupées • {reservations.filter(r => r.status === 'confirmed').length} réservées • {rooms.length - stays.length - reservations.filter(r => r.status === 'confirmed').length} disponibles</p>
        </div>
        <div className="header-right">
          <button className="btn-primary" onClick={() => {
            setEditingReservation(null);
            setNewReservation({
              client_id: null, guest_name: '', guest_email: '', guest_phone: '',
              guest_nationality: '', guest_id_number: '', room_id: null,
              check_in_date: '', check_out_date: '', adults_count: 2, children_count: 0,
              meal_plan_id: null, special_requests: '', deposit_amount: 0, source: 'direct'
            });
            setShowNewReservationModal(true);
          }}>
            + Nouvelle Réservation
          </button>
        </div>
      </div>

      <div className="hotel-tabs">
        <button className={`hotel-tab ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
          📅 Calendrier
        </button>
        <button className={`hotel-tab ${activeTab === 'reservations' ? 'active' : ''}`} onClick={() => setActiveTab('reservations')}>
          📋 Réservations ({reservations.filter(r => r.status !== 'cancelled' && r.status !== 'checked_out').length})
        </button>
        <button className={`hotel-tab ${activeTab === 'stays' ? 'active' : ''}`} onClick={() => setActiveTab('stays')}>
          🛎️ Séjours Actifs ({stays.length})
        </button>
        <button className={`hotel-tab ${activeTab === 'rates' ? 'active' : ''}`} onClick={() => setActiveTab('rates')}>
          💰 Tarifs
        </button>
        <button className={`hotel-tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          📊 Rapports
        </button>
      </div>

      <div className="hotel-content">
        {activeTab === 'calendar' && (
          <div className="calendar-view">
            <div className="calendar-controls">
              <div className="calendar-nav-buttons">
                <button onClick={() => {
                  const newDate = new Date(calendarStartDate);
                  newDate.setDate(newDate.getDate() - 7);
                  setCalendarStartDate(newDate);
                }}>← Semaine précédente</button>

                <button onClick={() => setCalendarStartDate(new Date())}>Aujourd'hui</button>

                <button onClick={() => {
                  const newDate = new Date(calendarStartDate);
                  newDate.setDate(newDate.getDate() + 7);
                  setCalendarStartDate(newDate);
                }}>Semaine suivante →</button>
              </div>

              <div className="calendar-date-picker">
                <label htmlFor="calendar-jump-date">Aller à la date :</label>
                <input
                  type="date"
                  id="calendar-jump-date"
                  value={calendarStartDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCalendarStartDate(new Date(e.target.value + 'T00:00:00'));
                    }
                  }}
                />
              </div>
            </div>

            <div className="calendar-grid-container">
              <div className="calendar-grid">
                <div className="calendar-header">
                  <div className="calendar-cell header-cell room-header">Chambre</div>
                  {calendarDates.map(date => (
                    <div key={date.toISOString()} className="calendar-cell header-cell">
                      <div className="date-day">{date.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                      <div className="date-number">{date.getDate()}</div>
                      <div className="date-month">{date.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                    </div>
                  ))}
                </div>

                <div className="calendar-body">
                  {rooms.map(room => (
                    <div key={room.id} className="calendar-row">
                      <div className="calendar-cell room-cell">
                        <div className="room-number-cal">{room.room_number}</div>
                        <div className={`room-type-cal ${room.room_type}`}>
                          {room.room_type === 'suite' ? '👑' : '🛏️'}
                        </div>
                      </div>
                      {calendarDates.map(date => {
                        const reservationsForCell = getReservationsForRoomAndDate(room.id, date);
                        const mainReservation = reservationsForCell[0];

                        return (
                          <div
                            key={`${room.id}-${date.toISOString()}`}
                            className={`calendar-cell date-cell ${mainReservation ? 'occupied' : 'available'}
                                       ${mainReservation?.status === 'checked_in' ? 'checked-in' : ''}`}
                            onClick={() => {
                              if (mainReservation) {
                                setSelectedReservation(mainReservation);
                                setShowReservationDetailModal(true);
                              } else {
                                // Cellule vide : créer une nouvelle réservation avec chambre et date pré-remplies
                                setEditingReservation(null);
                                setNewReservation({
                                  client_id: null,
                                  guest_name: '',
                                  guest_email: '',
                                  guest_phone: '',
                                  guest_nationality: '',
                                  guest_id_number: '',
                                  room_id: room.id,
                                  check_in_date: date.toISOString().split('T')[0],
                                  check_out_date: '',
                                  adults_count: 2,
                                  children_count: 0,
                                  meal_plan_id: null,
                                  special_requests: '',
                                  deposit_amount: 0,
                                  source: 'direct'
                                });
                                setShowNewReservationModal(true);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {mainReservation && (
                              <div className={`reservation-bar status-${mainReservation.status}`}>
                                <span className="guest-name-short">{mainReservation.guest_name.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reservations' && (
          <div className="reservations-view">
            <div style={{marginBottom: '20px'}}>
              <input
                type="text"
                placeholder="🔍 Rechercher par numéro de réservation ou nom de client..."
                value={reservationSearch}
                onChange={(e) => setReservationSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: '14px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {(() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const activeReservations = reservations.filter(r =>
                r.status !== 'cancelled' && r.status !== 'checked_out'
              );

              const filteredReservations = activeReservations.filter(res => {
                if (!reservationSearch.trim()) return true;
                const search = reservationSearch.toLowerCase();
                return (
                  res.reservation_number?.toLowerCase().includes(search) ||
                  res.guest_name?.toLowerCase().includes(search) ||
                  res.clients?.first_name?.toLowerCase().includes(search) ||
                  res.clients?.last_name?.toLowerCase().includes(search) ||
                  res.clients?.company_name?.toLowerCase().includes(search)
                );
              });

              const todayReservations = filteredReservations.filter(res => {
                const checkInDate = new Date(res.check_in_date);
                checkInDate.setHours(0, 0, 0, 0);
                return checkInDate.getTime() === today.getTime();
              });

              const futureReservations = filteredReservations.filter(res => {
                const checkInDate = new Date(res.check_in_date);
                checkInDate.setHours(0, 0, 0, 0);
                return checkInDate.getTime() > today.getTime();
              });

              return (
                <>
                  {todayReservations.length > 0 && (
                    <div style={{marginBottom: '30px'}}>
                      <h3 style={{marginBottom: '15px', fontSize: '18px', fontWeight: '600', color: '#2196F3'}}>📅 Réservations du jour ({todayReservations.length})</h3>
                      <div className="reservations-grid">
                        {todayReservations.map(res => (
                <div key={res.id} className={`reservation-card status-${res.status}`}>
                  <div className="res-header">
                    <span className="res-number">{res.reservation_number}</span>
                    <span className={`res-status ${res.status}`}>
                      {res.status === 'pending' && '⏳ En attente'}
                      {res.status === 'confirmed' && '✓ Confirmée'}
                      {res.status === 'checked_in' && '🏨 Check-in'}
                    </span>
                  </div>
                  <div className="res-guest">
                    <strong>{res.guest_name}</strong>
                    <span>{res.guest_phone}</span>
                  </div>
                  <div className="res-details">
                    <div className="res-row">
                      <span>Chambre:</span>
                      <strong>{res.hotel_rooms?.room_number || 'Non assignée'}</strong>
                    </div>
                    <div className="res-row">
                      <span>Arrivée:</span>
                      <strong>{new Date(res.check_in_date).toLocaleDateString('fr-FR')}</strong>
                    </div>
                    <div className="res-row">
                      <span>Départ:</span>
                      <strong>{new Date(res.check_out_date).toLocaleDateString('fr-FR')}</strong>
                    </div>
                    <div className="res-row">
                      <span>Formule:</span>
                      <strong>{res.hotel_meal_plans?.name || 'Chambre Seule'}</strong>
                    </div>
                    <div className="res-row">
                      <span>Total:</span>
                      <strong>{res.total_amount?.toFixed(0) || 0} FCFA</strong>
                    </div>
                    <div className="res-row">
                      <span>Solde dû:</span>
                      <strong className={res.balance_due > 0 ? 'text-danger' : 'text-success'}>
                        {res.balance_due?.toFixed(0) || 0} FCFA
                      </strong>
                    </div>
                  </div>
                  <div className="res-actions">
                    {res.status === 'confirmed' && (
                      <button className="btn-checkin" onClick={() => handleCheckin(res)}>
                        Check-in
                      </button>
                    )}
                    <button className="btn-view" onClick={() => {
                      setSelectedReservation(res);
                      setShowReservationDetailModal(true);
                    }}>
                      Détails
                    </button>
                    {res.status === 'confirmed' && (
                      <>
                        <button className="btn-edit" onClick={() => {
                          setEditingReservation(res);
                          setNewReservation({
                            client_id: res.client_id,
                            guest_name: res.guest_name,
                            guest_email: res.guest_email || '',
                            guest_phone: res.guest_phone || '',
                            guest_nationality: res.guest_nationality || '',
                            guest_id_number: res.guest_id_number || '',
                            room_id: res.room_id,
                            check_in_date: res.check_in_date,
                            check_out_date: res.check_out_date,
                            adults_count: res.adults_count || 2,
                            children_count: res.children_count || 0,
                            meal_plan_id: res.meal_plan_id,
                            rate_type_id: res.rate_type_id,
                            special_requests: res.special_requests || '',
                            deposit_amount: res.deposit_amount || 0,
                            source: res.source || 'direct'
                          });
                          setShowNewReservationModal(true);
                        }} style={{backgroundColor: '#FF9800', color: 'white'}}>
                          Modifier
                        </button>
                        <button className="btn-cancel" onClick={() => handleCancelReservation(res)}>
                          Annuler
                        </button>
                      </>
                    )}
                  </div>
                </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {futureReservations.length > 0 && (
                    <div>
                      <h3 style={{marginBottom: '15px', fontSize: '18px', fontWeight: '600', color: '#666'}}>📆 Réservations futures ({futureReservations.length})</h3>
                      <div className="reservations-grid">
                        {futureReservations.map(res => {
                          const checkInDate = new Date(res.check_in_date);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          checkInDate.setHours(0, 0, 0, 0);
                          const isFuture = checkInDate > today;

                          return (
                            <div key={res.id} className={`reservation-card status-${res.status}`}>
                              <div className="res-header">
                                <span className="res-number">{res.reservation_number}</span>
                                <span className={`res-status ${res.status}`}>
                                  {res.status === 'pending' && '⏳ En attente'}
                                  {res.status === 'confirmed' && '✓ Confirmée'}
                                  {res.status === 'checked_in' && '🏨 Check-in'}
                                </span>
                              </div>
                              <div className="res-guest">
                                <strong>{res.guest_name}</strong>
                                <span>{res.guest_phone}</span>
                              </div>
                              <div className="res-details">
                                <div className="res-row">
                                  <span>Chambre:</span>
                                  <strong>{res.hotel_rooms?.room_number || 'Non assignée'}</strong>
                                </div>
                                <div className="res-row">
                                  <span>Arrivée:</span>
                                  <strong>{new Date(res.check_in_date).toLocaleDateString('fr-FR')}</strong>
                                </div>
                                <div className="res-row">
                                  <span>Départ:</span>
                                  <strong>{new Date(res.check_out_date).toLocaleDateString('fr-FR')}</strong>
                                </div>
                                <div className="res-row">
                                  <span>Formule:</span>
                                  <strong>{res.hotel_meal_plans?.name || 'Chambre Seule'}</strong>
                                </div>
                                <div className="res-row">
                                  <span>Total:</span>
                                  <strong>{res.total_amount?.toFixed(0) || 0} FCFA</strong>
                                </div>
                                <div className="res-row">
                                  <span>Solde dû:</span>
                                  <strong className={res.balance_due > 0 ? 'text-danger' : 'text-success'}>
                                    {res.balance_due?.toFixed(0) || 0} FCFA
                                  </strong>
                                </div>
                              </div>
                              <div className="res-actions">
                                {res.status === 'confirmed' && (
                                  <button
                                    className="btn-checkin"
                                    onClick={() => handleCheckin(res)}
                                    disabled={isFuture}
                                    style={{
                                      opacity: isFuture ? 0.5 : 1,
                                      cursor: isFuture ? 'not-allowed' : 'pointer',
                                      backgroundColor: isFuture ? '#ccc' : ''
                                    }}
                                    title={isFuture ? 'Check-in disponible le jour de l\'arrivée' : 'Effectuer le check-in'}
                                  >
                                    Check-in
                                  </button>
                                )}
                                <button className="btn-view" onClick={() => {
                                  setSelectedReservation(res);
                                  setShowReservationDetailModal(true);
                                }}>
                                  Détails
                                </button>
                                {res.status === 'confirmed' && (
                                  <>
                                    <button className="btn-edit" onClick={() => {
                                      setEditingReservation(res);
                                      setNewReservation({
                                        client_id: res.client_id,
                                        guest_name: res.guest_name,
                                        guest_email: res.guest_email || '',
                                        guest_phone: res.guest_phone || '',
                                        guest_nationality: res.guest_nationality || '',
                                        guest_id_number: res.guest_id_number || '',
                                        room_id: res.room_id,
                                        check_in_date: res.check_in_date,
                                        check_out_date: res.check_out_date,
                                        adults_count: res.adults_count || 2,
                                        children_count: res.children_count || 0,
                                        meal_plan_id: res.meal_plan_id,
                                        rate_type_id: res.rate_type_id,
                                        special_requests: res.special_requests || '',
                                        deposit_amount: res.deposit_amount || 0,
                                        source: res.source || 'direct'
                                      });
                                      setShowNewReservationModal(true);
                                    }} style={{backgroundColor: '#FF9800', color: 'white'}}>
                                      Modifier
                                    </button>
                                    <button className="btn-cancel" onClick={() => handleCancelReservation(res)}>
                                      Annuler
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {filteredReservations.length === 0 && (
                    <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                      {reservationSearch ? '🔍 Aucune réservation ne correspond à votre recherche' : '📭 Aucune réservation active'}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'stays' && (
          <div className="stays-view">
            <div className="stays-grid">
              {stays.map(stay => (
                <div key={stay.id} className="stay-card">
                  <div className="stay-header">
                    <span className="stay-room">Chambre {stay.hotel_rooms?.room_number}</span>
                    <span className={`stay-room-type ${stay.hotel_rooms?.room_type}`}>
                      {stay.hotel_rooms?.room_type === 'suite' ? '👑 Suite' : '🛏️ Simple'}
                    </span>
                  </div>
                  <div className="stay-guest">
                    <strong>{stay.guest_name}</strong>
                  </div>
                  <div className="stay-details">
                    <div className="stay-row">
                      <span>Check-in:</span>
                      <strong>{new Date(stay.check_in_date).toLocaleDateString('fr-FR')}</strong>
                    </div>
                    <div className="stay-row">
                      <span>Check-out prévu:</span>
                      <strong>{new Date(stay.check_out_date).toLocaleDateString('fr-FR')}</strong>
                    </div>
                    <div className="stay-row">
                      <span>Formule:</span>
                      <strong>{stay.hotel_meal_plans?.name || 'Chambre Seule'}</strong>
                    </div>
                    <div className="stay-row">
                      <span>Nuits effectuées:</span>
                      <strong>{stay.nights_stayed || 0} nuit(s) × {(stay.hotel_reservations?.room_price_per_night || 100).toFixed(0)} FCFA</strong>
                    </div>
                    <div className="stay-row">
                      <span>Charges chambre:</span>
                      <strong className="amount">{(stay.calculated_room_charges || 0).toFixed(0)} FCFA</strong>
                    </div>
                    <div className="stay-row">
                      <span>Charges restaurant:</span>
                      <strong className="amount">{(stay.calculated_restaurant_charges || 0).toFixed(0)} FCFA</strong>
                    </div>
                    <div className="stay-row">
                      <span>Total charges:</span>
                      <strong className="amount-total">{(stay.calculated_total_charges || 0).toFixed(0)} FCFA</strong>
                    </div>
                  </div>
                  <div className="stay-actions">
                    <button className="btn-checkout" onClick={() => handleCheckout(stay)}>
                      Check-out
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rates' && (
          <RatesManagementTab
            rateTypes={rateTypes}
            mealPlans={mealPlans}
            onRateTypeEdit={setEditingRateType}
            onMealPlanEdit={setEditingMealPlan}
            onReload={loadData}
          />
        )}

        {activeTab === 'reports' && (
          <div className="reports-view">
            <h2 style={{marginBottom: '20px', fontSize: '24px'}}>📊 Rapports Hôtel</h2>

            <div className="report-section">
              <h3 style={{marginBottom: '15px', fontSize: '18px', fontWeight: '600'}}>💰 Paiements Reçus</h3>

              {hotelPayments.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px', color: '#999'}}>
                  Aucun paiement enregistré
                </div>
              ) : (
                <div className="payments-table-container">
                  <table className="payments-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Client</th>
                        <th>Chambre</th>
                        <th>Type</th>
                        <th>Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hotelPayments.map(payment => (
                        <tr key={payment.id}>
                          <td>{new Date(payment.created_at).toLocaleString('fr-FR')}</td>
                          <td>{payment.hotel_stays?.guest_name || 'N/A'}</td>
                          <td>Chambre {payment.hotel_stays?.hotel_rooms?.room_number || 'N/A'}</td>
                          <td>
                            {payment.payment_type === 'cash' && '💵 Espèces'}
                            {payment.payment_type === 'orange_money' && '🟠 Orange Money'}
                            {payment.payment_type === 'wave' && '🌊 Wave'}
                            {payment.payment_type === 'card' && '💳 Carte'}
                            {payment.payment_type === 'client_account' && '👤 Compte Client'}
                          </td>
                          <td style={{fontWeight: 'bold', color: '#4CAF50'}}>
                            {parseFloat(payment.amount).toFixed(0)} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" style={{textAlign: 'right', fontWeight: 'bold'}}>TOTAL:</td>
                        <td style={{fontWeight: 'bold', color: '#4CAF50', fontSize: '18px'}}>
                          {hotelPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(0)} FCFA
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewReservationModal && (
        <NewReservationModal
          clients={clients}
          rooms={rooms}
          reservations={reservations}
          stays={stays}
          mealPlans={mealPlans}
          rateTypes={rateTypes}
          newReservation={newReservation}
          setNewReservation={setNewReservation}
          onSave={handleCreateReservation}
          onClose={() => {
            setShowNewReservationModal(false);
            setEditingReservation(null);
          }}
          editingReservation={editingReservation}
        />
      )}

      {showCheckinModal && selectedReservation && (
        <CheckinModal
          reservation={selectedReservation}
          onConfirm={confirmCheckin}
          onClose={() => {
            setShowCheckinModal(false);
            setSelectedReservation(null);
          }}
        />
      )}

      {showCheckoutModal && selectedStay && (
        <CheckoutModal
          stay={selectedStay}
          onConfirm={confirmCheckout}
          onClose={() => {
            setShowCheckoutModal(false);
            setSelectedStay(null);
          }}
        />
      )}

      {showReservationDetailModal && selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => {
            setShowReservationDetailModal(false);
            setSelectedReservation(null);
          }}
          onEdit={() => {
            setEditingReservation(selectedReservation);
            setNewReservation({
              client_id: selectedReservation.client_id,
              guest_name: selectedReservation.guest_name,
              guest_email: selectedReservation.guest_email || '',
              guest_phone: selectedReservation.guest_phone || '',
              guest_nationality: selectedReservation.guest_nationality || '',
              guest_id_number: selectedReservation.guest_id_number || '',
              room_id: selectedReservation.room_id,
              check_in_date: selectedReservation.check_in_date,
              check_out_date: selectedReservation.check_out_date,
              adults_count: selectedReservation.adults_count || 2,
              children_count: selectedReservation.children_count || 0,
              meal_plan_id: selectedReservation.meal_plan_id,
              rate_type_id: selectedReservation.rate_type_id,
              special_requests: selectedReservation.special_requests || '',
              deposit_amount: selectedReservation.deposit_amount || 0,
              source: selectedReservation.source || 'direct'
            });
            setShowReservationDetailModal(false);
            setShowNewReservationModal(true);
          }}
        />
      )}
    </div>
  );
}

function NewReservationModal({ clients, rooms, reservations, stays, mealPlans, rateTypes, newReservation, setNewReservation, onSave, onClose, editingReservation }) {
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isUnregisteredGuest, setIsUnregisteredGuest] = useState(false);

  console.log('Modal received props:', {
    mealPlansCount: mealPlans?.length,
    mealPlans,
    rateTypesCount: rateTypes?.length
  });

  const selectedRoom = rooms?.find(r => r.id === newReservation.room_id);
  const filteredRateTypes = rateTypes?.filter(rt => !rt.room_type || rt.room_type === selectedRoom?.room_type) || [];
  const [newClient, setNewClient] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    nationality: '',
    type: 'individual'
  });

  const filteredClients = clients.filter(c => {
    const search = clientSearch.toLowerCase();
    return (c.first_name?.toLowerCase().includes(search) ||
            c.last_name?.toLowerCase().includes(search) ||
            c.company_name?.toLowerCase().includes(search) ||
            c.phone?.toLowerCase().includes(search));
  });

  const handleCreateNewClient = async () => {
    try {
      if (!newClient.first_name || !newClient.last_name) {
        alert('Le prénom et le nom sont obligatoires');
        return;
      }

      const { data, error } = await supabase.from('clients').insert([{
        ...newClient,
        credit_limit: 0,
        current_balance: 0,
        is_active: true
      }]).select().single();

      if (error) throw error;

      setSelectedClient(data);
      setNewReservation({
        ...newReservation,
        client_id: data.id,
        guest_name: `${data.first_name} ${data.last_name}`,
        guest_email: data.email || '',
        guest_phone: data.phone || '',
        guest_nationality: data.nationality || ''
      });

      setShowNewClientForm(false);
      setNewClient({ first_name: '', last_name: '', email: '', phone: '', nationality: '', type: 'individual' });
      alert('Client créé avec succès !');

      window.location.reload();
    } catch (error) {
      console.error('Erreur création client:', error);
      alert('Erreur lors de la création du client');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal large-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingReservation ? '✏️ Modifier la Réservation' : '📋 Nouvelle Réservation'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-section">
            <h3>👤 Client Existant</h3>
            <input
              type="text"
              placeholder="Rechercher un client par nom, prénom ou téléphone..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="form-input"
            />
            {clientSearch && filteredClients.length > 0 && (
              <div className="client-suggestions">
                {filteredClients.slice(0, 5).map(client => (
                  <div
                    key={client.id}
                    className="client-suggestion-item"
                    onClick={() => {
                      setSelectedClient(client);
                      const displayName = client.type === 'company'
                        ? client.company_name
                        : `${client.first_name} ${client.last_name}`;
                      setNewReservation({
                        ...newReservation,
                        client_id: client.id,
                        guest_name: displayName,
                        guest_email: client.email || '',
                        guest_phone: client.phone || '',
                        guest_nationality: client.nationality || ''
                      });
                      setClientSearch('');
                    }}
                  >
                    <strong>
                      {client.type === 'company'
                        ? `🏢 ${client.company_name}`
                        : `${client.first_name} ${client.last_name}`}
                    </strong>
                    <span>{client.phone}</span>
                    {client.nationality && <span>🌍 {client.nationality}</span>}
                    <span className={client.current_balance < 0 ? 'text-danger' : 'text-success'}>
                      {client.current_balance?.toFixed(0)} FCFA
                    </span>
                  </div>
                ))}
              </div>
            )}
            {selectedClient && (
              <div className="selected-client-info">
                ✓ Client sélectionné: {selectedClient.type === 'company'
                  ? `🏢 ${selectedClient.company_name}`
                  : `${selectedClient.first_name} ${selectedClient.last_name}`}
                <button
                  style={{marginLeft: '10px', fontSize: '12px'}}
                  onClick={() => {
                    setSelectedClient(null);
                    setNewReservation({...newReservation, client_id: null});
                  }}
                >
                  Changer
                </button>
              </div>
            )}

            {!selectedClient && !showNewClientForm && (
              <>
                <button
                  className="btn-secondary"
                  style={{marginTop: '10px'}}
                  onClick={() => setShowNewClientForm(true)}
                >
                  + Créer un nouveau client
                </button>

                <div style={{marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '6px'}}>
                  <label style={{display: 'flex', alignItems: 'center', cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={isUnregisteredGuest}
                      onChange={(e) => {
                        setIsUnregisteredGuest(e.target.checked);
                        if (e.target.checked) {
                          setNewReservation({...newReservation, client_id: null});
                        }
                      }}
                      style={{marginRight: '8px'}}
                    />
                    <strong>📋 Client non enregistré (passage unique)</strong>
                  </label>
                  <small style={{display: 'block', marginTop: '5px', color: '#666', marginLeft: '24px'}}>
                    Le client ne sera pas ajouté dans la base de données
                  </small>
                </div>
              </>
            )}

            {showNewClientForm && (
              <div className="new-client-form" style={{marginTop: '15px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px'}}>
                <h4>Nouveau Client</h4>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Prénom *"
                    value={newClient.first_name}
                    onChange={(e) => setNewClient({...newClient, first_name: e.target.value})}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Nom *"
                    value={newClient.last_name}
                    onChange={(e) => setNewClient({...newClient, last_name: e.target.value})}
                    className="form-input"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  className="form-input"
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Nationalité (optionnel)"
                  value={newClient.nationality}
                  onChange={(e) => setNewClient({...newClient, nationality: e.target.value})}
                  className="form-input"
                />
                <div className="form-row" style={{marginTop: '10px'}}>
                  <button className="btn-cancel" onClick={() => {
                    setShowNewClientForm(false);
                    setNewClient({ first_name: '', last_name: '', email: '', phone: '', nationality: '', type: 'individual' });
                  }}>
                    Annuler
                  </button>
                  <button className="btn-save" onClick={handleCreateNewClient}>
                    Créer et sélectionner
                  </button>
                </div>
              </div>
            )}
          </div>

          {isUnregisteredGuest && (
            <div className="form-section">
              <h3>📝 Informations Client (non enregistré)</h3>
              <label className="form-label">Nom complet *</label>
              <input
                type="text"
                placeholder="Nom complet du client"
                value={newReservation.guest_name}
                onChange={(e) => setNewReservation({...newReservation, guest_name: e.target.value})}
                className="form-input"
                required
              />
              <label className="form-label">Email</label>
              <input
                type="email"
                placeholder="Email du client"
                value={newReservation.guest_email}
                onChange={(e) => setNewReservation({...newReservation, guest_email: e.target.value})}
                className="form-input"
              />
              <label className="form-label">Téléphone</label>
              <input
                type="tel"
                placeholder="Numéro de téléphone"
                value={newReservation.guest_phone}
                onChange={(e) => setNewReservation({...newReservation, guest_phone: e.target.value})}
                className="form-input"
              />
              <label className="form-label">Nationalité</label>
              <input
                type="text"
                placeholder="Nationalité"
                value={newReservation.guest_nationality}
                onChange={(e) => setNewReservation({...newReservation, guest_nationality: e.target.value})}
                className="form-input"
              />
              <label className="form-label">Numéro pièce d'identité</label>
              <input
                type="text"
                placeholder="Carte d'identité / Passeport"
                value={newReservation.guest_id_number}
                onChange={(e) => setNewReservation({...newReservation, guest_id_number: e.target.value})}
                className="form-input"
              />
            </div>
          )}

          <div className="form-section">
            <h3>🏨 Détails du Séjour</h3>
            <label className="form-label">Chambre *</label>
            <select
              value={newReservation.room_id || ''}
              onChange={(e) => setNewReservation({...newReservation, room_id: e.target.value})}
              className="form-input"
              required
            >
              <option value="">Sélectionner une chambre *</option>
              {rooms && rooms.map(room => {
                // Vérifier si la chambre est occupée (séjour actif)
                const activeStay = stays?.find(s => s.room_id === room.id && s.status === 'active');

                // Trouver la prochaine réservation confirmée pour cette chambre
                const nextReservation = reservations && reservations.length > 0
                  ? reservations
                      .filter(r => r.room_id === room.id && r.status === 'confirmed')
                      .sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date))[0]
                  : null;

                let displayText = `Chambre ${room.room_number} - ${room.room_type === 'suite' ? '👑 Suite' : '🛏️ Simple'} (${room.max_occupancy} pers.)`;

                if (activeStay) {
                  const checkOutDate = new Date(activeStay.check_out_date);
                  displayText += ` - 🔴 OCCUPÉE jusqu'au ${checkOutDate.toLocaleDateString('fr-FR')} par ${activeStay.guest_name}`;
                } else if (nextReservation) {
                  const clientName = nextReservation.clients
                    ? (nextReservation.clients.company_name || `${nextReservation.clients.first_name} ${nextReservation.clients.last_name}`)
                    : nextReservation.guest_name;

                  const checkInDate = new Date(nextReservation.check_in_date);
                  const checkOutDate = new Date(nextReservation.check_out_date);
                  displayText += ` - 🟡 RÉSERVÉE du ${checkInDate.toLocaleDateString('fr-FR')} au ${checkOutDate.toLocaleDateString('fr-FR')} par ${clientName}`;
                } else if (room.status === 'available') {
                  displayText += ' - 🟢 DISPONIBLE';
                } else if (room.status === 'occupied') {
                  displayText += ' - 🔴 OCCUPÉE';
                }

                return (
                  <option key={room.id} value={room.id}>
                    {displayText}
                  </option>
                );
              })}
            </select>

            <label className="form-label">Dates du séjour *</label>
            {newReservation.room_id && (() => {
              const roomReservations = reservations.filter(r =>
                r.room_id === newReservation.room_id &&
                ['confirmed', 'checked_in'].includes(r.status)
              ).sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date));

              const roomStays = stays?.filter(s => s.room_id === newReservation.room_id && s.status === 'active') || [];

              const allOccupations = [
                ...roomReservations.map(r => ({
                  start: new Date(r.check_in_date),
                  end: new Date(r.check_out_date),
                  type: r.status === 'checked_in' ? 'Occupée' : 'Réservée',
                  guest: r.guest_name
                })),
                ...roomStays.map(s => ({
                  start: new Date(s.check_in_date),
                  end: new Date(s.check_out_date),
                  type: 'Occupée',
                  guest: s.guest_name
                }))
              ].sort((a, b) => a.start - b.start);

              if (allOccupations.length > 0) {
                return (
                  <div style={{padding: '10px', backgroundColor: '#fff3cd', borderRadius: '6px', marginBottom: '10px', fontSize: '13px'}}>
                    <strong>⚠️ Périodes déjà réservées pour cette chambre :</strong>
                    <ul style={{marginTop: '5px', marginBottom: '0'}}>
                      {allOccupations.map((occ, idx) => (
                        <li key={idx}>
                          Du {occ.start.toLocaleDateString('fr-FR')} au {occ.end.toLocaleDateString('fr-FR')}
                          {occ.type === 'Occupée' ? ' (🔴 Occupée)' : ' (🟡 Réservée)'} - {occ.guest}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}

            {newReservation.room_id && (
              <DateRangePicker
                checkInDate={newReservation.check_in_date}
                checkOutDate={newReservation.check_out_date}
                onCheckInChange={(date) => setNewReservation(prev => ({...prev, check_in_date: date}))}
                onCheckOutChange={(date) => setNewReservation(prev => ({...prev, check_out_date: date}))}
                blockedDates={(() => {
                  // Filtrer les réservations pour cette chambre (en excluant celle en cours d'édition)
                  const roomReservations = reservations.filter(r =>
                    r.room_id === newReservation.room_id &&
                    ['confirmed', 'checked_in'].includes(r.status) &&
                    (!editingReservation || r.id !== editingReservation.id) // Exclure la réservation en cours d'édition
                  );
                  const roomStays = stays?.filter(s => s.room_id === newReservation.room_id && s.status === 'active') || [];

                  return [
                    ...roomReservations.map(r => ({
                      start: r.check_in_date,
                      end: r.check_out_date
                    })),
                    ...roomStays.map(s => ({
                      start: s.check_in_date,
                      end: s.check_out_date
                    }))
                  ];
                })()}
              />
            )}

            {!newReservation.room_id && (
              <div style={{padding: '20px', textAlign: 'center', color: '#666', background: '#f8f9fa', borderRadius: '6px', marginBottom: '15px'}}>
                👆 Veuillez d'abord sélectionner une chambre pour choisir les dates
              </div>
            )}

            <label className="form-label">Nombre de personnes</label>
            <div className="form-row">
              <div style={{flex: 1}}>
                <small style={{color: '#666'}}>Adultes</small>
                <input
                  type="number"
                  value={newReservation.adults_count}
                  onChange={(e) => setNewReservation({...newReservation, adults_count: parseInt(e.target.value)})}
                  className="form-input"
                  min="1"
                />
              </div>
              <div style={{flex: 1}}>
                <small style={{color: '#666'}}>Enfants</small>
                <input
                  type="number"
                  value={newReservation.children_count}
                  onChange={(e) => setNewReservation({...newReservation, children_count: parseInt(e.target.value)})}
                  className="form-input"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>💰 Tarification</h3>
            <label className="form-label">Type de tarif *</label>
            <select
              value={newReservation.rate_type_id || ''}
              onChange={(e) => setNewReservation({...newReservation, rate_type_id: e.target.value || null})}
              className="form-input"
              required
              disabled={!newReservation.room_id}
            >
              <option value="">{!newReservation.room_id ? 'Sélectionner d\'abord une chambre' : 'Sélectionner un tarif *'}</option>
              {filteredRateTypes.map(rate => (
                <option key={rate.id} value={rate.id}>
                  {rate.name} - {parseFloat(rate.base_price).toFixed(0)} FCFA/nuit
                </option>
              ))}
            </select>

            <label className="form-label">Formule repas</label>
            <select
              value={newReservation.meal_plan_id || ''}
              onChange={(e) => setNewReservation({...newReservation, meal_plan_id: e.target.value || null})}
              className="form-input"
            >
              <option value="">Chambre Seule (sans repas)</option>
              {(mealPlans || []).filter(p => p.code !== 'RO').map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} (+{parseFloat(plan.price_adult).toFixed(0)} FCFA/adulte, +{parseFloat(plan.price_child).toFixed(0)} FCFA/enfant par nuit)
                </option>
              ))}
            </select>

            <label className="form-label">Acompte versé (FCFA)</label>
            <input
              type="number"
              placeholder="0"
              value={newReservation.deposit_amount}
              onChange={(e) => setNewReservation({...newReservation, deposit_amount: parseFloat(e.target.value) || 0})}
              className="form-input"
              min="0"
            />
          </div>

          <div className="form-section">
            <h3>📋 Informations Complémentaires</h3>
            <label className="form-label">Source de réservation</label>
            <select
              value={newReservation.source}
              onChange={(e) => setNewReservation({...newReservation, source: e.target.value})}
              className="form-input"
            >
              <option value="direct">Directe (sur place)</option>
              <option value="phone">Téléphone</option>
              <option value="email">Email</option>
              <option value="website">Site web</option>
              <option value="booking">Booking.com</option>
              <option value="expedia">Expedia</option>
              <option value="other">Autre</option>
            </select>

            <label className="form-label">Demandes spéciales</label>
            <textarea
              placeholder="Toute demande particulière du client..."
              value={newReservation.special_requests}
              onChange={(e) => setNewReservation({...newReservation, special_requests: e.target.value})}
              className="form-input"
              rows="3"
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={onSave}>Créer la réservation</button>
        </div>
      </div>
    </div>
  );
}

function CheckinModal({ reservation, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Check-in</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="checkin-summary">
            <p><strong>Client:</strong> {reservation.guest_name}</p>
            <p><strong>Chambre:</strong> {reservation.hotel_rooms?.room_number}</p>
            <p><strong>Formule:</strong> {reservation.hotel_meal_plans?.name || 'Chambre Seule'}</p>
            <p><strong>Départ prévu:</strong> {new Date(reservation.check_out_date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Solde dû:</strong> <span className="amount-highlight">{reservation.balance_due?.toFixed(0)} FCFA</span></p>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button className="btn-save" onClick={onConfirm}>Confirmer le Check-in</button>
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({ stay, onConfirm, onClose }) {
  const [payments, setPayments] = useState([
    { type: 'cash', label: 'Espèces', icon: '💵', amount: 0 },
    { type: 'orange_money', label: 'Orange Money', icon: '🟠', amount: 0 },
    { type: 'wave', label: 'Wave', icon: '🌊', amount: 0 },
    { type: 'card', label: 'Carte Bleue', icon: '💳', amount: 0 },
    { type: 'client_account', label: 'Compte Client', icon: '👤', amount: 0 }
  ]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('first_name');
    setClients(data || []);
  };

  const filteredClients = clients.filter(c => {
    const search = clientSearch.toLowerCase();
    return (c.first_name?.toLowerCase().includes(search) ||
            c.last_name?.toLowerCase().includes(search) ||
            c.company_name?.toLowerCase().includes(search) ||
            c.phone?.toLowerCase().includes(search));
  });

  const totalCharges = stay.calculated_total_charges || stay.total_charges || 0;
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Check-out</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="checkout-summary">
            <p><strong>Client:</strong> {stay.guest_name}</p>
            <p><strong>Chambre:</strong> {stay.hotel_rooms?.room_number}</p>
            <p><strong>Nuits effectuées:</strong> {stay.nights_stayed || 0} × {(stay.hotel_reservations?.room_price_per_night || 100).toFixed(0)} FCFA</p>
            <p><strong>Charges chambre:</strong> {(stay.calculated_room_charges || 0).toFixed(0)} FCFA</p>
            <p><strong>Charges restaurant:</strong> {(stay.calculated_restaurant_charges || 0).toFixed(0)} FCFA</p>
            <p><strong>Autres charges:</strong> {(stay.other_charges || 0).toFixed(0)} FCFA</p>
            <p className="total-line"><strong>Total à payer:</strong> <span className="amount-highlight">{totalCharges.toFixed(0)} FCFA</span></p>
          </div>

          <div className="payment-section">
            <h3>Paiements</h3>
            {payments.map((payment, index) => (
              <div key={index}>
                <div className="payment-row">
                  <label>
                    {payment.icon} {payment.label}
                  </label>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => {
                      const newPayments = [...payments];
                      newPayments[index].amount = parseFloat(e.target.value) || 0;
                      setPayments(newPayments);
                    }}
                    className="form-input"
                    min="0"
                  />
                </div>
                {payment.type === 'client_account' && payment.amount > 0 && (
                  <div className="client-selection-inline">
                    <input
                      type="text"
                      placeholder="Rechercher un client..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="form-input"
                    />
                    {clientSearch && filteredClients.length > 0 && (
                      <div className="client-suggestions">
                        {filteredClients.slice(0, 5).map(client => (
                          <div
                            key={client.id}
                            className="client-suggestion-item"
                            onClick={() => {
                              setSelectedClient(client);
                              setClientSearch('');
                            }}
                          >
                            <strong>{client.first_name} {client.last_name}</strong>
                            <span>{client.phone}</span>
                            <span className={client.current_balance < 0 ? 'text-danger' : 'text-success'}>
                              {client.current_balance?.toFixed(0)} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedClient && (
                      <div className="selected-client-info">
                        ✓ Client: {selectedClient.first_name} {selectedClient.last_name} - Solde: {selectedClient.current_balance?.toFixed(0)} FCFA
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="payment-total">
              <strong>Total payé:</strong>
              <strong className={totalPaid >= totalCharges ? 'text-success' : 'text-danger'}>
                {totalPaid.toFixed(0)} FCFA
              </strong>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
          <button
            className="btn-save"
            onClick={() => onConfirm({ payments, clientId: selectedClient?.id })}
            disabled={totalPaid < totalCharges || (payments.find(p => p.type === 'client_account' && p.amount > 0) && !selectedClient)}
          >
            Confirmer le Check-out
          </button>
        </div>
      </div>
    </div>
  );
}

function ReservationDetailModal({ reservation, onClose, onEdit }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Détails de la réservation</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <h3>Réservation {reservation.reservation_number}</h3>
            <p><strong>Statut:</strong>
              <span className={`status-badge ${reservation.status}`}>
                {reservation.status === 'confirmed' && '✓ Confirmée'}
                {reservation.status === 'checked_in' && '🏨 Check-in effectué'}
                {reservation.status === 'pending' && '⏳ En attente'}
              </span>
            </p>
            <p><strong>Source:</strong> {reservation.source}</p>
          </div>

          <div className="detail-section">
            <h3>Client</h3>
            <p><strong>Nom:</strong> {reservation.guest_name}</p>
            <p><strong>Email:</strong> {reservation.guest_email || '-'}</p>
            <p><strong>Téléphone:</strong> {reservation.guest_phone || '-'}</p>
            {reservation.clients && (
              <>
                <p><strong>Solde compte:</strong>
                  <span className={reservation.clients.current_balance < 0 ? 'text-danger' : 'text-success'}>
                    {reservation.clients.current_balance?.toFixed(0)} FCFA
                  </span>
                </p>
                <p><strong>Limite crédit:</strong> {reservation.clients.credit_limit?.toFixed(0)} FCFA</p>
              </>
            )}
          </div>

          <div className="detail-section">
            <h3>Séjour</h3>
            <p><strong>Chambre:</strong> {reservation.hotel_rooms?.room_number}</p>
            <p><strong>Arrivée:</strong> {new Date(reservation.check_in_date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Départ:</strong> {new Date(reservation.check_out_date).toLocaleDateString('fr-FR')}</p>
            <p><strong>Nuits:</strong> {reservation.nights_count}</p>
            <p><strong>Adultes:</strong> {reservation.adults_count} / <strong>Enfants:</strong> {reservation.children_count}</p>
            <p><strong>Formule:</strong> {reservation.hotel_meal_plans?.name || 'Chambre Seule'}</p>
          </div>

          <div className="detail-section">
            <h3>Facturation</h3>
            <p><strong>Tarif chambre/nuit:</strong> {reservation.room_price_per_night?.toFixed(0)} FCFA</p>
            <p><strong>Tarif formule/nuit:</strong> {reservation.meal_plan_price?.toFixed(0)} FCFA</p>
            <p><strong>Total:</strong> {reservation.total_amount?.toFixed(0)} FCFA</p>
            <p><strong>Acompte:</strong> {reservation.deposit_amount?.toFixed(0)} FCFA</p>
            <p><strong>Solde dû:</strong>
              <span className={reservation.balance_due > 0 ? 'text-danger' : 'text-success'}>
                {reservation.balance_due?.toFixed(0)} FCFA
              </span>
            </p>
          </div>

          {reservation.special_requests && (
            <div className="detail-section">
              <h3>Demandes spéciales</h3>
              <p>{reservation.special_requests}</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Fermer</button>
          {reservation.status === 'confirmed' && (
            <button
              className="btn-primary"
              onClick={onEdit}
              style={{backgroundColor: '#FF9800'}}
            >
              ✏️ Modifier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RatesManagementTab({ rateTypes, mealPlans, onRateTypeEdit, onMealPlanEdit, onReload }) {
  const [editingRate, setEditingRate] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);

  const handleSaveRateType = async (rate) => {
    try {
      const { error } = await supabase
        .from('hotel_rate_types')
        .update({
          name: rate.name,
          description: rate.description,
          base_price: rate.base_price,
          active: rate.active
        })
        .eq('id', rate.id);

      if (error) throw error;

      setEditingRate(null);
      onReload();
      alert('✅ Tarif modifié avec succès !');
    } catch (error) {
      console.error('Erreur modification tarif:', error);
      alert('❌ Erreur lors de la modification du tarif');
    }
  };

  const handleSaveMealPlan = async (meal) => {
    try {
      const { error } = await supabase
        .from('hotel_meal_plans')
        .update({
          name: meal.name,
          description: meal.description,
          price_adult: meal.price_adult,
          price_child: meal.price_child,
          active: meal.active
        })
        .eq('id', meal.id);

      if (error) throw error;

      setEditingMeal(null);
      onReload();
      alert('✅ Formule repas modifiée avec succès !');
    } catch (error) {
      console.error('Erreur modification formule:', error);
      alert('❌ Erreur lors de la modification de la formule');
    }
  };

  const simpleRates = rateTypes.filter(r => r.room_type === 'simple');
  const suiteRates = rateTypes.filter(r => r.room_type === 'suite');

  return (
    <div className="rates-view" style={{padding: '20px'}}>
      <div style={{marginBottom: '40px'}}>
        <h2 style={{marginBottom: '20px', fontSize: '24px', fontWeight: '600'}}>💰 Tarifs des Chambres</h2>

        <div style={{marginBottom: '30px'}}>
          <h3 style={{marginBottom: '15px', fontSize: '18px', color: '#2196F3'}}>🛏️ Chambres Simples</h3>
          <div className="rates-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px'}}>
            {simpleRates.map(rate => (
              <div key={rate.id} style={{
                padding: '20px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fff'
              }}>
                {editingRate?.id === rate.id ? (
                  <>
                    <input
                      type="text"
                      value={editingRate.name}
                      onChange={(e) => setEditingRate({...editingRate, name: e.target.value})}
                      style={{width: '100%', padding: '8px', marginBottom: '10px', fontSize: '16px', fontWeight: '600'}}
                    />
                    <textarea
                      value={editingRate.description}
                      onChange={(e) => setEditingRate({...editingRate, description: e.target.value})}
                      style={{width: '100%', padding: '8px', marginBottom: '10px', fontSize: '14px'}}
                      rows="2"
                    />
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                      <input
                        type="number"
                        value={editingRate.base_price}
                        onChange={(e) => setEditingRate({...editingRate, base_price: e.target.value})}
                        style={{flex: 1, padding: '8px', fontSize: '18px', fontWeight: '600'}}
                        step="0.01"
                      />
                      <span style={{fontSize: '16px', fontWeight: '600'}}>FCFA/nuit</span>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button onClick={() => handleSaveRateType(editingRate)} style={{
                        flex: 1, padding: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                      }}>Enregistrer</button>
                      <button onClick={() => setEditingRate(null)} style={{
                        flex: 1, padding: '8px', backgroundColor: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer'
                      }}>Annuler</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 style={{marginBottom: '8px', fontSize: '16px', fontWeight: '600'}}>{rate.name}</h4>
                    <p style={{fontSize: '13px', color: '#666', marginBottom: '15px'}}>{rate.description}</p>
                    <div style={{fontSize: '24px', fontWeight: '700', color: '#2196F3', marginBottom: '15px'}}>
                      {parseFloat(rate.base_price).toFixed(0)} FCFA<span style={{fontSize: '14px', fontWeight: '400', color: '#666'}}>/nuit</span>
                    </div>
                    <button onClick={() => setEditingRate(rate)} style={{
                      width: '100%', padding: '8px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}>✏️ Modifier</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{marginBottom: '15px', fontSize: '18px', color: '#FF9800'}}>👑 Suites</h3>
          <div className="rates-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px'}}>
            {suiteRates.map(rate => (
              <div key={rate.id} style={{
                padding: '20px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                backgroundColor: '#fff'
              }}>
                {editingRate?.id === rate.id ? (
                  <>
                    <input
                      type="text"
                      value={editingRate.name}
                      onChange={(e) => setEditingRate({...editingRate, name: e.target.value})}
                      style={{width: '100%', padding: '8px', marginBottom: '10px', fontSize: '16px', fontWeight: '600'}}
                    />
                    <textarea
                      value={editingRate.description}
                      onChange={(e) => setEditingRate({...editingRate, description: e.target.value})}
                      style={{width: '100%', padding: '8px', marginBottom: '10px', fontSize: '14px'}}
                      rows="2"
                    />
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                      <input
                        type="number"
                        value={editingRate.base_price}
                        onChange={(e) => setEditingRate({...editingRate, base_price: e.target.value})}
                        style={{flex: 1, padding: '8px', fontSize: '18px', fontWeight: '600'}}
                        step="0.01"
                      />
                      <span style={{fontSize: '16px', fontWeight: '600'}}>FCFA/nuit</span>
                    </div>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button onClick={() => handleSaveRateType(editingRate)} style={{
                        flex: 1, padding: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                      }}>Enregistrer</button>
                      <button onClick={() => setEditingRate(null)} style={{
                        flex: 1, padding: '8px', backgroundColor: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer'
                      }}>Annuler</button>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 style={{marginBottom: '8px', fontSize: '16px', fontWeight: '600'}}>{rate.name}</h4>
                    <p style={{fontSize: '13px', color: '#666', marginBottom: '15px'}}>{rate.description}</p>
                    <div style={{fontSize: '24px', fontWeight: '700', color: '#FF9800', marginBottom: '15px'}}>
                      {parseFloat(rate.base_price).toFixed(0)} FCFA<span style={{fontSize: '14px', fontWeight: '400', color: '#666'}}>/nuit</span>
                    </div>
                    <button onClick={() => setEditingRate(rate)} style={{
                      width: '100%', padding: '8px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}>✏️ Modifier</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 style={{marginBottom: '20px', fontSize: '24px', fontWeight: '600'}}>🍽️ Formules Repas</h2>
        <div className="rates-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px'}}>
          {mealPlans.filter(m => m.code !== 'RO').map(meal => (
            <div key={meal.id} style={{
              padding: '20px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: '#fff'
            }}>
              {editingMeal?.id === meal.id ? (
                <>
                  <input
                    type="text"
                    value={editingMeal.name}
                    onChange={(e) => setEditingMeal({...editingMeal, name: e.target.value})}
                    style={{width: '100%', padding: '8px', marginBottom: '10px', fontSize: '16px', fontWeight: '600'}}
                  />
                  <textarea
                    value={editingMeal.description}
                    onChange={(e) => setEditingMeal({...editingMeal, description: e.target.value})}
                    style={{width: '100%', padding: '8px', marginBottom: '10px', fontSize: '14px'}}
                    rows="2"
                  />
                  <div style={{marginBottom: '10px'}}>
                    <label style={{display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px'}}>Prix Adulte (FCFA/nuit)</label>
                    <input
                      type="number"
                      value={editingMeal.price_adult}
                      onChange={(e) => setEditingMeal({...editingMeal, price_adult: e.target.value})}
                      style={{width: '100%', padding: '8px', fontSize: '16px'}}
                      step="0.01"
                    />
                  </div>
                  <div style={{marginBottom: '10px'}}>
                    <label style={{display: 'block', fontSize: '12px', color: '#666', marginBottom: '5px'}}>Prix Enfant (FCFA/nuit)</label>
                    <input
                      type="number"
                      value={editingMeal.price_child}
                      onChange={(e) => setEditingMeal({...editingMeal, price_child: e.target.value})}
                      style={{width: '100%', padding: '8px', fontSize: '16px'}}
                      step="0.01"
                    />
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={() => handleSaveMealPlan(editingMeal)} style={{
                      flex: 1, padding: '8px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}>Enregistrer</button>
                    <button onClick={() => setEditingMeal(null)} style={{
                      flex: 1, padding: '8px', backgroundColor: '#ccc', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer'
                    }}>Annuler</button>
                  </div>
                </>
              ) : (
                <>
                  <h4 style={{marginBottom: '8px', fontSize: '16px', fontWeight: '600'}}>{meal.name}</h4>
                  <p style={{fontSize: '13px', color: '#666', marginBottom: '15px'}}>{meal.description}</p>
                  <div style={{marginBottom: '15px'}}>
                    <div style={{fontSize: '18px', fontWeight: '600', color: '#4CAF50', marginBottom: '5px'}}>
                      👨 {parseFloat(meal.price_adult).toFixed(0)} FCFA<span style={{fontSize: '12px', fontWeight: '400', color: '#666'}}>/adulte/nuit</span>
                    </div>
                    <div style={{fontSize: '16px', fontWeight: '600', color: '#FF9800'}}>
                      👶 {parseFloat(meal.price_child).toFixed(0)} FCFA<span style={{fontSize: '12px', fontWeight: '400', color: '#666'}}>/enfant/nuit</span>
                    </div>
                  </div>
                  <button onClick={() => setEditingMeal(meal)} style={{
                    width: '100%', padding: '8px', backgroundColor: '#FF9800', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
                  }}>✏️ Modifier</button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
