export type VariantOption={name:string;values:string[]};
export type Variant={id:string;sku:string;options:Record<string,string>;price:number;stock:number};
export type ProductType="standard"|"apparel"|"footwear"|"grocery"|"pack"|"custom";
export type Product = { id:string; name:string; category:string; price:number; mrp:number; rating:number; reviews:number; badge?:string; tone:string; glyph:string;image?:string;imageAlt?:string;productType?:ProductType;options?:VariantOption[];variants?:Variant[] };
export const products: Product[] = [
  { id:"p1", name:"Arc Linen Lounge Chair", category:"Home", price:18490, mrp:21990, rating:4.9, reviews:128, badge:"Bestseller", tone:"#d7c5ac", glyph:"◒" },
  { id:"p2", name:"Form No. 03 Table Lamp", category:"Lighting", price:7490, mrp:8990, rating:4.8, reviews:84, badge:"New", tone:"#c4c7b6", glyph:"◐" },
  { id:"p3", name:"Soft Structure Weekender", category:"Travel", price:9290, mrp:10990, rating:4.7, reviews:61, tone:"#a5a28f", glyph:"▰" },
  { id:"p4", name:"Contour Everyday Watch", category:"Accessories", price:12490, mrp:14990, rating:4.9, reviews:203, badge:"Limited", tone:"#b9aaa0", glyph:"◉" },
  { id:"p5", name:"Hand-thrown Carafe Set", category:"Dining", price:3490, mrp:4190, rating:4.6, reviews:49, tone:"#d4c9b9", glyph:"◕" },
  { id:"p6", name:"Field Merino Overshirt", category:"Wardrobe", price:8490, mrp:9990, rating:4.8, reviews:96, tone:"#8d9288", glyph:"◇",productType:"apparel",options:[{name:"Size",values:["S","M","L","XL","XXL"]},{name:"Color",values:["Forest","Stone"]}] },
  { id:"p7", name:"Fold Desk Organiser", category:"Workspace", price:2290, mrp:2790, rating:4.7, reviews:72, tone:"#cbbba4", glyph:"▱" },
  { id:"p8", name:"Cloud Cotton Throw", category:"Home", price:3990, mrp:4690, rating:4.9, reviews:115, tone:"#d9d1c3", glyph:"≈" },
];
export const categories = [["Home","Quiet forms, natural materials","⌂","#d8cab7"],["Wardrobe","Modern staples, made slowly","◇","#a8ada3"],["Workspace","Tools for focused days","▱","#c8b79f"],["Travel","Ready for the road","▰","#919688"]] as const;
export const money=(value:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
export const productTypeTemplates:Record<ProductType,{label:string;description:string;options:VariantOption[]}>= {
 standard:{label:"Standard item",description:"One SKU without selectable variants",options:[]},
 apparel:{label:"Apparel / Dress",description:"Letter sizing with optional colours",options:[{name:"Size",values:["XS","S","M","L","XL","XXL"]},{name:"Color",values:["Black","White","Navy"]}]},
 footwear:{label:"Footwear",description:"Numbered UK/India shoe sizes",options:[{name:"Size",values:["5","6","7","8","9","10","11"]},{name:"Color",values:["Black","Tan","White"]}]},
 grocery:{label:"Grocery / Pulses",description:"Weight-based selling units",options:[{name:"Weight",values:["250 g","500 g","1 kg","2 kg","5 kg"]}]},
 pack:{label:"Pack / Quantity",description:"Sell in packs or counted units",options:[{name:"Pack",values:["1 unit","Pack of 2","Pack of 4","Pack of 6","Pack of 12"]}]},
 custom:{label:"Custom product",description:"Create your own option groups and values",options:[{name:"Option",values:["Value 1","Value 2"]}]},
};
