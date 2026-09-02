DROP POLICY IF EXISTS "Anexos: INSERT por acesso à tarefa" ON storage.objects;
CREATE POLICY "Anexos: INSERT por acesso à tarefa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.user_can_access_task(((storage.foldername(name))[1])::uuid)
);