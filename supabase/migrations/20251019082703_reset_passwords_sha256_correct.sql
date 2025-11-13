/*
  # Reset all employee passwords to SHA-256 format (corrected)

  1. Changes
    - Resets all employee passwords using correct SHA-256 hashing
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

-- Update all passwords with correct SHA-256 hashes

-- SHA-256 hash of 'admin123'
UPDATE employees 
SET password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
WHERE login IN ('admin', 'admin2');

-- SHA-256 hash of 'chef123'
UPDATE employees 
SET password_hash = 'fa0990ab6f2ecfd562611cedad67152e8c1117f91c22d15094d1e242314243af'
WHERE login = 'chef1';

-- SHA-256 hash of 'manager123'
UPDATE employees 
SET password_hash = '866485796cfa8d7c0cf7111640205b83076433547577511d81f8030ae99ecea5'
WHERE login = 'manager1';

-- SHA-256 hash of 'serveur123'
UPDATE employees 
SET password_hash = 'a688737c5798ab06c597de75f4c3b9bb19d0cee140d98879eb36710a3ed3855e'
WHERE login = 'serveur1';

-- SHA-256 hash of 'caissier123'
UPDATE employees 
SET password_hash = 'fc11763703dc22fedc8f7c3809a6555e21af7873a60c2d11ac623d24dd3e542e'
WHERE login = 'caissier1';

-- SHA-256 hash of 'barman123'
UPDATE employees 
SET password_hash = '56a5a26f4b97c2ac867089e98e0afefd35dcff100d3f08e3f56368caf933fef3'
WHERE login = 'barman1';

-- SHA-256 hash of 'reception123'
UPDATE employees 
SET password_hash = '5145dba3b6bda2d610d2c5c435a1c2481eefd3146b6a7e004ad73f794386e031'
WHERE login = 'reception1';
