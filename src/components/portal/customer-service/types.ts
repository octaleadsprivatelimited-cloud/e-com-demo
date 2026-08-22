export type CustomerOrderLine = {
  variantId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  tax: number;
};

export type CustomerOrder = {
  id: string;
  number: string;
  status: string;
  lines: CustomerOrderLine[];
  total: number;
  payment?: { currency?: string } | null;
  createdAt: string;
};

export type CustomerReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "RECEIVED"
  | "REFUNDED";

export type CustomerReturn = {
  id: string;
  orderId: string;
  reason: string;
  notes?: string | null;
  status: CustomerReturnStatus;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    variantId: string;
    name: string;
    sku: string;
    quantity: number;
    condition?: string | null;
  }>;
};

export type SupportPriority = "LOW" | "NORMAL" | "HIGH";
export type SupportStatus = "OPEN" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";

export type CustomerSupportTicket = {
  id: string;
  number: string;
  subject: string;
  priority: SupportPriority;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
};
