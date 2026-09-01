import type { Metadata } from "next";
import { requireUserPage } from "@/server/auth/rbac";
import { favoritesService, notificationsService } from "@/server/services";
import { matchesService } from "@/server/services/matches.service";
import { ProfileView } from "./profile-view";
import type { MatchWithTeams } from "@/server/services/types";

export const metadata: Metadata = { title: "Hồ sơ — Sport" };

export default async function ProfilePage() {
  const user = await requireUserPage();
  const [favorites, hydrated, notifications] = await Promise.all([
    favoritesService.list(user.id),
    favoritesService.hydrated(user.id),
    notificationsService.list(user.id),
  ]);

  // personalized: matches of favorite teams (upcoming + finished mix)
  const teamIds = favorites.filter((f) => f.type === "team").map((f) => f.targetId);
  let favoriteMatches: MatchWithTeams[] = [];
  if (teamIds.length > 0) {
    const rows = await matchesService.listMatches({ perPage: 50 });
    favoriteMatches = rows.items.filter((m) =>
      teamIds.includes(m.homeTeam.id) || teamIds.includes(m.awayTeam.id),
    );
  }

  return (
    <ProfileView
      user={user}
      favorites={hydrated.teams}
      matches={favoriteMatches.slice(0, 10)}
      notifications={notifications.items.slice(0, 5)}
      unread={notifications.unread}
    />
  );
}
