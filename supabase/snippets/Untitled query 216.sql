-- =====================================================================
-- 1. FIX SÉCURITÉ : Autoriser un utilisateur à lire son propre profil
-- =====================================================================
DROP POLICY IF EXISTS "Permettre la lecture de son propre profil" ON public.utilisateurs;

CREATE POLICY "Permettre la lecture de son propre profil" 
ON public.utilisateurs 
FOR SELECT 
TO authenticated 
USING (auth.uid() = id);


-- =====================================================================
-- 2. INJECTION DE SÉCURITÉ : Forcer la création/mise à jour des données
-- =====================================================================

-- Enregistrement de l'entreprise
INSERT INTO public.entreprises (id, nom, ice, rc, if_fiscal, patente)
VALUES (
  '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 
  'FixApp Maroc S.A.R.L', 
  '001548759000032', 
  'RC-Casablanca 45871', 
  'IF-50612485', 
  'PAT-36251478'
) ON CONFLICT (id) DO NOTHING;

-- Enregistrement et mise à jour forcée de ton utilisateur (gerant@fsm.ma)
INSERT INTO public.utilisateurs (id, entreprise_id, role, nom_complet, telephone, is_active)
VALUES (
  'd797d317-80fb-4518-9c2d-3dc5421d699d', -- Ton UID exact
  '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 
  'GERANT', -- Ton enum en majuscules
  'Gérant FSM', 
  '+212 6 00 00 00 00', 
  true
) 
ON CONFLICT (id) 
DO UPDATE SET 
  role = 'GERANT', 
  entreprise_id = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  is_active = true;