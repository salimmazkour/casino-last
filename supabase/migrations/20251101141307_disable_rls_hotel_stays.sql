/*
  # Désactiver RLS pour hotel_stays
  
  1. Changements
    - Désactive RLS sur la table hotel_stays pour permettre les opérations de check-in/check-out
  
  2. Notes
    - Le RLS était activé sans aucune politique, bloquant toutes les insertions
    - Cette table fait partie du système de gestion hôtelière et doit être accessible comme les autres tables
*/

ALTER TABLE hotel_stays DISABLE ROW LEVEL SECURITY;
