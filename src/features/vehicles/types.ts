import type {
  FuelTypeEnum,
  TransmissionTypeEnum,
  VehicleDocTypeEnum,
  VehicleStatusEnum,
} from '@/types/database';

export type Vehicle = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  color: string | null;
  fuelType: FuelTypeEnum;
  transmission: TransmissionTypeEnum;
  chassisNo: string;
  engineNo: string;
  seatingCapacity: number | null;
  purchaseDate: string | null;
  purchasePrice: string | null; // numeric stored as string
  status: VehicleStatusEnum;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VehicleDocument = {
  id: string;
  vehicleId: string;
  docType: VehicleDocTypeEnum;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string;
  filePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
};

export const VEHICLE_DOC_TYPES: readonly { value: VehicleDocTypeEnum; label: string }[] = [
  { value: 'rc', label: 'RC' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'puc', label: 'PUC' },
  { value: 'fitness', label: 'Fitness' },
] as const;

export type ListVehiclesParams = {
  page: number;
  pageSize: number;
  search: string;
  status?: VehicleStatusEnum | 'all';
  fuelType?: FuelTypeEnum | 'all';
  sortBy: 'registration_number' | 'make' | 'year' | 'status' | 'created_at';
  sortDir: 'asc' | 'desc';
};

export type ListVehiclesResult = {
  rows: Vehicle[];
  total: number;
};
