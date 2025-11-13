/*
  # Rename tables to T1-T100 format (excluding T13)

  1. Changes
    - Delete all existing tables
    - Recreate tables with T1-T100 naming format per sales point
    - Skip T13 for superstition
    
  2. Notes
    - Clean slate approach to avoid unique constraint issues
    - Each sales point gets its own T1-T100 series
*/

-- Delete all existing tables
DELETE FROM restaurant_tables;

-- Insert new tables for each sales point
DO $$
DECLARE
  sp_record RECORD;
  table_num INT;
  zone_name TEXT;
  zones TEXT[] := ARRAY['Terrasse', 'Salle principale', 'VIP'];
BEGIN
  FOR sp_record IN SELECT id, type FROM sales_points LOOP
    table_num := 1;
    
    WHILE table_num <= 100 LOOP
      -- Skip table 13
      IF table_num = 13 THEN
        table_num := table_num + 1;
        CONTINUE;
      END IF;
      
      -- Determine zone based on table number
      IF table_num <= 33 THEN
        zone_name := zones[1];  -- Terrasse
      ELSIF table_num <= 66 THEN
        zone_name := zones[2];  -- Salle principale
      ELSE
        zone_name := zones[3];  -- VIP
      END IF;
      
      INSERT INTO restaurant_tables (
        sales_point_id,
        table_number,
        capacity,
        zone,
        position_x,
        position_y,
        status
      ) VALUES (
        sp_record.id,
        'T' || table_num,
        (CASE 
          WHEN table_num % 3 = 0 THEN 6
          WHEN table_num % 3 = 1 THEN 4
          ELSE 2
        END),
        zone_name,
        ((table_num - 1) % 10) * 150 + 50,
        ((table_num - 1) / 10) * 150 + 50,
        'available'
      );
      
      table_num := table_num + 1;
    END LOOP;
  END LOOP;
END $$;
