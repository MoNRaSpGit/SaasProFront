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

export type CamionesTripStatus = "confirmed" | "pending" | "paid" | "cancelled";

export type CamionesTrip = {
  id: number;
  tenantId: number;
  branchId: number | null;
  userId: number;
  clientId: number;
  placeId: number | null;
  clientName: string;
  tripDate: string;
  place: string;
  kilometers: number;
  status: CamionesTripStatus;
  collectedAmount: number | null;
  notes: string | null;
  updatedAt: string;
  createdAt: string;
  paidAt: string | null;
};

export type CamionesPlace = {
  id: number;
  tenantId: number;
  branchId: number | null;
  name: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export type CamionesPlacesResponse = {
  items: CamionesPlace[];
  meta: {
    tenantId: number;
    count: number;
    limit: number;
  };
};
