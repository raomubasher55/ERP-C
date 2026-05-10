import dotenv from "dotenv";
import { Types } from "mongoose";
import { connectDb } from "../services/db.service";
import { hashPassword } from "../utils/password.util";
import User from "../models/user.model";
import Clinic from "../models/clinic.model";
import BillingService from "../models/billing-service.model";
import Supplier from "../models/supplier.model";
import InventoryItem from "../models/inventory-item.model";

dotenv.config();

type SeedUserRole = "admin" | "clinic_owner" | "doctor" | "receptionist" | "patient" | "clinic";

type SeededUser = {
  name: string;
  email: string;
  password: string;
  role: SeedUserRole;
  patientProfile?: {
    dateOfBirth?: Date;
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
    updatedAt?: Date;
  };
};

type SeededClinic = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  subscriptionPlan: "starter" | "pro" | "premium";
  workingDays: string[];
  startTime: string;
  endTime: string;
  slotDuration: number;
  breakTime: {
    start: string;
    end: string;
  };
  features: {
    whatsappReminder: boolean;
    onlineBooking: boolean;
  };
  appointments: number;
  ownerEmail: string;
  doctorEmails: string[];
  receptionistEmails: string[];
  services: Array<{
    name: string;
    code: string;
    description: string;
    price: number;
  }>;
  supplier: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
  };
  inventoryItem: {
    name: string;
    sku: string;
    category: string;
    unit: string;
    currentStock: number;
    minStockLevel: number;
    purchasePrice: number;
    salePrice: number;
    expiryDate: Date;
  };
};

const DEFAULT_PASSWORD = "Passw0rd!";

const seedUsers: SeededUser[] = [
  {
    name: "System Admin",
    email: "admin@epr.local",
    password: DEFAULT_PASSWORD,
    role: "admin",
  },
  {
    name: "Dr. Ayesha Owner",
    email: "owner@epr.local",
    password: DEFAULT_PASSWORD,
    role: "clinic_owner",
    contact: {
      phone: "+92-300-1000001",
      address: "12 Main Boulevard",
      city: "Lahore",
    },
  },
  {
    name: "Dr. Omar Siddiqui",
    email: "owner2@epr.local",
    password: DEFAULT_PASSWORD,
    role: "clinic_owner",
    contact: {
      phone: "+92-300-1000011",
      address: "22 Canal View",
      city: "Karachi",
    },
  },
  {
    name: "Dr. Hina Malik",
    email: "owner3@epr.local",
    password: DEFAULT_PASSWORD,
    role: "clinic_owner",
    contact: {
      phone: "+92-300-1000012",
      address: "8 Park Lane",
      city: "Islamabad",
    },
  },
  {
    name: "Dr. Hassan",
    email: "doctor@epr.local",
    password: DEFAULT_PASSWORD,
    role: "doctor",
    contact: {
      phone: "+92-300-1000002",
      city: "Lahore",
    },
  },
  {
    name: "Dr. Sana Ahmed",
    email: "doctor2@epr.local",
    password: DEFAULT_PASSWORD,
    role: "doctor",
    contact: {
      phone: "+92-300-1000013",
      city: "Karachi",
    },
  },
  {
    name: "Dr. Bilal Khan",
    email: "doctor3@epr.local",
    password: DEFAULT_PASSWORD,
    role: "doctor",
    contact: {
      phone: "+92-300-1000014",
      city: "Islamabad",
    },
  },
  {
    name: "Sara Frontdesk",
    email: "reception@epr.local",
    password: DEFAULT_PASSWORD,
    role: "receptionist",
    contact: {
      phone: "+92-300-1000003",
      city: "Lahore",
    },
  },
  {
    name: "Nadia Frontdesk",
    email: "reception2@epr.local",
    password: DEFAULT_PASSWORD,
    role: "receptionist",
    contact: {
      phone: "+92-300-1000015",
      city: "Karachi",
    },
  },
  {
    name: "Usman Frontdesk",
    email: "reception3@epr.local",
    password: DEFAULT_PASSWORD,
    role: "receptionist",
    contact: {
      phone: "+92-300-1000016",
      city: "Islamabad",
    },
  },
  {
    name: "Patient User",
    email: "patient@epr.local",
    password: DEFAULT_PASSWORD,
    role: "patient",
    patientProfile: {
      dateOfBirth: new Date("1998-05-10T00:00:00.000Z"),
      gender: "female",
    },
    contact: {
      phone: "+92-300-1000004",
      address: "45 Garden Town",
      city: "Lahore",
      emergencyContact: {
        name: "Ali Khan",
        phone: "+92-300-9999999",
        relation: "Brother",
      },
    },
    consent: {
      treatment: true,
      dataProcessing: true,
      marketing: false,
      smsReminders: true,
      updatedAt: new Date(),
    },
  },
  {
    name: "Patient Second",
    email: "patient2@epr.local",
    password: DEFAULT_PASSWORD,
    role: "patient",
    patientProfile: {
      dateOfBirth: new Date("1992-11-02T00:00:00.000Z"),
      gender: "male",
    },
    contact: {
      phone: "+92-300-1000017",
      address: "9 Model Town",
      city: "Karachi",
      emergencyContact: {
        name: "Fatima Noor",
        phone: "+92-300-8888888",
        relation: "Spouse",
      },
    },
    consent: {
      treatment: true,
      dataProcessing: true,
      marketing: true,
      smsReminders: false,
      updatedAt: new Date(),
    },
  },
  {
    name: "Legacy Clinic User",
    email: "legacy-clinic@epr.local",
    password: DEFAULT_PASSWORD,
    role: "clinic",
    contact: {
      phone: "+92-300-1000005",
      city: "Lahore",
    },
  },
];

