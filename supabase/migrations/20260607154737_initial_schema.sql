-- ==========================================
-- 1. EXTENSIONS & TYPES
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Définition des rôles et statuts
CREATE TYPE role_utilisateur AS ENUM ('GERANT', 'TECHNICIEN');
CREATE TYPE statut_intervention AS ENUM ('A_FAIRE', 'EN_COURS', 'CLOTUREE');
CREATE TYPE statut_facture AS ENUM ('EN_ATTENTE', 'PAYEE', 'EN_RETARD');

-- ==========================================
-- 2. TABLES FONDATRICES
-- ==========================================

-- Table: Entreprises (PME clientes du SaaS)
CREATE TABLE entreprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom VARCHAR(255) NOT NULL,
    ice VARCHAR(15) UNIQUE NOT NULL, -- Identifiant Commun de l'Entreprise
    rc VARCHAR(50) NOT NULL,         -- Registre du Commerce
    if_fiscal VARCHAR(50) NOT NULL,  -- Identifiant Fiscal
    patente VARCHAR(50) NOT NULL,    -- Taxe Professionnelle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Utilisateurs (Gérants et Techniciens)
CREATE TABLE utilisateurs (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Lien avec Supabase Auth
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    role role_utilisateur NOT NULL DEFAULT 'TECHNICIEN',
    nom_complet VARCHAR(255) NOT NULL,
    telephone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Clients (Clients finaux des PME)
-- Soumis aux règles CNDP (Données personnelles sensibles)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    nom_complet VARCHAR(255) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    adresse_geographique TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Interventions
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    technicien_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
    titre VARCHAR(255) NOT NULL,
    description TEXT,
    statut statut_intervention DEFAULT 'A_FAIRE',
    date_prevue TIMESTAMP WITH TIME ZONE NOT NULL,
    cloture_a TIMESTAMP WITH TIME ZONE, -- Renseigné lors de la signature électronique
    preuve_photo_url TEXT, -- Lien vers le bucket Supabase Storage
    signature_client_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: Factures
CREATE TABLE factures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    montant_ht DECIMAL(10, 2) NOT NULL,
    taux_tva DECIMAL(4, 2) NOT NULL DEFAULT 20.00, -- 20% par défaut ou 10%
    montant_ttc DECIMAL(10, 2) NOT NULL,
    statut statut_facture DEFAULT 'EN_ATTENTE',
    date_echeance DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. SÉCURITÉ RLS (Row Level Security)
-- ==========================================

-- Activation du RLS sur toutes les tables
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;

-- Exemple de politique de base : Un utilisateur ne peut voir que les données de son entreprise
-- (Nécessite une fonction helper pour récupérer l'entreprise_id de l'utilisateur connecté via JWT)
CREATE OR REPLACE FUNCTION get_user_entreprise_id()
RETURNS UUID AS $$
  SELECT entreprise_id FROM utilisateurs WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Application des politiques d'isolation
CREATE POLICY "Isolation PME - Clients" ON clients
    FOR ALL USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "Isolation PME - Interventions" ON interventions
    FOR ALL USING (entreprise_id = get_user_entreprise_id());

CREATE POLICY "Isolation PME - Factures" ON factures
    FOR ALL USING (entreprise_id = get_user_entreprise_id());