"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type AnnouncementKind = "sistema" | "lead" | "tarefa" | "pagamento";
export type AnnouncementAudience = "all" | "consultor" | "comercializadora";

export type Announcement = {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  kind: AnnouncementKind;
  title: string;
  body: string;
  href: string | null;
  audience: AnnouncementAudience;
  publishedAt: string | null;
  expiresAt: string | null;
  readsCount: number;
};

export type AnnouncementInput = {
  kind: AnnouncementKind;
  title: string;
  body: string;
  href: string | null;
  audience: AnnouncementAudience;
  expiresAt: string | null;
  publishNow: boolean;
};

type Row = {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  kind: AnnouncementKind;
  title: string;
  body: string;
  href: string | null;
  audience: AnnouncementAudience;
  published_at: string | null;
  expires_at: string | null;
};

function mapRow(row: Row, readsCount: number): Announcement {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    audience: row.audience,
    publishedAt: row.published_at,
    expiresAt: row.expires_at,
    readsCount,
  };
}

export function announcementStatus(a: Announcement): "rascunho" | "publicado" | "expirado" {
  if (!a.publishedAt) return "rascunho";
  if (a.expiresAt && new Date(a.expiresAt).getTime() <= Date.now()) return "expirado";
  return "publicado";
}

export function useAdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const annResult = await supabase
      .from("platform_announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (annResult.error) {
      setError(annResult.error.message);
      setLoading(false);
      return;
    }

    const rows = (annResult.data ?? []) as Row[];

    const readsResult = rows.length
      ? await supabase
          .from("platform_announcement_reads")
          .select("announcement_id")
          .in(
            "announcement_id",
            rows.map((r) => r.id),
          )
      : { data: [], error: null };

    if (readsResult.error) {
      setError(readsResult.error.message);
      setLoading(false);
      return;
    }

    const counts = new Map<string, number>();
    for (const r of (readsResult.data ?? []) as { announcement_id: string }[]) {
      counts.set(r.announcement_id, (counts.get(r.announcement_id) ?? 0) + 1);
    }

    setItems(rows.map((row) => mapRow(row, counts.get(row.id) ?? 0)));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: AnnouncementInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        kind: input.kind,
        title: input.title.trim(),
        body: input.body.trim(),
        href: input.href?.trim() || null,
        audience: input.audience,
        expires_at: input.expiresAt,
        published_at: input.publishNow ? new Date().toISOString() : null,
        created_by: userData.user?.id ?? null,
      };
      const { error: insertError } = await supabase
        .from("platform_announcements")
        .insert(payload);
      if (insertError) {
        setError(insertError.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Omit<Row, "id" | "created_at" | "updated_at" | "created_by">>) => {
      const { error: updateError } = await supabase
        .from("platform_announcements")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) {
        setError(updateError.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh],
  );

  const publish = useCallback(
    async (id: string) => update(id, { published_at: new Date().toISOString() }),
    [update],
  );

  const unpublish = useCallback(
    async (id: string) => update(id, { published_at: null }),
    [update],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from("platform_announcements")
        .delete()
        .eq("id", id);
      if (deleteError) {
        setError(deleteError.message);
        return false;
      }
      await refresh();
      return true;
    },
    [refresh],
  );

  return { items, loading, error, refresh, create, update, publish, unpublish, remove };
}
