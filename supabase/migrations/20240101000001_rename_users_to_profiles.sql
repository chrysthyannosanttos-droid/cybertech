-- Rename users table to profiles if it exists
ALTER TABLE IF EXISTS public.users RENAME TO profiles;
