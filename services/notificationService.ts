import { supabase } from "@/lib/supabase/client";

export type NotificationType =
  | "information"
  | "maintenance"
  | "investissement"
  | "planning"
  | "consigne"
  | "document"
  | "equipement"
  | "systeme";

export type NotificationPriorite =
  | "basse"
  | "normale"
  | "haute"
  | "urgente";

export type NotificationItem = {
  id: string;
  titre: string;
  message: string | null;
  type: NotificationType;
  priorite: NotificationPriorite;
  utilisateur_id: string;
  magasin_id: string | null;
  lien: string | null;
  lue: boolean;
  date_lecture: string | null;
  created_at: string;
};

export type CreateNotificationInput = {
  titre: string;
  message?: string | null;
  type?: NotificationType;
  priorite?: NotificationPriorite;
  magasinId?: string | null;
  lien?: string | null;
};

export type NotificationScope = {
  magasinId?: string | null;
  tousMagasins?: boolean;
};

function getErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message: unknown }).message
    );
  }

  return "Une erreur inconnue est survenue.";
}

function throwNotificationError(error: unknown): never {
  throw new Error(
    `Notifications : ${getErrorMessage(error)}`
  );
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throwNotificationError(error);
  }

  if (!user) {
    throw new Error(
      "Notifications : aucun utilisateur connecté."
    );
  }
console.log("USER ID CONNECTÉ :", user.id);

  return user.id;
}

export async function getNotifications(
  scope: NotificationScope = {},
  limit = 50
): Promise<NotificationItem[]> {
  try {
    const userId = await getCurrentUserId();

    let query = supabase
      .from("notifications")
      .select(
        `
          id,
          titre,
          message,
          type,
          priorite,
          utilisateur_id,
          magasin_id,
          lien,
          lue,
          date_lecture,
          created_at
        `
      )
      .eq("utilisateur_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    if (
      !scope.tousMagasins &&
      scope.magasinId
    ) {
      query = query.or(
        `magasin_id.eq.${scope.magasinId},magasin_id.is.null`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }
console.log("Notifications récupérées :", data);
    return (data ?? []) as NotificationItem[];
  } catch (error) {
    throwNotificationError(error);
  }
}

export async function getNombreNotificationsNonLues(
  scope: NotificationScope = {}
): Promise<number> {
  try {
    const userId = await getCurrentUserId();

    let query = supabase
      .from("notifications")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("utilisateur_id", userId)
      .eq("lue", false);

    if (
      !scope.tousMagasins &&
      scope.magasinId
    ) {
      query = query.or(
        `magasin_id.eq.${scope.magasinId},magasin_id.is.null`
      );
    }

    const { count, error } = await query;

    if (error) {
      throw error;
    }

    return count ?? 0;
  } catch (error) {
    throwNotificationError(error);
  }
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationItem> {
  try {
    const userId = await getCurrentUserId();

    const titre = input.titre.trim();

    if (!titre) {
      throw new Error(
        "Le titre de la notification est obligatoire."
      );
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        titre,
        message:
          input.message?.trim() || null,
        type:
          input.type ?? "information",
        priorite:
          input.priorite ?? "normale",
        utilisateur_id: userId,
        magasin_id:
          input.magasinId ?? null,
        lien:
          input.lien?.trim() || null,
        lue: false,
        date_lecture: null,
      })
      .select(
        `
          id,
          titre,
          message,
          type,
          priorite,
          utilisateur_id,
          magasin_id,
          lien,
          lue,
          date_lecture,
          created_at
        `
      )
      .single();

    if (error) {
      throw error;
    }

    return data as NotificationItem;
  } catch (error) {
    throwNotificationError(error);
  }
}

export async function marquerNotificationCommeLue(
  id: string
): Promise<void> {
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("notifications")
      .update({
        lue: true,
        date_lecture: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("utilisateur_id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throwNotificationError(error);
  }
}

export async function marquerNotificationCommeNonLue(
  id: string
): Promise<void> {
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("notifications")
      .update({
        lue: false,
        date_lecture: null,
      })
      .eq("id", id)
      .eq("utilisateur_id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throwNotificationError(error);
  }
}

export async function marquerToutesCommeLues(
  scope: NotificationScope = {}
): Promise<void> {
  try {
    const userId = await getCurrentUserId();

    let query = supabase
      .from("notifications")
      .update({
        lue: true,
        date_lecture: new Date().toISOString(),
      })
      .eq("utilisateur_id", userId)
      .eq("lue", false);

    if (
      !scope.tousMagasins &&
      scope.magasinId
    ) {
      query = query.or(
        `magasin_id.eq.${scope.magasinId},magasin_id.is.null`
      );
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    throwNotificationError(error);
  }
}

export async function supprimerNotification(
  id: string
): Promise<void> {
  try {
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("utilisateur_id", userId);

    if (error) {
      throw error;
    }
  } catch (error) {
    throwNotificationError(error);
  }
}

export async function supprimerToutesNotificationsLues(
  scope: NotificationScope = {}
): Promise<void> {
  try {
    const userId = await getCurrentUserId();

    let query = supabase
      .from("notifications")
      .delete()
      .eq("utilisateur_id", userId)
      .eq("lue", true);

    if (
      !scope.tousMagasins &&
      scope.magasinId
    ) {
      query = query.or(
        `magasin_id.eq.${scope.magasinId},magasin_id.is.null`
      );
    }

    const { error } = await query;

    if (error) {
      throw error;
    }
  } catch (error) {
    throwNotificationError(error);
  }
}