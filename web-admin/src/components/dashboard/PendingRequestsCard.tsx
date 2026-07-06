"use client";

import Link from "next/link";
import { Inbox, Clock } from "lucide-react";

export interface DemandeDbRow {
  id: string;
  nom_complet: string;
  telephone: string;
  titre: string;
  description: string | null;
  statut: string;
  created_at: string;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PendingRequestsCard({
  demandes,
}: {
  demandes: DemandeDbRow[];
}) {
  if (demandes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
        <Inbox className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">
          Aucune nouvelle demande client pour le moment.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-100">
        {demandes.map((demande) => (
          <Link
            key={demande.id}
            href={`/dashboard/demandes/${demande.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {demande.titre}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {demande.nom_complet} · {demande.telephone}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap shrink-0">
              <Clock size={14} />
              {formatDate(demande.created_at)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
