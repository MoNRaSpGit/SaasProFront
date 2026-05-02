export type DistribuidoraClient = {
  id: string;
  name: string;
  address: string;
  zone: string;
};

export type DistribuidoraProduct = {
  id: string;
  name: string;
  price: number;
  unitLabel: string;
};

export type DistribuidoraOrderItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
};

export type DistribuidoraOrder = {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  notes: string | null;
  items: DistribuidoraOrderItem[];
  totalAmount: number;
};

export type DistribuidoraShellStatus = {
  module: "distribuidora";
  mode: "shell";
  status: "active";
  view?: "admin";
  tenant: {
    id: number;
    name: string;
    slug: string;
  };
  user: {
    id: number;
    email: string;
    membershipRole: string;
  };
  capabilities: {
    orderCapture: boolean;
    orderAdmin: boolean;
    localDrafts: boolean;
    backendOrders: boolean;
  };
  message: string;
};
