import {createFileRoute} from "@tanstack/react-router";import {CustomerPortal} from "@/components/portal/CustomerPortal";
export const Route=createFileRoute("/account")({component:CustomerPortal,head:()=>({meta:[{title:"My account — Aster & Row"}]})});
