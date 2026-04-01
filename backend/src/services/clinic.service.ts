import Clinic from "../models/clinic.model";
import { Types } from "mongoose";
import { ClinicCreateInput, ClinicListQuery, ClinicUpdateInput } from "../types/clinic.types";

export const createClinic = (ownerUserId: Types.ObjectId, payload: ClinicCreateInput) =>
  Clinic.create({ ...payload, ownerUserId });

export const listClinics = async (
  ownerUserId: Types.ObjectId | null,
  opts: ClinicListQuery
) => {
  const filter: Record<string, unknown> = {};

  if (ownerUserId) {
    filter.ownerUserId = ownerUserId;
  } else if (opts.ownerUserId) {
    filter.ownerUserId = new Types.ObjectId(opts.ownerUserId);
  }

  if (opts.city) {
    filter.city = opts.city;
  }

  if (typeof opts.isActive === "boolean") {
    filter.isActive = opts.isActive;
  }

  if (opts.search) {
    const regex = new RegExp(opts.search, "i");
    filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
  }

  const skip = (opts.page - 1) * opts.limit;

  const [clinics, total] = await Promise.all([
    Clinic.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit).exec(),
    Clinic.countDocuments(filter).exec(),
  ]);

  return { clinics, total };
};

export const getClinicById = (ownerUserId: Types.ObjectId | null, id: string) =>
  ownerUserId
    ? Clinic.findOne({ _id: id, ownerUserId }).exec()
    : Clinic.findById(id).exec();

export const updateClinic = (
  ownerUserId: Types.ObjectId | null,
  id: string,
  updates: ClinicUpdateInput
) =>
  ownerUserId
    ? Clinic.findOneAndUpdate({ _id: id, ownerUserId }, updates, {
        new: true,
        runValidators: true,
      }).exec()
    : Clinic.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      }).exec();

export const deleteClinic = (ownerUserId: Types.ObjectId | null, id: string) =>
  ownerUserId
    ? Clinic.findOneAndDelete({ _id: id, ownerUserId }).exec()
    : Clinic.findByIdAndDelete(id).exec();
