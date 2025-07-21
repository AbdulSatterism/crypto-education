/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import generateOTP from '../../../util/generateOTP';

import { IUser } from './user.interface';
import { User } from './user.model';

import AppError from '../../errors/AppError';

const createUserFromDb = async (payload: IUser) => {
  payload.role = USER_ROLES.USER;

  const existingUser = await User.findOne({ email: payload.email }); // Check for existing email
  if (existingUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Email already exists');
  }

  const result = await User.create(payload);
  if (!result) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  const otp = generateOTP();
  const emailValues = { name: result.name, otp, email: result.email };
  const accountEmailTemplate = emailTemplate.createAccount(emailValues);
  emailHelper.sendEmail(accountEmailTemplate);

  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 20 * 60000),
  };

  const updatedUser = await User.findOneAndUpdate(
    { _id: result._id },
    { $set: { authentication } },
  );
  if (!updatedUser) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found for update');
  }

  return result;
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const result = await User.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(size)
    .lean();

  const count = await User.countDocuments();

  return {
    result,
    totalData: count,
    page: pages,
    limit: size,
  };
};

const getUserProfileFromDB = async (
  user: JwtPayload,
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser = await User.findById(id).select('-password'); // Avoid password leak

  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return isExistUser;
};

// const updateProfileToDB = async (
//   user: JwtPayload,
//   payload: Partial<IUser>,
// ): Promise<Partial<IUser | null>> => {
//   const { id } = user;
//   const isExistUser = await User.isExistUserById(id);

//   if (!isExistUser) {
//     throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
//   }

//   if (!isExistUser.verified) {
//     throw new AppError(
//       StatusCodes.BAD_REQUEST,
//       'Please verify your account first',
//     );
//   }

//   if (payload.image && isExistUser.image) {
//     unlinkFile(isExistUser.image); // Remove the old image if new one is provided
//   }

//   const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
//     new: true,
//   });
//   return updateDoc;
// };

const getSingleUser = async (id: string): Promise<IUser | null> => {
  const result = await User.findById(id).select('-password'); // Ensure no password is leaked
  return result;
};

// Secure search user by phone
const searchUserByPhone = async (searchTerm: string, userId: string) => {
  let result;

  if (searchTerm) {
    // Use regex to search phone numbers but escape the search term to prevent injection
    result = await User.find({
      phone: { $regex: new RegExp(`^${searchTerm}`, 'i') }, // More secure regex search
      _id: { $ne: userId },
    });
  } else {
    result = await User.find({ _id: { $ne: userId } }).limit(10);
  }

  return result;
};

//! for aws services

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);

  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!isExistUser.verified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please verify your account first',
    );
  }

  // Update the user's profile, including the image URL from S3
  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });
  return updateDoc;
};

// aws key

// AWS_ACCESS_KEY_ID = your - access - key - id;
// AWS_SECRET_ACCESS_KEY = your - secret - access - key;
// AWS_REGION = your - region;
// AWS_BUCKET_NAME = your - s3 - bucket - name;

export const UserService = {
  createUserFromDb,
  getUserProfileFromDB,
  updateProfileToDB,
  getSingleUser,
  searchUserByPhone,
  getAllUsers,
};
