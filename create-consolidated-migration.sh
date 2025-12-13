#!/bin/bash

OUTPUT="consolidated_migration.sql"

echo "-- ========================================" > "$OUTPUT"
echo "-- ERP Hôtel Casino - Complete Database Migration" >> "$OUTPUT"
echo "-- Generated: $(date)" >> "$OUTPUT"
echo "-- Total migrations: $(ls supabase/migrations/*.sql | wc -l)" >> "$OUTPUT"
echo "-- ========================================" >> "$OUTPUT"
echo "" >> "$OUTPUT"

for file in supabase/migrations/*.sql; do
    if [ -f "$file" ]; then
        echo "" >> "$OUTPUT"
        echo "-- ========================================" >> "$OUTPUT"
        echo "-- Migration: $(basename "$file")" >> "$OUTPUT"
        echo "-- ========================================" >> "$OUTPUT"
        cat "$file" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
    fi
done

echo "✓ Consolidated migration created: $(wc -l < "$OUTPUT") lines"
