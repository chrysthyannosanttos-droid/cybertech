-- Migration: Add work schedule and enhanced ponto digital fields
-- Date: 2026-03-22

-- Add jornada (work schedule) columns to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS jornada_entrada       TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS jornada_saida_almoco  TEXT DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS jornada_retorno_almoco TEXT DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS jornada_saida         TEXT DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS photo_references      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS geofence_radius       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS geofence_lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geofence_lng          DOUBLE PRECISION;

