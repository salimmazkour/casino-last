import React, { useState, useEffect } from 'react';
import './DateRangePicker.css';

const DateRangePicker = ({
  checkInDate,
  checkOutDate,
  onCheckInChange,
  onCheckOutChange,
  blockedDates = [], // Array of {start: Date, end: Date}
  allowSameDayCheckInOut = true // Permet check-out le jour d'un check-in existant
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);

  useEffect(() => {
    if (!checkInDate) {
      setSelectingCheckIn(true);
    } else if (checkOutDate) {
      setSelectingCheckIn(true);
    } else {
      setSelectingCheckIn(false);
    }

    // Debug: afficher les dates bloquées
    if (blockedDates && blockedDates.length > 0) {
      console.log('📅 Dates bloquées reçues:', blockedDates);
    }
  }, [checkInDate, checkOutDate, blockedDates]);

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateBlocked = (date) => {
    if (!date) return false;

    // Normaliser la date à minuit pour comparaison cohérente
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const dateTime = checkDate.getTime();
    const dateStr = checkDate.toISOString().split('T')[0];

    const isBlocked = blockedDates.some(blocked => {
      const startDate = new Date(blocked.start);
      startDate.setHours(0, 0, 0, 0);
      const startTime = startDate.getTime();

      const endDate = new Date(blocked.end);
      endDate.setHours(0, 0, 0, 0);
      const endTime = endDate.getTime();

      // Si on sélectionne une date de DÉPART (check-out)
      // On peut partir le matin du jour où une autre réservation arrive
      // Car: check-out = avant midi, check-in = après midi
      if (!selectingCheckIn && checkInDate && allowSameDayCheckInOut) {
        // Pour le check-out, on bloque seulement les dates ENTRE deux réservations
        // Pas le jour de début d'une réservation
        const result = dateTime > startTime && dateTime < endTime;
        if (result) {
          console.log(`🚫 Date départ ${dateStr} bloquée par réservation ${blocked.start} → ${blocked.end}`);
        }
        return result;
      }

      // Pour le check-in, logique normale
      const result = dateTime >= startTime && dateTime < endTime;
      if (result) {
        console.log(`🚫 Date arrivée ${dateStr} bloquée par réservation ${blocked.start} → ${blocked.end}`);
      }

      // Une date est bloquée si elle est >= check-in ET < check-out
      // Le jour de check-out est disponible (on peut faire check-in ce jour-là)
      // Exemple: Réservation du 02/11 au 04/11
      //   - 02/11 et 03/11 sont bloqués pour check-in
      //   - 04/11 est disponible (la chambre se libère)
      return result;
    });

    return isBlocked;
  };

  const isDateInPast = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === checkInDate || dateStr === checkOutDate;
  };

  const isDateInRange = (date) => {
    if (!date || !checkInDate || !checkOutDate) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr > checkInDate && dateStr < checkOutDate;
  };

  const handleDateClick = (date) => {
    if (!date || isDateBlocked(date) || isDateInPast(date)) return;

    const dateStr = date.toISOString().split('T')[0];

    console.log('🔍 DateRangePicker - handleDateClick', {
      dateStr,
      selectingCheckIn,
      currentCheckIn: checkInDate,
      currentCheckOut: checkOutDate
    });

    if (selectingCheckIn || !checkInDate) {
      console.log('✅ Mode: Sélection date arrivée');
      onCheckInChange(dateStr);
      onCheckOutChange('');
      setSelectingCheckIn(false);
    } else {
      console.log('✅ Mode: Sélection date départ');
      if (dateStr <= checkInDate) {
        console.log('⚠️ Date départ <= date arrivée, on recommence');
        onCheckInChange(dateStr);
        onCheckOutChange('');
        setSelectingCheckIn(false);
      } else {
        const checkIn = new Date(checkInDate);
        const checkOut = date;

        let hasBlockedInBetween = false;
        const current = new Date(checkIn);
        current.setDate(current.getDate() + 1);

        while (current < checkOut) {
          if (isDateBlocked(current)) {
            hasBlockedInBetween = true;
            break;
          }
          current.setDate(current.getDate() + 1);
        }

        if (hasBlockedInBetween) {
          alert('⚠️ La période sélectionnée contient des dates réservées. Veuillez choisir une autre période.');
          return;
        }

        console.log('✅ Date départ validée:', dateStr);
        onCheckOutChange(dateStr);
        setSelectingCheckIn(true);
      }
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="date-range-picker">
      <div className="drp-header">
        <button type="button" onClick={previousMonth} className="drp-nav-btn">←</button>
        <div className="drp-month-year">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button type="button" onClick={nextMonth} className="drp-nav-btn">→</button>
      </div>

      <div className="drp-info">
        {selectingCheckIn ? (
          <span>📅 Sélectionnez la date d'arrivée</span>
        ) : (
          <span>📅 Sélectionnez la date de départ</span>
        )}
      </div>

      <div className="drp-calendar">
        <div className="drp-weekdays">
          {dayNames.map(day => (
            <div key={day} className="drp-weekday">{day}</div>
          ))}
        </div>
        <div className="drp-days">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="drp-day empty" />;
            }

            const blocked = isDateBlocked(date);
            const past = isDateInPast(date);
            const selected = isDateSelected(date);
            const inRange = isDateInRange(date);
            const disabled = blocked || past;

            return (
              <div
                key={index}
                className={`drp-day ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''} ${inRange ? 'in-range' : ''}`}
                onClick={() => handleDateClick(date)}
                title={blocked ? 'Date réservée' : past ? 'Date passée' : ''}
              >
                <span>{date.getDate()}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="drp-legend">
        <div className="drp-legend-item">
          <span className="drp-legend-color selected"></span>
          <span>Sélectionné</span>
        </div>
        <div className="drp-legend-item">
          <span className="drp-legend-color in-range"></span>
          <span>Période</span>
        </div>
        <div className="drp-legend-item">
          <span className="drp-legend-color disabled"></span>
          <span>Non disponible</span>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;
