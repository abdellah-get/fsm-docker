-- ==========================================
-- 1. CRÉATION DES ENUMS (TYPES PERSONNALISÉS)
-- ==========================================

CREATE TYPE "public"."role_utilisateur" AS ENUM (
    'GERANT',
    'TECHNICIEN'
);

CREATE TYPE "public"."statut_facture" AS ENUM (
    'EN_ATTENTE',
    'PAYEE',
    'EN_RETARD'
);

CREATE TYPE "public"."statut_intervention" AS ENUM (
    'A_FAIRE',
    'EN_COURS',
    'CLOTUREE'
);

-- ==========================================
-- 2. CRÉATION DES TABLES TRADITIONNELLES
-- ==========================================

-- Table Entreprises
CREATE TABLE IF NOT EXISTS "public"."entreprises" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "nom" character varying(255) NOT NULL,
    "ice" character varying(15) NOT NULL,
    "rc" character varying(50) NOT NULL,
    "if_fiscal" character varying(50) NOT NULL,
    "patente" character varying(50) NOT NULL,
    "email" "text",
    "telephone" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "twilio_account_sid" "text",
    "twilio_auth_token" "text",
    "twilio_whatsapp_number" "text",
    CONSTRAINT "entreprises_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "entreprises_ice_key" UNIQUE ("ice")
);

-- Table Utilisateurs (Profils reliés aux IDs de Supabase Auth)
CREATE TABLE IF NOT EXISTS "public"."utilisateurs" (
    "id" "uuid" NOT NULL, -- Reçoit l'UID de l'utilisateur créé côté Supabase Auth
    "entreprise_id" "uuid" NOT NULL,
    "role" "public"."role_utilisateur" DEFAULT 'TECHNICIEN'::"public"."role_utilisateur" NOT NULL,
    "nom_complet" character varying(255) NOT NULL,
    "telephone" character varying(20),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "current_lat" double precision,
    "current_lng" double precision,
    "email" "text",
    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- Table Clients
CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "entreprise_id" "uuid" NOT NULL,
    "nom_complet" character varying(255) NOT NULL,
    "telephone" character varying(20) NOT NULL,
    "adresse_geographique" "text" NOT NULL,
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- Table Demandes
CREATE TABLE IF NOT EXISTS "public"."demandes" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "entreprise_id" "uuid" NOT NULL,
    "nom_complet" "text" NOT NULL,
    "telephone" "text",
    "titre" "text",
    "description" "text",
    "statut" "text" DEFAULT 'EN_ATTENTE'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "adresse" "text",
    "email" "text",
    "technicien_id" "uuid",
    "latitude" numeric,
    "longitude" numeric,
    "date_disponibilite" "date",
    "preference_horaire" "text",
    "photos" "text"[],
    "updated_at" timestamp with time zone,
    "montant_final" numeric,
    "prix_valide_a" timestamp with time zone,
    "motif_refus" "text",
    "intervention_id" "uuid",
    "client_id" "uuid",
    CONSTRAINT "demandes_pkey" PRIMARY KEY ("id")
);

-- Table Interventions
CREATE TABLE IF NOT EXISTS "public"."interventions" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "entreprise_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "technicien_id" "uuid",
    "titre" character varying(255) NOT NULL,
    "description" "text",
    "statut" "public"."statut_intervention" DEFAULT 'A_FAIRE'::"public"."statut_intervention",
    "date_prevue" timestamp with time zone NOT NULL,
    "cloture_a" timestamp with time zone,
    "preuve_photo_url" "text",
    "signature_client" "text",
    "compte_rendu" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "montant_final" numeric(10,2) DEFAULT 0,
    "prix_valide_a" timestamp with time zone,
    "demande_id" "uuid",
    "signature_technicien" "text",
    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- Table Factures
CREATE TABLE IF NOT EXISTS "public"."factures" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL,
    "entreprise_id" "uuid" NOT NULL,
    "intervention_id" "uuid" NOT NULL,
    "montant_ht" numeric(10,2) NOT NULL,
    "taux_tva" numeric(4,2) DEFAULT 20.00 NOT NULL,
    "montant_ttc" numeric(10,2) NOT NULL,
    "statut" "public"."statut_facture" DEFAULT 'EN_ATTENTE'::"public"."statut_facture",
    "date_echeance" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "client_id" "uuid",
    "demande_id" "uuid",
    CONSTRAINT "factures_pkey" PRIMARY KEY ("id")
);

-- ==========================================
-- 3. RELATIONS & CLÉS ÉTRANGÈRES (CONSTRAINTS)
-- ==========================================

ALTER TABLE ONLY "public"."utilisateurs"
    ADD CONSTRAINT "utilisateurs_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprises"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprises"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."demandes"
    ADD CONSTRAINT "demandes_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "public"."utilisateurs"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."demandes"
    ADD CONSTRAINT "fk_demandes_client" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."demandes"
    ADD CONSTRAINT "fk_demandes_intervention_id" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprises"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_technicien_id_fkey" FOREIGN KEY ("technicien_id") REFERENCES "public"."utilisateurs"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."interventions"
    ADD CONSTRAINT "interventions_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "public"."demandes"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."factures"
    ADD CONSTRAINT "factures_entreprise_id_fkey" FOREIGN KEY ("entreprise_id") REFERENCES "public"."entreprises"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."factures"
    ADD CONSTRAINT "factures_intervention_id_fkey" FOREIGN KEY ("intervention_id") REFERENCES "public"."interventions"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."factures"
    ADD CONSTRAINT "fk_factures_client_id" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."factures"
    ADD CONSTRAINT "fk_factures_demande_id" FOREIGN KEY ("demande_id") REFERENCES "public"."demandes"("id") ON DELETE SET NULL;

-- ==========================================
-- 4. FONCTION STOCKÉE RESTANTE (NETTOYÉE)
-- ==========================================

CREATE OR REPLACE FUNCTION "public"."creer_demande_client"("p_entreprise_id" "uuid", "p_nom_complet" "text", "p_telephone" "text", "p_email" "text", "p_adresse" "text", "p_titre" "text", "p_description" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_client_id UUID;
BEGIN
  INSERT INTO clients (entreprise_id, nom_complet, telephone, email, adresse_geographique)
  VALUES (p_entreprise_id, p_nom_complet, p_telephone, p_email, p_adresse)
  RETURNING id INTO v_client_id;

  INSERT INTO interventions (entreprise_id, client_id, titre, description, statut, date_prevue)
  VALUES (p_entreprise_id, v_client_id, p_titre, p_description, 'EN_COURS', NOW());
END;
$$;