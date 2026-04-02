import Clinic from "../models/clinic.model";
import { Types } from "mongoose";
import { ClinicCreateInput, ClinicListQuery, ClinicUpdateInput } from "../types/clinic.types";

export const createClinic = (ownerUserId: Types.ObjectId, payload: ClinicCreateInput) =>
  Clinic.create({ ...payload, ownerUserId });

export const listClinics = async (
  ownerUserId: Types.ObjectId | null,
  opts: ClinicListQuery,
  clinicIds?: Types.ObjectId[] | null
) => {
  const filter: Record<string, unknown> = { deletedAt: null };

  if (ownerUserId) {
    filter.ownerUserId = ownerUserId;
  } else if (clinicIds && clinicIds.length > 0) {
    filter._id = { $in: clinicIds };
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

export const getClinicById = (
  ownerUserId: Types.ObjectId | null,
  id: string,
  clinicIds?: Types.ObjectId[] | null
) =>
  ownerUserId
    ? Clinic.findOne({ _id: id, ownerUserId, deletedAt: null }).exec()
    : clinicIds && clinicIds.length > 0
      ? Clinic.findOne({
          $and: [{ _id: id }, { _id: { $in: clinicIds } }],
          deletedAt: null,
        }).exec()
      : Clinic.findOne({ _id: id, deletedAt: null }).exec();

export const updateClinic = (
  ownerUserId: Types.ObjectId | null,
  id: string,
  updates: ClinicUpdateInput
) =>
  ownerUserId
    ? Clinic.findOneAndUpdate({ _id: id, ownerUserId, deletedAt: null }, updates, {
        new: true,
        runValidators: true,
      }).exec()
    : Clinic.findOneAndUpdate({ _id: id, deletedAt: null }, updates, {
        new: true,
        runValidators: true,
      }).exec();

export const deleteClinic = (
  ownerUserId: Types.ObjectId | null,
  id: string,
  updatedByUserId?: Types.ObjectId
) =>
  ownerUserId
    ? Clinic.findOneAndUpdate(
        { _id: id, ownerUserId, deletedAt: null },
        { deletedAt: new Date(), isActive: false, updatedByUserId },
        { new: true }
      ).exec()
    : Clinic.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { deletedAt: new Date(), isActive: false, updatedByUserId },
        { new: true }
      ).exec();
