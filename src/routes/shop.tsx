import {createFileRoute} from "@tanstack/react-router";import {ShopPage} from "@/components/store/ShopPage";
export const Route=createFileRoute("/shop")({component:ShopPage,head:()=>({meta:[{title:"Shop all — Aster & Row"}]})});
