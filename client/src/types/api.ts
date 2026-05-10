export type User = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "clinic_owner" | "clinic" | "doctor" | "receptionist" | "patient";
  patientProfile?: {
    dateOfBirth?: string;
    gender?: "male" | "female" | "other" | "prefer_not_to_say";
  };
  contact?: {
    phone?: string;
    address?: string;
    city?: string;
    emergencyContact?: {
      name?: string;
      phone?: string;
      relation?: string;
    };
  };
  consent?: {
    treatment: boolean;
    dataProcessing: boolean;
    marketing: boolean;
    smsReminders: boolean;
    updatedAt?: string;
  };
  clinicIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type PatientProfileUpdatePayload = Partial<{
  name: string;
  patientProfile: Partial<{
    dateOfBirth: string;
    gender: "male" | "female" | "other" | "prefer_not_to_say";
  }>;
  contact: Partial<{
    phone: string;
    address: string;
    city: string;
    emergencyContact: Partial<{
      name: string;
      phone: string;
      relation: string;
    }>;
  }>;
  consent: {
    treatment: boolean;
    dataProcessing: boolean;
    marketing: boolean;
    smsReminders: boolean;
  };
}>;

export type Clinic = {
  _id: string;
  ownerUserId: string;
  appointments: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  ownerName?: string;
  subscriptionPlan: "starter" | "pro" | "premium";
  workingDays: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  breakTime?: { start?: string; end?: string };
  features?: { whatsappReminder?: boolean; onlineBooking?: boolean };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClinicCreatePayload = {
  ownerUserId?: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  ownerName?: string;
  subscriptionPlan?: "starter" | "pro" | "premium";
  workingDays?: string[];
  startTime: string;
  endTime: string;
  slotDuration?: number;
  breakTime?: { start?: string; end?: string };
  features?: { whatsappReminder?: boolean; onlineBooking?: boolean };
  isActive?: boolean;
};

export type BillingService = {
  _id: string;
  clinicId: string;
  name: string;
  code?: string;
  description?: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  _id: string;
  clinicId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SupplierCreatePayload = {
  clinicId: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
};

export type InventoryItem = {
  _id: string;
  clinicId: string;
  supplierId?: string | null;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  purchasePrice: number;
  salePrice?: number;
  expiryDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryItemCreatePayload = {
  clinicId: string;
  supplierId?: string;
  name: string;
  sku?: string;
  category?: string;
  unit: string;
  currentStock?: number;
  minStockLevel?: number;
  purchasePrice?: number;
  salePrice?: number;
  expiryDate?: string;
  isActive?: boolean;
};

export type PurchaseOrderStatus = "pending" | "received" | "cancelled";

export type PurchaseOrderLine = {
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  costPrice: number;
  lineTotal: number;
  expiryDate?: string | null;
};

export type PurchaseOrder = {
  _id: string;
  clinicId: string;
  supplierId: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderLine[];
  totalAmount: number;
  orderedAt: string;
  receivedAt?: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type BillingServiceCreatePayload = {
  clinicId: string;
  name: string;
  code?: string;
  description?: string;
  price: number;
  isActive?: boolean;
};

export type InvoicePaymentStatus = "unpaid" | "partial" | "paid";
export type InvoiceItemType = "service" | "dispensed_medicine";
export type InvoiceMedicineDispenseStatus = "pending" | "dispensed";

export type InvoiceItem = {
  lineId: string;
  type: InvoiceItemType;
  displayName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  serviceId?: string | null;
  inventoryItemId?: string | null;
  dispenseStatus?: InvoiceMedicineDispenseStatus | null;
  dispensedAt?: string | null;
  dispensedByUserId?: string | null;
};

export type Invoice = {
  _id: string;
  clinicId: string;
  appointmentId: string;
  patientUserId?: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  paymentStatus: InvoicePaymentStatus;
  receiptNumber: string;
  notes?: string;
  issuedAt: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceCreatePayload = {
  clinicId: string;
  appointmentId: string;
  items: Array<
    | { lineId?: string; type: "service"; serviceId: string; quantity: number }
    | {
        lineId?: string;
        type: "dispensed_medicine";
        inventoryItemId: string;
        quantity: number;
        unitPrice?: number;
      }
  >;
  discount?: number;
  notes?: string;
};

export type InvoiceUpdatePayload = Partial<{
  items: Array<
    | { lineId?: string; type: "service"; serviceId: string; quantity: number }
    | {
        lineId?: string;
        type: "dispensed_medicine";
        inventoryItemId: string;
        quantity: number;
        unitPrice?: number;
      }
  >;
  discount: number;
  notes: string;
  paidAmount: number;
}>;

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export type Appointment = {
  _id: string;
  clinicId: string;
  createdByUserId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string;
  prescriptions: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentPrescriptionUpdatePayload = {
  prescriptions: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    notes?: string;
  }>;
};

export type AppointmentCreatePayload = {
  clinicId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: string;
  notes?: string;
};

export type AppointmentUpdatePayload = Partial<{
  clinicId: string;
  patientName: string;
  patientPhone?: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes?: string;
}>;

export type ReportPreset = "today" | "7d" | "30d";

export type ReportSeriesPoint = {
  date: string;
  value: number;
};

export type ReportClinicPerformance = {
  clinicId: string;
  clinicName: string;
  revenueTotal: number;
  appointmentsTotal: number;
  cancellationRate: number;
  appointmentUtilizationRate: number;
};

export type ReportsOverview = {
  filters: {
    clinicId: string | null;
    preset: ReportPreset | "custom";
    dateFrom: string;
    dateTo: string;
    clinicIds: string[];
  };
  summary: {
    revenueTotal: number;
    appointmentsTotal: number;
    appointmentUtilizationRate: number;
    cancellationRate: number;
  };
  medicineSummary: {
    revenueTotal: number;
    dispensedUnitsTotal: number;
  };
  appointmentStatusBreakdown: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
  revenueSeries: ReportSeriesPoint[];
  appointmentSeries: ReportSeriesPoint[];
  topDispensedMedicines: Array<{
    inventoryItemId: string;
    name: string;
    quantityTotal: number;
    revenueTotal: number;
  }>;
  clinicPerformance: ReportClinicPerformance[];
};
