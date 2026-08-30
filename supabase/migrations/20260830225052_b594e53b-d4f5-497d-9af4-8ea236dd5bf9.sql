CREATE POLICY "Users can read their own panelist photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'panelist-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload their own panelist photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'panelist-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own panelist photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'panelist-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'panelist-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own panelist photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'panelist-photos' AND (storage.foldername(name))[1] = auth.uid()::text);