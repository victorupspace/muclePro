"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/admin/auth";

export default function AdminIndexPage() {
  const router = useRouter();
  const { session, hydrated } = useAdminAuth();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(session ? "/internal-musclepro-admin/visao-geral" : "/internal-musclepro-admin/login");
  }, [hydrated, session, router]);

  return null;
}
