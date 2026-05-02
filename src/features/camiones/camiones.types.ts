export type CamionesClient = {
  id: number;
  tenantId: number;
  branchId: number | null;
  name: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CamionesTripStatus = "pending" | "paid" | "cancelled";

export type CamionesTrip = {
  id: number;
  tenantId: number;
  branchId: number | null;
  userId: number;
  clientId: number;
  clientName: string;
  tripDate: string;
  place: string;
  kilometers: number;
  status: CamionesTripStatus;
  notes: string | null;
  updatedAt: string;
  createdAt: string;
  paidAt: string | null;
};

export type CamionesClientsResponse = {
  items: CamionesClient[];
  meta: {
    tenantId: number;
    count: number;
    limit: number;
  };
};

export type CamionesTripsResponse = {
  items: CamionesTrip[];
  meta: {
    tenantId: number;
    count: number;
    limit: number;
  };
};
