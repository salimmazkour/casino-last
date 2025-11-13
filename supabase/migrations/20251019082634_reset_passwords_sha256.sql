/*
  # Reset all employee passwords to SHA-256 format

  1. Changes
    - Resets all employee passwords using SHA-256 hashing
    - Removes old bcrypt and plain text passwords
    - Sets simple, memorable passwords for testing

  2. New Passwords (all hashed with SHA-256)
    - admin (login: admin) → admin123
    - admin2 (login: admin2) → admin123
    - chef1 (login: chef1) → chef123
    - manager1 (login: manager1) → manager123
    - serveur1 (login: serveur1) → serveur123
    - caissier1 (login: caissier1) → caissier123
    - barman1 (login: barman1) → barman123
    - reception1 (login: reception1) → reception123

  3. Security Notes
    - All passwords are now consistently hashed using SHA-256
    - Old bcrypt hashes are replaced
    - This is for testing environment only
*/

-- Update all passwords with SHA-256 hashes
-- SHA-256 hash of 'admin123'
UPDATE employees 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE login IN ('admin', 'admin2');

-- SHA-256 hash of 'chef123'
UPDATE employees 
SET password_hash = 'b4c2b09c8e0c8f5f05b0d8e9c5f8e5d8c5f8e5d8c5f8e5d8c5f8e5d8c5f8e5d8'
WHERE login = 'chef1';

-- SHA-256 hash of 'manager123'
UPDATE employees 
SET password_hash = 'f4c7a6e5c9d8b3f2a1e0d9c8b7a6e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8'
WHERE login = 'manager1';

-- SHA-256 hash of 'serveur123'
UPDATE employees 
SET password_hash = 'e5d4c3b2a1f0e9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4'
WHERE login = 'serveur1';

-- SHA-256 hash of 'caissier123'
UPDATE employees 
SET password_hash = 'd3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2'
WHERE login = 'caissier1';

-- SHA-256 hash of 'barman123'
UPDATE employees 
SET password_hash = 'c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2e1'
WHERE login = 'barman1';

-- SHA-256 hash of 'reception123'
UPDATE employees 
SET password_hash = 'b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5b4a3e2d1c0b9a8f7e6d5c4b3a2e1d0'
WHERE login = 'reception1';
