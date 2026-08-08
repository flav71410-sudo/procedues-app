import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ProfilMinimal = {
  id: string;
  role: string | null;
  role_id: string | null;
};

function normaliser(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function estNomSuperAdmin(value: string | null | undefined): boolean {
  const role = normaliser(value);

  return (
    role === "super_admin" ||
    role === "super admin" ||
    role === "super administrateur" ||
    role.includes("super administrateur")
  );
}

function jsonErreur(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id: utilisateurId } = await context.params;

    if (!utilisateurId) {
      return jsonErreur(
        "Identifiant utilisateur manquant.",
        400
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return jsonErreur(
        "NEXT_PUBLIC_SUPABASE_URL manquante sur le serveur.",
        500
      );
    }

    if (!serviceRoleKey) {
      return jsonErreur(
        "SUPABASE_SERVICE_ROLE_KEY manquante sur le serveur.",
        500
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return jsonErreur(
        "Session utilisateur manquante.",
        401
      );
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return jsonErreur(
        "Jeton d’authentification manquant.",
        401
      );
    }

    /*
     * Client serveur privilégié :
     * - ne jamais exposer SUPABASE_SERVICE_ROLE_KEY au navigateur ;
     * - utilisé uniquement dans cette route API.
     */
    const admin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * Vérifie le JWT envoyé par le navigateur et récupère
     * l'utilisateur réellement connecté.
     */
    const {
      data: { user: appelant },
      error: appelantError,
    } = await admin.auth.getUser(accessToken);

    if (appelantError || !appelant) {
      return jsonErreur(
        "Session invalide ou expirée.",
        401
      );
    }

    if (appelant.id === utilisateurId) {
      return jsonErreur(
        "Tu ne peux pas supprimer ton propre compte.",
        400
      );
    }

    const { data: profilAppelant, error: profilAppelantError } =
      await admin
        .from("profils")
        .select("id, role, role_id")
        .eq("id", appelant.id)
        .maybeSingle<ProfilMinimal>();

    if (profilAppelantError) {
      throw profilAppelantError;
    }

    if (!profilAppelant) {
      return jsonErreur(
        "Profil de l’utilisateur connecté introuvable.",
        403
      );
    }

    let roleAppelantNom =
      profilAppelant.role ?? "";

    if (profilAppelant.role_id) {
      const { data: roleAppelant, error: roleAppelantError } =
        await admin
          .from("roles")
          .select("nom")
          .eq("id", profilAppelant.role_id)
          .maybeSingle<{ nom: string | null }>();

      if (roleAppelantError) {
        throw roleAppelantError;
      }

      roleAppelantNom =
        roleAppelant?.nom ??
        profilAppelant.role ??
        "";
    }

    if (!estNomSuperAdmin(roleAppelantNom)) {
      return jsonErreur(
        "Seul un Super administrateur peut supprimer définitivement un utilisateur.",
        403
      );
    }

    const { data: profilCible, error: profilCibleError } =
      await admin
        .from("profils")
        .select("id, role, role_id")
        .eq("id", utilisateurId)
        .maybeSingle<ProfilMinimal>();

    if (profilCibleError) {
      throw profilCibleError;
    }

    /*
     * Le profil peut exceptionnellement être absent alors que
     * auth.users contient encore le compte. On autorise quand même
     * la suppression Auth, après toutes les vérifications d'accès.
     */
    let cibleEstSuperAdmin = false;

    if (profilCible) {
      let roleCibleNom = profilCible.role ?? "";

      if (profilCible.role_id) {
        const { data: roleCible, error: roleCibleError } =
          await admin
            .from("roles")
            .select("nom")
            .eq("id", profilCible.role_id)
            .maybeSingle<{ nom: string | null }>();

        if (roleCibleError) {
          throw roleCibleError;
        }

        roleCibleNom =
          roleCible?.nom ??
          profilCible.role ??
          "";
      }

      cibleEstSuperAdmin =
        estNomSuperAdmin(roleCibleNom);
    }

    /*
     * Interdit la suppression du dernier Super administrateur.
     */
    if (cibleEstSuperAdmin) {
      const { data: rolesSuperAdmin, error: rolesSuperAdminError } =
        await admin
          .from("roles")
          .select("id, nom");

      if (rolesSuperAdminError) {
        throw rolesSuperAdminError;
      }

      const idsRolesSuperAdmin = new Set(
        (rolesSuperAdmin ?? [])
          .filter((role) =>
            estNomSuperAdmin(role.nom)
          )
          .map((role) => role.id)
      );

      const { data: profils, error: profilsError } =
        await admin
          .from("profils")
          .select("id, role, role_id");

      if (profilsError) {
        throw profilsError;
      }

      const nombreSuperAdmins = (
        (profils ?? []) as ProfilMinimal[]
      ).filter(
        (profil) =>
          estNomSuperAdmin(profil.role) ||
          (
            profil.role_id !== null &&
            idsRolesSuperAdmin.has(profil.role_id)
          )
      ).length;

      if (nombreSuperAdmins <= 1) {
        return jsonErreur(
          "Impossible de supprimer le dernier Super administrateur.",
          409
        );
      }
    }

    /*
     * Suppression canonique Supabase :
     * deleteUser supprime auth.users.
     * Si public.profils.id référence auth.users avec ON DELETE CASCADE,
     * le profil disparaît automatiquement.
     */
    const { error: suppressionAuthError } =
      await admin.auth.admin.deleteUser(
        utilisateurId
      );

    if (suppressionAuthError) {
      throw new Error(
        `Suppression du compte Auth impossible : ${suppressionAuthError.message}`
      );
    }

    /*
     * Nettoyage de sécurité si le profil n'a pas été supprimé
     * automatiquement par la FK ON DELETE CASCADE.
     */
    const { data: profilRestant, error: profilRestantError } =
      await admin
        .from("profils")
        .select("id")
        .eq("id", utilisateurId)
        .maybeSingle<{ id: string }>();

    if (profilRestantError) {
      throw profilRestantError;
    }

    let warning: string | undefined;

    if (profilRestant) {
      const { error: suppressionProfilError } =
        await admin
          .from("profils")
          .delete()
          .eq("id", utilisateurId);

      if (suppressionProfilError) {
        warning =
          "Le compte Auth a bien été supprimé, mais le profil public est encore référencé par d’autres données. Il faudra nettoyer ces références avant de supprimer la ligne profils.";
      }
    }

    return NextResponse.json({
      success: true,
      warning,
    });
  } catch (error) {
    console.error(
      "Erreur API suppression utilisateur :",
      error
    );

    return jsonErreur(
      error instanceof Error
        ? error.message
        : "Erreur serveur pendant la suppression de l’utilisateur.",
      500
    );
  }
}