import { createFileRoute } from "@tanstack/react-router";
import { EcommerceHome } from "@/components/store/EcommerceHome";

export const Route = createFileRoute("/")({ component: EcommerceHome, head: () => ({ meta: [{ title: "Aster & Row — Considered goods for everyday living" }, { name: "description", content: "Shop considered home, wardrobe and travel essentials from independent makers." }] }) });
