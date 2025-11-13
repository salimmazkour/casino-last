/*
  # Add room_type filter to hotel_rate_types
  
  1. Changes
    - Add `room_type` column to `hotel_rate_types` table
    - Set appropriate values for existing rate types
    - Allow NULL for rate types that apply to all room types
  
  2. Notes
    - Chambre Simple rates will have room_type = 'simple'
    - Suite rates will have room_type = 'suite'
    - NULL means the rate applies to all room types
*/

-- Add room_type column
ALTER TABLE hotel_rate_types 
ADD COLUMN IF NOT EXISTS room_type text;

-- Update existing rate types based on their name
UPDATE hotel_rate_types 
SET room_type = 'simple' 
WHERE name ILIKE '%chambre simple%';

UPDATE hotel_rate_types 
SET room_type = 'suite' 
WHERE name ILIKE '%suite%';