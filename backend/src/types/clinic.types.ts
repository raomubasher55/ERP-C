export type ClinicCreateInput = {
  ownerUserId?: string;
  createdByUserId?: string;
  updatedByUserId?: string;
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
  breakTime?: {
    start?: string;
    end?: string;
  };
  features?: {
    whatsappReminder?: boolean;
    onlineBooking?: boolean;
  };
  isActive?: boolean;
};

export type ClinicUpdateInput = Partial<ClinicCreateInput>;

export type ClinicListQuery = {
  page: number;
  limit: number;
  search?: string;
  city?: string;
  isActive?: boolean;
  ownerUserId?: string;
};
