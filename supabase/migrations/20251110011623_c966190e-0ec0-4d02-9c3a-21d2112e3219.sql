-- Update "Order Measurements" to "Measurements Report" in existing configurations
UPDATE estimate_configurations_v2
SET config_data = jsonb_set(
  config_data,
  '{sections}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN (section->>'id')::int = 4 
        THEN jsonb_set(section, '{title}', '"Measurements Report"')
        ELSE section
      END
    )
    FROM jsonb_array_elements(config_data->'sections') AS section
  )
),
updated_at = now()
WHERE config_data->'sections' @> '[{"id": 4}]';