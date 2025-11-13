/*
  # Add 100 tables to each sales point (except hotel)

  1. Purpose
    - Create 100 tables numbered from 1 to 100 (skipping number 13 for superstition)
    - Tables are created for each restaurant and bar sales point
    - Hotel reception is excluded as it doesn't use table management
    
  2. Tables affected
    - `restaurant_tables` - bulk insert of tables
    
  3. Details
    - Each table has a default capacity of 4 persons
    - Tables 1-30: Zone "Intérieur"
    - Tables 31-60: Zone "Terrasse"
    - Tables 61-100: Zone "VIP"
    - Table number 13 is skipped from all zones
    - Initial status: 'available'
    - Position coordinates set to 0 for now (can be adjusted via UI)
*/

-- Bar Machines à Sous (62ee39b6-4c4f-4174-a292-6c024047b456)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        '62ee39b6-4c4f-4174-a292-6c024047b456',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Bar Salle de Jeux Traditionnels (d1ee3272-7bc7-4f90-af3f-30d09dfd22dc)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        'd1ee3272-7bc7-4f90-af3f-30d09dfd22dc',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Boîte de Nuit Seven (d06c4500-fa56-4585-97de-7766fb893494)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        'd06c4500-fa56-4585-97de-7766fb893494',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Restaurant Le Jardin (2601da89-2837-43f8-a316-dbf1476c3dd2)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        '2601da89-2837-43f8-a316-dbf1476c3dd2',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;

-- Restaurant Seven Seven (f9cf6765-7478-419d-bd8f-51be1104309c)
DO $$
DECLARE
  table_num INT;
BEGIN
  FOR table_num IN 1..100 LOOP
    IF table_num != 13 THEN
      INSERT INTO restaurant_tables (sales_point_id, table_number, capacity, zone, status, position_x, position_y)
      VALUES (
        'f9cf6765-7478-419d-bd8f-51be1104309c',
        'Table ' || table_num,
        4,
        CASE
          WHEN table_num <= 30 THEN 'Intérieur'
          WHEN table_num <= 60 THEN 'Terrasse'
          ELSE 'VIP'
        END,
        'available',
        0,
        0
      );
    END IF;
  END LOOP;
END $$;
