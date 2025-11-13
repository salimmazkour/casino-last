/*
  # Système de mise à jour automatique du statut des chambres
  
  1. Triggers
    - Trigger pour mettre à jour le statut de la chambre à 'occupied' lors d'un check-in
    - Trigger pour mettre à jour le statut de la chambre à 'available' lors d'un check-out
    - Trigger pour gérer les changements de statut des séjours
  
  2. Fonctions
    - `update_room_status_on_stay_change()` : Met à jour automatiquement le statut de la chambre
    
  3. Notes importantes
    - Le statut 'occupied' est automatiquement appliqué quand un séjour devient 'active'
    - Le statut 'available' est automatiquement appliqué quand un séjour devient 'checked_out'
    - Si plusieurs séjours actifs existent pour la même chambre, elle reste 'occupied'
*/

-- Fonction pour mettre à jour le statut de la chambre en fonction des séjours actifs
CREATE OR REPLACE FUNCTION update_room_status_on_stay_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Cas 1: Nouveau séjour actif (INSERT avec status='active' ou UPDATE vers status='active')
  IF (TG_OP = 'INSERT' AND NEW.status = 'active') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status != 'active') THEN
    
    UPDATE hotel_rooms
    SET status = 'occupied'
    WHERE id = NEW.room_id;
    
    RETURN NEW;
  END IF;
  
  -- Cas 2: Séjour terminé (UPDATE vers status='checked_out' ou DELETE)
  IF (TG_OP = 'UPDATE' AND NEW.status = 'checked_out' AND OLD.status = 'active') OR
     (TG_OP = 'DELETE' AND OLD.status = 'active') THEN
    
    -- Vérifier s'il reste d'autres séjours actifs pour cette chambre
    IF NOT EXISTS (
      SELECT 1 FROM hotel_stays
      WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
      AND status = 'active'
      AND id != COALESCE(NEW.id, OLD.id)
    ) THEN
      -- Aucun autre séjour actif, la chambre devient disponible
      UPDATE hotel_rooms
      SET status = 'available'
      WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_update_room_status_on_stay_insert ON hotel_stays;
DROP TRIGGER IF EXISTS trigger_update_room_status_on_stay_update ON hotel_stays;
DROP TRIGGER IF EXISTS trigger_update_room_status_on_stay_delete ON hotel_stays;

-- Créer les triggers
CREATE TRIGGER trigger_update_room_status_on_stay_insert
AFTER INSERT ON hotel_stays
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_stay_change();

CREATE TRIGGER trigger_update_room_status_on_stay_update
AFTER UPDATE ON hotel_stays
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_stay_change();

CREATE TRIGGER trigger_update_room_status_on_stay_delete
AFTER DELETE ON hotel_stays
FOR EACH ROW
EXECUTE FUNCTION update_room_status_on_stay_change();

-- Synchroniser le statut actuel des chambres avec les séjours existants
UPDATE hotel_rooms r
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM hotel_stays s
    WHERE s.room_id = r.id AND s.status = 'active'
  ) THEN 'occupied'
  ELSE 'available'
END;