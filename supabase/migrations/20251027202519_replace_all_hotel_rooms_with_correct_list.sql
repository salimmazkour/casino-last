/*
  # Replace all hotel rooms with correct room numbers

  1. Changes
    - Delete all existing rooms
    - Create 43 rooms with the correct numbers
    - Rooms: 100-107, 110-114, 120-125, 130-131, 200-207, 210-214, 220-225, 230-231
    
  2. Room Types
    - Rooms ending in 0: suites (larger rooms)
    - All others: simple rooms
*/

DELETE FROM hotel_rooms;

INSERT INTO hotel_rooms (room_number, room_type, floor, max_occupancy, status, features) VALUES
('100', 'suite', 1, 4, 'available', '{"view": "jardin", "balcony": true}'),
('101', 'simple', 1, 2, 'available', '{}'),
('102', 'simple', 1, 2, 'available', '{}'),
('103', 'simple', 1, 2, 'available', '{}'),
('104', 'simple', 1, 2, 'available', '{}'),
('105', 'simple', 1, 2, 'available', '{}'),
('106', 'simple', 1, 2, 'available', '{}'),
('107', 'simple', 1, 2, 'available', '{}'),
('110', 'suite', 1, 4, 'available', '{"view": "jardin", "balcony": true}'),
('111', 'simple', 1, 2, 'available', '{}'),
('112', 'simple', 1, 2, 'available', '{}'),
('113', 'simple', 1, 2, 'available', '{}'),
('114', 'simple', 1, 2, 'available', '{}'),
('120', 'suite', 1, 4, 'available', '{"view": "piscine", "balcony": true}'),
('121', 'simple', 1, 2, 'available', '{}'),
('122', 'simple', 1, 2, 'available', '{}'),
('123', 'simple', 1, 2, 'available', '{}'),
('124', 'simple', 1, 2, 'available', '{}'),
('125', 'simple', 1, 2, 'available', '{}'),
('130', 'suite', 1, 4, 'available', '{"view": "piscine", "balcony": true}'),
('131', 'simple', 1, 2, 'available', '{}'),
('200', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('201', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('202', 'simple', 2, 2, 'available', '{}'),
('203', 'simple', 2, 2, 'available', '{}'),
('204', 'simple', 2, 2, 'available', '{}'),
('205', 'simple', 2, 2, 'available', '{}'),
('206', 'simple', 2, 2, 'available', '{}'),
('207', 'simple', 2, 2, 'available', '{}'),
('210', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('211', 'suite', 2, 4, 'available', '{"view": "panoramique", "balcony": true}'),
('212', 'simple', 2, 2, 'available', '{}'),
('213', 'simple', 2, 2, 'available', '{}'),
('214', 'simple', 2, 2, 'available', '{}'),
('220', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}'),
('221', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}'),
('222', 'simple', 2, 2, 'available', '{}'),
('223', 'simple', 2, 2, 'available', '{}'),
('224', 'simple', 2, 2, 'available', '{}'),
('225', 'simple', 2, 2, 'available', '{}'),
('230', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}'),
('231', 'suite', 2, 4, 'available', '{"view": "mer", "balcony": true}');
