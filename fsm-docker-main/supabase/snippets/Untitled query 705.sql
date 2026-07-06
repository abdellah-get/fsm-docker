SELECT id, titre, statut, signature_client, montant_final
FROM public.interventions
WHERE statut = 'CLOTUREE'
ORDER BY created_at DESC
LIMIT 5;