DROP POLICY IF EXISTS "rdo-photos upload authenticated" ON storage.objects;
CREATE POLICY "rdo-photos upload authenticated"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rdo-photos');