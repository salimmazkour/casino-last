/*
  # Système de nettoyage automatique des statuts expirés

  Ce système garantit que :
  1. Les séjours expirés (check_out_date < aujourd'hui) passent en 'checked_out'
  2. Les chambres occupées sans séjour actif repassent en 'available'
  3. Les réservations expirées (check_in_date < aujourd'hui et status = 'confirmed') passent en 'no_show'
  4. Les chambres avec status 'reserved' sans réservation future repassent en 'available'

  ## Fonctions créées
  - `cleanup_expired_hotel_statuses()` : Fonction principale de nettoyage à appeler manuellement
  - Triggers automatiques sur INSERT/UPDATE/DELETE des séjours et réservations
*/

-- Fonction de nettoyage des statuts expirés
CREATE OR REPLACE FUNCTION cleanup_expired_hotel_statuses()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Marquer les séjours expirés comme 'checked_out'
  UPDATE hotel_stays
  SET status = 'checked_out'
  WHERE status = 'active' 
    AND check_out_date < CURRENT_DATE;

  -- 2. Marquer les réservations expirées comme 'no_show'
  UPDATE hotel_reservations
  SET status = 'no_show'
  WHERE status = 'confirmed'
    AND check_in_date < CURRENT_DATE;

  -- 3. Libérer les chambres occupées sans séjour actif
  UPDATE hotel_rooms
  SET status = 'available'
  WHERE status = 'occupied'
    AND NOT EXISTS (
      SELECT 1 FROM hotel_stays
      WHERE hotel_stays.room_id = hotel_rooms.id
        AND hotel_stays.status = 'active'
        AND hotel_stays.check_out_date >= CURRENT_DATE
    );

  -- 4. Mettre à jour les chambres réservées sans réservation confirmée future
  UPDATE hotel_rooms
  SET status = 'available'
  WHERE status = 'reserved'
    AND NOT EXISTS (
      SELECT 1 FROM hotel_reservations
      WHERE hotel_reservations.room_id = hotel_rooms.id
        AND hotel_reservations.status = 'confirmed'
        AND hotel_reservations.check_in_date >= CURRENT_DATE
    );

END;
$$;

-- Trigger pour nettoyer après modification des séjours
CREATE OR REPLACE FUNCTION trigger_cleanup_after_stay_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_expired_hotel_statuses();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_stay_change_cleanup ON hotel_stays;
CREATE TRIGGER after_stay_change_cleanup
  AFTER INSERT OR UPDATE OR DELETE ON hotel_stays
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_after_stay_change();

-- Trigger pour nettoyer après modification des réservations
CREATE OR REPLACE FUNCTION trigger_cleanup_after_reservation_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM cleanup_expired_hotel_statuses();
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS after_reservation_change_cleanup ON hotel_reservations;
CREATE TRIGGER after_reservation_change_cleanup
  AFTER INSERT OR UPDATE OR DELETE ON hotel_reservations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_after_reservation_change();

-- Exécuter immédiatement le nettoyage pour corriger les données existantes
SELECT cleanup_expired_hotel_statuses();
