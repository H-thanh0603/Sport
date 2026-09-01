-- previousPosition for movement indicator: snapshot of position last sync
ALTER TABLE standings ADD COLUMN IF NOT EXISTS previous_position smallint;
