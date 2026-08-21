import {createFileRoute} from "@tanstack/react-router";import {ProductDetailPage} from "@/components/store/ProductDetailPage";
export const Route=createFileRoute("/product/$productId")({component:ProductDetailPage,head:()=>({meta:[{title:"Product — Aster & Row"}]})});
