-- 003_Categories_SortOrder.sql
-- Add SortOrder column to Categories to persist keyboard-shortcut ordering

ALTER TABLE Categories ADD COLUMN SortOrder INTEGER NOT NULL DEFAULT 0;

-- Initialise SortOrder to match current insertion order (rowid-based)
UPDATE Categories SET SortOrder = rowid - 1;
