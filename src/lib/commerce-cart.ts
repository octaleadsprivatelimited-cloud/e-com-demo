import { useEffect, useMemo, useState } from "react";
import { useStoreProducts } from "@/lib/store-products";

export type CartEntry={productId:string;quantity:number;variant?:Record<string,string>};
const key="aster-row-cart-v1";
const read=():CartEntry[]=>{try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return[]}};

export function useCommerceCart(){
  const products=useStoreProducts(),[items,setItems]=useState<CartEntry[]>([]);
  useEffect(()=>{const sync=()=>setItems(read());sync();window.addEventListener("commerce-cart",sync);window.addEventListener("storage",sync);return()=>{window.removeEventListener("commerce-cart",sync);window.removeEventListener("storage",sync)}},[]);
  const save=(next:CartEntry[])=>{setItems(next);localStorage.setItem(key,JSON.stringify(next));window.dispatchEvent(new Event("commerce-cart"))};
  const add=(productId:string,variant?:Record<string,string>,quantity=1)=>{const current=read(),signature=JSON.stringify(variant||{}),index=current.findIndex(entry=>entry.productId===productId&&JSON.stringify(entry.variant||{})===signature),next=[...current];if(index>=0)next[index]={...next[index]!,quantity:next[index]!.quantity+quantity};else next.push({productId,variant,quantity});save(next)};
  const update=(index:number,quantity:number)=>{const current=read();save(quantity<1?current.filter((_,itemIndex)=>itemIndex!==index):current.map((entry,itemIndex)=>itemIndex===index?{...entry,quantity}:entry))};
  const clear=()=>save([]),lines=items.map((entry,index)=>({entry,index,product:products.find(product=>product.id===entry.productId)!})).filter(line=>line.product),subtotal=useMemo(()=>lines.reduce((sum,line)=>sum+line.product.price*line.entry.quantity,0),[lines]);
  return{items,lines,count:items.reduce((sum,item)=>sum+item.quantity,0),subtotal,add,update,clear};
}
