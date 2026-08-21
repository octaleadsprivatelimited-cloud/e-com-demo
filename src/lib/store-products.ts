import { useEffect, useState } from "react";
import { products as fallbackProducts, type Product, type VariantOption } from "@/data/commerce";
import { commerceApi } from "./commerce-api";

type StoreProduct = { id:string;name:string;category:string;status:"DRAFT"|"ACTIVE"|"ARCHIVED";media?:Array<{url:string;alt:string;type:"IMAGE"|"VIDEO";position:number}>;variants:Array<{id:string;sku:string;price:number;mrp:number;stock:number;attributes:Record<string,string>}> };
const tones=["#d7c5ac","#c4c7b6","#a5a28f","#b9aaa0","#d4c9b9","#8d9288"],glyphs=["◒","◐","▰","◉","◕","◇"];

function mapProduct(item:StoreProduct,index:number):Product {const variant=item.variants[0],optionValues=new Map<string,Set<string>>();item.variants.forEach(entry=>Object.entries(entry.attributes).forEach(([name,value])=>{if(!optionValues.has(name))optionValues.set(name,new Set());optionValues.get(name)!.add(value)}));const options:VariantOption[]=[...optionValues].map(([name,values])=>({name,values:[...values]})),image=item.media?.filter(media=>media.type==="IMAGE").sort((a,b)=>a.position-b.position)[0];return {id:item.id,name:item.name,category:item.category,price:variant?.price||0,mrp:variant?.mrp||variant?.price||0,rating:0,reviews:0,badge:item.variants.some(entry=>entry.stock>0)?undefined:"Sold out",tone:tones[index%tones.length]!,glyph:glyphs[index%glyphs.length]!,image:image?.url,imageAlt:image?.alt||item.name,options,variants:item.variants.map(entry=>({id:entry.id,sku:entry.sku,options:entry.attributes,price:entry.price,stock:entry.stock}))}}

export function useStoreProducts(){const [items,setItems]=useState<Product[]>(fallbackProducts);useEffect(()=>{let active=true;commerceApi<StoreProduct[]>("/api/v1/products").then(products=>{if(active&&products.length)setItems(products.map(mapProduct))}).catch(()=>undefined);return()=>{active=false}},[]);return items}
