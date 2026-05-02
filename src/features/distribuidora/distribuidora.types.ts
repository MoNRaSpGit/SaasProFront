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