const seedClinics: SeededClinic[] = [
  {
    name: "City Care Clinic",
    phone: "+92-300-1234567",
    email: "citycare@epr.local",
    address: "1 Main Road",
    city: "Lahore",
    subscriptionPlan: "pro",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    startTime: "09:00",
    endTime: "17:00",
    slotDuration: 15,
    breakTime: { start: "13:00", end: "14:00" },
    features: { whatsappReminder: false, onlineBooking: true },
    appointments: 8,
    ownerEmail: "owner@epr.local",
    doctorEmails: ["doctor@epr.local", "doctor2@epr.local"],
    receptionistEmails: ["reception@epr.local"],
    services: [
      {
        name: "Consultation Fee",
        code: "CONSULT",
        description: "Standard visit charge",
        price: 2000,
      },
      {
        name: "Follow-up Visit",
        code: "FOLLOWUP",
        description: "Short review appointment",
        price: 1500,
      },
    ],
    supplier: {
      name: "MediSource Pharma",
      contactPerson: "Ali Raza",
      phone: "+92-300-1111111",
      email: "orders@medisource.pk",
      address: "Lahore",
    },
    inventoryItem: {
      name: "Paracetamol 500mg",
      sku: "PCM-500",
      category: "Tablet",
      unit: "box",
      currentStock: 20,
      minStockLevel: 10,
      purchasePrice: 1200,
      salePrice: 1500,
      expiryDate: new Date("2026-12-31T00:00:00.000Z"),
    },
  },
  {
    name: "North Star Clinic",
    phone: "+92-300-2234567",
    email: "northstar@epr.local",
    address: "14 Clifton Block 5",
    city: "Karachi",
    subscriptionPlan: "premium",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    startTime: "10:00",
    endTime: "18:00",
    slotDuration: 20,
    breakTime: { start: "14:00", end: "14:30" },
    features: { whatsappReminder: true, onlineBooking: true },
    appointments: 5,
    ownerEmail: "owner2@epr.local",
    doctorEmails: ["doctor2@epr.local", "doctor3@epr.local"],
    receptionistEmails: ["reception2@epr.local"],
    services: [
      {
        name: "General Consultation",
        code: "GENCONS",
        description: "Primary consultation appointment",
        price: 2500,
      },
      {
        name: "ECG Screening",
        code: "ECG",
        description: "Basic ECG diagnostic service",
        price: 3500,
      },
    ],
    supplier: {
      name: "Karachi Medical Supply",
      contactPerson: "Hina Qureshi",
      phone: "+92-300-2222222",
      email: "orders@kms.pk",
      address: "Karachi",
    },
    inventoryItem: {
      name: "Syringe Pack",
      sku: "SYR-100",
      category: "Consumable",
      unit: "pack",
      currentStock: 35,
      minStockLevel: 15,
      purchasePrice: 900,
      salePrice: 1250,
      expiryDate: new Date("2027-03-31T00:00:00.000Z"),
    },
  },
  {
    name: "Family Health Hub",
    phone: "+92-300-3234567",
    email: "familyhub@epr.local",
    address: "27 Blue Area",
    city: "Islamabad",
    subscriptionPlan: "starter",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    startTime: "08:30",
    endTime: "16:30",
    slotDuration: 30,
    breakTime: { start: "12:30", end: "13:15" },
    features: { whatsappReminder: true, onlineBooking: false },
    appointments: 3,
    ownerEmail: "owner3@epr.local",
    doctorEmails: ["doctor@epr.local", "doctor3@epr.local"],
    receptionistEmails: ["reception3@epr.local"],
    services: [
      {
        name: "Family Consultation",
        code: "FAMCONS",
        description: "Comprehensive family practice visit",
        price: 1800,
      },
      {
        name: "Child Wellness Check",
        code: "CHILDWL",
        description: "Routine pediatric wellness check",
        price: 2200,
      },
    ],
    supplier: {
      name: "Capital Health Traders",
      contactPerson: "Imran Saeed",
      phone: "+92-300-3333333",
      email: "supply@capitalhealth.pk",
      address: "Islamabad",
    },
    inventoryItem: {
      name: "Vitamin Syrup",
      sku: "VIT-250",
      category: "Syrup",
      unit: "bottle",
      currentStock: 18,
      minStockLevel: 8,
      purchasePrice: 650,
      salePrice: 900,
      expiryDate: new Date("2026-10-15T00:00:00.000Z"),
    },
  },
];

