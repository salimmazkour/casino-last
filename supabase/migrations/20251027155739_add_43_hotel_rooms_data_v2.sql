/*
  # Données des 43 Chambres d'Hôtel

  ## Description
  Création des 43 chambres physiques réparties comme suit :
  - 38 Chambres Simples (numéros 101-138)
  - 5 Suites (numéros 201-205)
  
  ## Répartition par étage
  - Étage 1 : Chambres 101-138 (38 chambres simples)
  - Étage 2 : Chambres 201-205 (5 suites)

  ## Notes
  - Toutes les chambres démarrent avec le statut 'available'
  - Les types sont 'simple' ou 'suite' (contrainte existante)
*/

-- Suppression des données de test existantes
DELETE FROM hotel_rooms;

-- ============================================
-- ÉTAGE 1 : 38 CHAMBRES SIMPLES (101-138)
-- ============================================
INSERT INTO hotel_rooms (room_number, room_type, floor, status, max_occupancy, features)
VALUES
  ('101', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('102', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('103', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('104', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('105', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('106', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('107', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('108', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('109', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('110', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('111', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('112', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('113', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('114', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('115', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('116', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('117', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('118', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('119', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('120', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('121', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('122', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('123', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('124', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('125', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "double"}'::jsonb),
  ('126', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('127', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('128', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('129', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('130', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "double"}'::jsonb),
  ('131', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('132', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('133', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('134', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('135', 'simple', 1, 'available', 2, '{"vue": "jardin", "lit": "twin"}'::jsonb),
  ('136', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('137', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb),
  ('138', 'simple', 1, 'available', 2, '{"vue": "rue", "lit": "twin"}'::jsonb);

-- ============================================
-- ÉTAGE 2 : 5 SUITES (201-205)
-- ============================================
INSERT INTO hotel_rooms (room_number, room_type, floor, status, max_occupancy, features)
VALUES
  ('201', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('202', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('203', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('204', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true}'::jsonb),
  ('205', 'suite', 2, 'available', 4, '{"vue": "panoramique", "lit": "king", "salon": true, "balcon": true, "jacuzzi": true}'::jsonb);