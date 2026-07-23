-- TEMPORÁRIO — permite chamar a checagem de emergência via anon key direto
-- (sem precisar de deploy novo do front-end pra injetar uma chamada de UI).
GRANT EXECUTE ON FUNCTION public.debug_emergency_check TO anon;
