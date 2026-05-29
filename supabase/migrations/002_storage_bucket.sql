-- =============================================
-- Storage bucket: comprovantes
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('comprovantes', 'comprovantes', false, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Policies (drop first to allow idempotent re-runs)
DROP POLICY IF EXISTS "users_insert_comprovantes"  ON storage.objects;
DROP POLICY IF EXISTS "users_select_comprovantes"  ON storage.objects;
DROP POLICY IF EXISTS "users_delete_comprovantes"  ON storage.objects;
DROP POLICY IF EXISTS "users_update_comprovantes"  ON storage.objects;

CREATE POLICY "users_insert_comprovantes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_select_comprovantes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_update_comprovantes" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_delete_comprovantes" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'comprovantes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