const upsertUser = async (entry: SeededUser) => {
  const passwordHash = await hashPassword(entry.password);
  const user = await User.findOneAndUpdate(
    { email: entry.email },
    {
      name: entry.name,
      email: entry.email,
      passwordHash,
      role: entry.role,
      patientProfile: entry.patientProfile,
      contact: entry.contact,
      consent: entry.consent,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).exec();

  if (!user) {
    throw new Error(`Failed to seed user: ${entry.email}`);
  }

  return user;
};

const getRequiredUser = (
  users: Awaited<ReturnType<typeof upsertUser>>[],
  email: string
) => {
  const user = users.find((entry) => entry.email === email);
  if (!user) {
    throw new Error(`Required seed user missing: ${email}`);
  }
  return user;
};

const main = async () => {
  await connectDb();

  const users = await Promise.all(seedUsers.map((entry) => upsertUser(entry)));

  const admin = getRequiredUser(users, "admin@epr.local");
  const legacyClinicUser = getRequiredUser(users, "legacy-clinic@epr.local");
  const staffAssignments = new Map<string, Set<string>>();
  const seededClinics: string[] = [];

  for (const clinicSeed of seedClinics) {
    const owner = getRequiredUser(users, clinicSeed.ownerEmail);
    const clinic = await Clinic.findOneAndUpdate(
      { name: clinicSeed.name },
      {
        ownerUserId: owner._id,
        createdByUserId: admin._id,
        updatedByUserId: admin._id,
        appointments: clinicSeed.appointments,
        name: clinicSeed.name,
        phone: clinicSeed.phone,
        email: clinicSeed.email,
        address: clinicSeed.address,
        city: clinicSeed.city,
        ownerName: owner.name,
        subscriptionPlan: clinicSeed.subscriptionPlan,
        workingDays: clinicSeed.workingDays,
        startTime: clinicSeed.startTime,
        endTime: clinicSeed.endTime,
        slotDuration: clinicSeed.slotDuration,
        breakTime: clinicSeed.breakTime,
        features: clinicSeed.features,
        isActive: true,
        deletedAt: null,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).exec();

    if (!clinic) {
      throw new Error(`Failed to seed clinic: ${clinicSeed.name}`);
    }

    seededClinics.push(clinic.name);

    for (const email of [...clinicSeed.doctorEmails, ...clinicSeed.receptionistEmails]) {
      const existingClinicIds = staffAssignments.get(email) ?? new Set<string>();
      existingClinicIds.add(String(clinic._id));
      staffAssignments.set(email, existingClinicIds);
    }

    for (const service of clinicSeed.services) {
      await BillingService.findOneAndUpdate(
        { clinicId: clinic._id, code: service.code },
        {
          clinicId: clinic._id,
          name: service.name,
          code: service.code,
          description: service.description,
          price: service.price,
          createdByUserId: owner._id,
          updatedByUserId: owner._id,
          isActive: true,
          deletedAt: null,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      ).exec();
    }

    const supplier = await Supplier.findOneAndUpdate(
      { clinicId: clinic._id, name: clinicSeed.supplier.name },
      {
        clinicId: clinic._id,
        name: clinicSeed.supplier.name,
        contactPerson: clinicSeed.supplier.contactPerson,
        phone: clinicSeed.supplier.phone,
        email: clinicSeed.supplier.email,
        address: clinicSeed.supplier.address,
        isActive: true,
        deletedAt: null,
        createdByUserId: owner._id,
        updatedByUserId: owner._id,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).exec();

    if (!supplier) {
      throw new Error(`Failed to seed supplier for clinic: ${clinicSeed.name}`);
    }

    await InventoryItem.findOneAndUpdate(
      { clinicId: clinic._id, sku: clinicSeed.inventoryItem.sku },
      {
        clinicId: clinic._id,
        supplierId: supplier._id,
        name: clinicSeed.inventoryItem.name,
        sku: clinicSeed.inventoryItem.sku,
        category: clinicSeed.inventoryItem.category,
        unit: clinicSeed.inventoryItem.unit,
        currentStock: clinicSeed.inventoryItem.currentStock,
        minStockLevel: clinicSeed.inventoryItem.minStockLevel,
        purchasePrice: clinicSeed.inventoryItem.purchasePrice,
        salePrice: clinicSeed.inventoryItem.salePrice,
        expiryDate: clinicSeed.inventoryItem.expiryDate,
        isActive: true,
        deletedAt: null,
        createdByUserId: owner._id,
        updatedByUserId: owner._id,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).exec();
  }

  for (const user of users.filter(
    (entry) => entry.role === "doctor" || entry.role === "receptionist"
  )) {
    const assignedClinicIds = [...(staffAssignments.get(user.email) ?? new Set<string>())].map(
      (clinicId) => new Types.ObjectId(clinicId)
    );

    await User.findByIdAndUpdate(user._id, {
      clinicIds: assignedClinicIds,
    }).exec();
  }

  await User.findByIdAndUpdate(legacyClinicUser._id, {
    clinicIds: [],
  }).exec();

  console.log("Seed complete.");
  console.log("Default login password:", DEFAULT_PASSWORD);
  console.log("Users:");
  users.forEach((user) => {
    console.log(`- ${user.role}: ${user.email}`);
  });
  console.log("Clinics:");
  seededClinics.forEach((clinicName) => {
    console.log(`- ${clinicName}`);
  });
  process.exit(0);
};

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
