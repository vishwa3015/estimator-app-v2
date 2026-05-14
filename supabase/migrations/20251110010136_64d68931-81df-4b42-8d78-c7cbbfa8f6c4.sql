-- Remove "Order Measurements" section (id: 4) from existing estimate configurations
UPDATE estimate_configurations_v2
SET 
  config_data = jsonb_set(
    config_data,
    '{sections}',
    (
      SELECT jsonb_agg(section)
      FROM jsonb_array_elements(config_data->'sections') AS section
      WHERE (section->>'id')::int != 4
    )
  ),
  form_values = form_values - '4',
  updated_at = now()
WHERE 
  config_data->'sections' @> '[{"id": 4}]';