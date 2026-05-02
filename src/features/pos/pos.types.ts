export type PosProduct = {
  id: number;
  tenantId: number;
  branchId: number | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  salePrice: number;
  costPrice: number | null;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PosLookupResponse = {
  found: boolean;
  item: PosProduct | null;
  lookup: {
    field: "barcode" | "sku";
    value: string;
    tenantId: number;
  };
};

export type PosCartItem = {
  id: string;
  productId: number | null;
  isManual: boolean;
  name: string;
  unitPrice: number;
  quantity: number;
  barcode: string | null;
  sku: string | null;
  imageUrl: string | null;
};

export type PosSale = {
  id: number;
  tenantId: number;
  branchId: number | null;
  userId: number;
  externalId: string | null;
  notes: string | null;
  itemsCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    saleId: number;
    tenantId: number;
    productId: number | null;
    isManual: boolean;
    name: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    barcode: string | null;
    sku: string | null;
    imageUrl: string | null;
    createdAt: string;
  }>;
};

export type PosSalesResponse = {
  items: PosSale[];
  meta: {
    tenantId: number;
    count: number;
    limit: number;
  };
};

export type PosPayment = {
  id: number;
  tenantId: number;
  branchId: number | null;
  userId: number;
  externalId: string | null;
  amount: number;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PosPaymentsResponse = {
  items: PosPayment[];
  meta: {
    tenantId: number;
    count: number;
    limit: number;
  };
};

export type PosDashboard = {
  tenant: {
    id: number;
    name: string;
    slug: string;
  };
  metrics: {
    salesTotal: number;
    paymentsTotal: number;
    balance: number;
    ticketsCount: number;
    itemsSold: number;
  };
  movements: Array<{
    id: string;
    type: "sale" | "payment";
    amount: number;
    createdAt: string;
    detail: {
      saleId?: number;
      itemsCount?: number;
      notes?: string | null;
      paymentId?: number;
      description?: string | null;
    };
  }>;
  ranking: Array<{
    name: string;
    qty: number;
  }>;
};
