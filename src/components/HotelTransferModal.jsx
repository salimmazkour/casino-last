import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './HotelTransferModal.css';

export default function HotelTransferModal({ isOpen, onClose, onSelectRoom, totalAmount }) {
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      console.log('Modal HotelTransfer ouvert, chargement des chambres...');
      loadOccupiedRooms();
    }
  }, [isOpen]);

  const loadOccupiedRooms = async () => {
    try {
      setLoading(true);
      console.log('Chargement des chambres occupées...');

      // D'abord récupérer les chambres avec statut 'occupied'
      const { data: rooms, error: roomError } = await supabase
        .from('hotel_rooms')
        .select('id, room_number, room_type, status')
        .eq('status', 'occupied')
        .order('room_number');

      if (roomError) {
        console.error('Erreur récupération chambres:', roomError);
        throw roomError;
      }

      console.log('Chambres occupées:', rooms);

      if (!rooms || rooms.length === 0) {
        console.log('Aucune chambre occupée');
        setOccupiedRooms([]);
        setLoading(false);
        return;
      }

      // Ensuite récupérer les séjours actifs
      const roomIds = rooms.map(r => r.id);
      const { data: stays, error: stayError } = await supabase
        .from('hotel_stays')
        .select(`
          id,
          guest_name,
          check_in_date,
          check_out_date,
          restaurant_charges,
          total_charges,
          room_id,
          meal_plan_id,
          hotel_meal_plans (
            name,
            code,
            includes_breakfast,
            includes_lunch,
            includes_dinner
          )
        `)
        .in('room_id', roomIds)
        .eq('status', 'active');

      if (stayError) {
        console.error('Erreur récupération séjours:', stayError);
        throw stayError;
      }

      console.log('Séjours actifs:', stays);

      // Combiner les données
      const combined = rooms.map(room => {
        const stay = stays?.find(s => s.room_id === room.id);
        if (!stay) return null;

        return {
          ...stay,
          hotel_rooms: {
            room_number: room.room_number,
            room_type: room.room_type
          }
        };
      }).filter(item => item !== null);

      console.log('Données combinées:', combined);
      setOccupiedRooms(combined);
    } catch (error) {
      console.error('Erreur chargement chambres occupées:', error);
      alert('Erreur lors du chargement des chambres occupées: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMealPlanInfo = (mealPlan) => {
    if (!mealPlan) return { text: 'Aucune formule', canCharge: true, color: 'gray' };

    const meals = [];
    if (mealPlan.includes_breakfast) meals.push('Petit Déj');
    if (mealPlan.includes_lunch) meals.push('Déjeuner');
    if (mealPlan.includes_dinner) meals.push('Dîner');

    if (meals.length === 0) {
      return { text: 'Chambre Seule', canCharge: true, color: 'green' };
    }

    return {
      text: `${mealPlan.code} - ${meals.join(', ')}`,
      canCharge: false,
      color: 'orange',
      warning: '⚠️ Repas inclus dans la formule'
    };
  };

  const filteredRooms = occupiedRooms.filter(stay => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const roomNumber = stay.hotel_rooms?.room_number?.toLowerCase() || '';
    const guestName = stay.guest_name?.toLowerCase() || '';
    const mealPlanName = stay.hotel_meal_plans?.name?.toLowerCase() || '';
    const mealPlanCode = stay.hotel_meal_plans?.code?.toLowerCase() || '';
    const roomType = stay.hotel_rooms?.room_type?.toLowerCase() || '';

    return (
      roomNumber.includes(search) ||
      guestName.includes(search) ||
      mealPlanName.includes(search) ||
      mealPlanCode.includes(search) ||
      roomType.includes(search)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal hotel-transfer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏨 Transfert Hôtel</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="transfer-info">
            <p>Sélectionnez la chambre pour transférer cette consommation</p>
            <p className="amount-to-transfer">Montant à transférer : <strong>{totalAmount.toFixed(0)} FCFA</strong></p>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder="Rechercher par chambre ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {loading ? (
            <div className="loading-state">Chargement des chambres...</div>
          ) : filteredRooms.length === 0 ? (
            <div className="empty-state">
              {occupiedRooms.length === 0
                ? 'Aucune chambre occupée actuellement'
                : 'Aucune chambre ne correspond à votre recherche'}
            </div>
          ) : (
            <div className="rooms-grid">
              {filteredRooms.map(stay => {
                const mealInfo = getMealPlanInfo(stay.hotel_meal_plans);

                return (
                  <div
                    key={stay.id}
                    className={`room-card ${!mealInfo.canCharge ? 'has-meal-plan' : ''}`}
                    onClick={() => {
                      if (mealInfo.warning) {
                        const confirm = window.confirm(
                          `${mealInfo.warning}\n\n` +
                          `Chambre ${stay.hotel_rooms?.room_number}\n` +
                          `Client : ${stay.guest_name}\n` +
                          `Formule : ${mealInfo.text}\n\n` +
                          `Voulez-vous quand même ajouter cette charge ?`
                        );
                        if (!confirm) return;
                      }
                      onSelectRoom(stay);
                    }}
                  >
                    <div className="room-header">
                      <span className="room-number">Ch. {stay.hotel_rooms?.room_number || '?'}</span>
                      <span className={`room-type ${stay.hotel_rooms?.room_type || 'simple'}`}>
                        {stay.hotel_rooms?.room_type === 'suite' ? '👑 Suite' : '🛏️ Simple'}
                      </span>
                    </div>

                    <div className="guest-name">
                      <strong>{stay.guest_name}</strong>
                    </div>

                    <div className={`meal-plan ${mealInfo.color}`}>
                      {mealInfo.text}
                    </div>

                    {mealInfo.warning && (
                      <div className="meal-warning">
                        {mealInfo.warning}
                      </div>
                    )}

                    <div className="room-charges">
                      <span>Charges restaurant : </span>
                      <strong>{(stay.restaurant_charges || 0).toFixed(0)} FCFA</strong>
                    </div>

                    <div className="stay-dates">
                      Du {new Date(stay.check_in_date).toLocaleDateString('fr-FR')}
                      au {new Date(stay.check_out_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}
