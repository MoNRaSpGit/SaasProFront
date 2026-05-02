export type CamionesClient = {
  id: string;
  name: string;
  createdAt: string;
};

export type CamionesTripStatus = "pending" | "paid";

export type CamionesTrip = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  place: string;
  kilometers: number;
  status: CamionesTripStatus;
  createdAt: string;
  paidAt: string | null;
};
