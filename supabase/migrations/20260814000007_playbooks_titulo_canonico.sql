-- playbooks.nome era o nome original da coluna antes de renomear pra
-- "titulo" — ficou NOT NULL sem default, e o código continuava escrevendo
-- nela (junto com "title", outra sobra) só por precaução. Produção nunca
-- teve essas colunas extras (só "titulo"), e o código tentando escrever em
-- "nome" lá quebrava o salvamento de Playbook inteiro (PostgREST rejeita a
-- request se qualquer coluna do payload não existir no schema cache).
-- Relaxa o NOT NULL aqui pra parar de depender de escrever em "nome" — só
-- roda se a coluna existir (produção não tem, e não deve ganhar agora).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'playbooks' AND column_name = 'nome'
  ) THEN
    ALTER TABLE public.playbooks ALTER COLUMN nome DROP NOT NULL;
  END IF;
END $$;
