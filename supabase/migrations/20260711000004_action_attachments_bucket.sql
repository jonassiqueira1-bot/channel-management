-- Bucket para anexos de ações
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'action-attachments',
  'action-attachments',
  true,
  52428800, -- 50 MB
  ARRAY['image/*','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "action-attachments: upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'action-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "action-attachments: read" ON storage.objects
  FOR SELECT USING (bucket_id = 'action-attachments');

CREATE POLICY "action-attachments: delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'action-attachments' AND auth.role() = 'authenticated');
