import {createFileRoute} from "@tanstack/react-router";import {AdminPortal} from "@/components/portal/AdminPortal";
export const Route=createFileRoute("/admin")({component:AdminPortal,head:()=>({meta:[{title:"Commerce admin — Aster & Row"},{name:"description",content:"Manage Aster & Row products, variants, inventory, orders, customers and commerce integrations."}]})});
