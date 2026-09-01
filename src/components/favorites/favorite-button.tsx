"use client";

import { Heart, Star, Trophy } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

type FavType = "team" | "player" | "league";

const ICONS: Record<FavType, typeof Heart> = { team: Heart, player: Star, league: Trophy };

/** Favorite toggle — optimistic + rollback on error. */
export function FavoriteButton({
  type,
  targetId,
  initial,
  size = "md",
}: {
  type: FavType;
  targetId: number;
  initial: boolean;
  size?: "sm" | "md";
}) {
  const [favorited, setFavorited] = useState(initial);
  const qc = useQueryClient();
  const { toast } = useToast();
  const Icon = ICONS[type];

  const mutation = useMutation({
    mutationFn: async () => (await api.post<{ favorited: boolean }>("/api/v1/favorites", { type, targetId })).data,
    onMutate: () => {
      const prev = favorited;
      setFavorited(!favorited);
      return { prev };
    },
    onError: (err, _v, ctx: { prev: boolean } | undefined) => {
      setFavorited(ctx?.prev ?? initial);
      toast({
        title: err instanceof ApiError ? err.message : "Không thể lưu. Thử lại.",
        variant: "error",
      });
    },
    onSuccess: (data) => {
      setFavorited(data.favorited);
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  const label = favorited ? `Bỏ ${type === "team" ? "yêu thích" : "theo dõi"}` : "Thêm yêu thích";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={favorited}
      title={label}
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-colors",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        favorited
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", favorited && "fill-current")} />
      {size === "md" && <span>{favorited ? "Đang theo dõi" : "Theo dõi"}</span>}
    </button>
  );
}
