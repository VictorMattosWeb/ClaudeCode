
CREATE POLICY "rdo-photos read authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rdo-photos');
CREATE POLICY "rdo-photos upload authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'rdo-photos' AND owner = auth.uid());
CREATE POLICY "rdo-photos delete own or admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'rdo-photos' AND (owner = auth.uid() OR public.has_role(auth.uid(),'admin')));
