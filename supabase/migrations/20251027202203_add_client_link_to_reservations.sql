/*
  # Add client linking and pricing fields to hotel reservations

  1. Changes
    - Add `client_id` column to link reservations to clients table
    - Add `nights_count` column to store number of nights
    - Add `room_price_per_night` column to store room price per night
    
  2. Notes
    - client_id is nullable to allow walk-in guests without client account
    - All new columns have appropriate defaults
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hotel_reservations' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE hotel_reservations 
    ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hotel_reservations' AND column_name = 'nights_count'
  ) THEN
    ALTER TABLE hotel_reservations 
    ADD COLUMN nights_count integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'hotel_reservations' AND column_name = 'room_price_per_night'
  ) THEN
    ALTER TABLE hotel_reservations 
    ADD COLUMN room_price_per_night numeric(10,2) DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hotel_reservations_client_id ON hotel_reservations(client_id);
