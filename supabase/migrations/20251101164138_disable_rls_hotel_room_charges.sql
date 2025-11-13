/*
  # Disable RLS for hotel_room_charges

  Temporarily disable Row Level Security for hotel_room_charges table during development.
  This allows unrestricted access to the table for testing purposes.
*/

ALTER TABLE hotel_room_charges DISABLE ROW LEVEL SECURITY;
