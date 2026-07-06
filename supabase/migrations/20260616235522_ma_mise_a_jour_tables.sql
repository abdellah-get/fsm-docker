alter table "public"."clients" add column "email" text;

alter table "public"."entreprises" add column "email" text;

alter table "public"."entreprises" add column "telephone" text;

alter table "public"."interventions" drop column "signature_client_url";

alter table "public"."interventions" add column "compte_rendu" text;

alter table "public"."interventions" add column "signature_client" text;


  create policy "Enable read access for all users"
  on "public"."entreprises"
  as permissive
  for select
  to public
using (true);



  create policy "Enable read access for all users"
  on "public"."utilisateurs"
  as permissive
  for select
  to public
using (true);



  create policy "Permettre la lecture de son propre profil"
  on "public"."utilisateurs"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "Autoriser l'upload de signatures 1h6xdx7_0"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Autoriser l'upload de signatures 1h6xdx7_1"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Autoriser l'upload de signatures 1h6xdx7_2"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (true);



