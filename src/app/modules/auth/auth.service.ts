/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { JwtPayload, Secret } from 'jsonwebtoken';
import config from '../../../config';
import { emailHelper } from '../../../helpers/emailHelper';
import { jwtHelper } from '../../../helpers/jwtHelper';
import { emailTemplate } from '../../../shared/emailTemplate';
import {
  IAuthResetPassword,
  IChangePassword,
  ILoginData,
  IVerifyEmail,
} from '../../../types/auth';
// import cryptoToken from '../../../util/cryptoToken';
import generateOTP from '../../../util/generateOTP';

import { User } from '../user/user.model';
import { ResetToken } from '../resetToken/resetToken.model';
import AppError from '../../errors/AppError';
import unlinkFile from '../../../shared/unlinkFile';
import { downloadImage, facebookToken } from './auth.lib';

//login
const loginUserFromDB = async (payload: ILoginData) => {
  const { email, password } = payload;
  const isExistUser = await User.findOne({ email }).select('+password');
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  //check verified and status
  if (!isExistUser.verified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please verify your account, then try to login again',
    );
  }

  const passwordMatch = await User?.isMatchPassword(
    password,
    isExistUser.password,
  );
  if (!passwordMatch) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Incorrect password');
  }

  const tokenPayload = {
    id: isExistUser._id,
    role: isExistUser.role,
    email: isExistUser.email,
  };

  //create access token
  const accessToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  //create refresh token
  const refreshToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string,
  );

  // send user data without password
  const { password: _, ...userWithoutPassword } = isExistUser.toObject();

  return { user: userWithoutPassword, accessToken, refreshToken };
};

// forget password
const forgetPasswordToDB = async (email: string) => {
  const user = await User.isExistUserByEmail(email);
  if (!user) throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");

  const otp = generateOTP();
  const value = { otp, email: user.email };
  const emailContent = emailTemplate.resetPassword(value);
  emailHelper.sendEmail(emailContent);

  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 20 * 60000),
  };
  await User.findOneAndUpdate({ email }, { $set: { authentication } });
};

const verifyEmailToDB = async (payload: IVerifyEmail) => {
  const { email, oneTimeCode } = payload;
  const user = await User.findOne({ email }).select('+authentication');

  if (!user || user.authentication?.oneTimeCode !== oneTimeCode) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid or expired OTP');
  }

  const tokenPayload = {
    id: user._id,
    role: user.role,
    email: user.email,
  };

  //create access token
  const accessToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  //create refresh token
  const refreshToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string,
  );

  const message = !user.verified
    ? 'Your email has been successfully verified.'
    : 'Verification Successful';

  await User.findByIdAndUpdate(user._id, {
    verified: true,
    authentication: { oneTimeCode: null, expireAt: null },
  });

  return { data: { user, accessToken, refreshToken }, message };
};

const resetPasswordToDB = async (
  token: string,
  payload: IAuthResetPassword,
) => {
  const { newPassword, confirmPassword } = payload;
  const resetToken = await ResetToken.isExistToken(token);
  if (!resetToken) throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized');

  const user = await User.findById(resetToken.user).select('+authentication');
  if (!user?.authentication?.isResetPassword) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "You don't have permission to reset the password",
    );
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Passwords don't match");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );
  await User.findByIdAndUpdate(user._id, {
    password: hashedPassword,
    authentication: { isResetPassword: false },
  });
};

// change password
const changePasswordToDB = async (
  user: JwtPayload,
  payload: IChangePassword,
) => {
  const { currentPassword, newPassword, confirmPassword } = payload;
  const existingUser = await User.findById(user.id).select('+password');

  if (!existingUser)
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");

  if (!(await User.isMatchPassword(currentPassword, existingUser.password))) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Current password is incorrect',
    );
  }

  if (newPassword === currentPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'New password cannot be the same as the current password',
    );
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "New password and confirm password don't match",
    );
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  );
  await User.findByIdAndUpdate(existingUser._id, { password: hashedPassword });
};

const deleteAccountToDB = async (user: JwtPayload) => {
  const result = await User.findByIdAndDelete(user?.id);
  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No User found');
  }

  return result;
};

const newAccessTokenToUser = async (token: string) => {
  // Check if the token is provided
  if (!token) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Token is required!');
  }

  const verifyUser = jwtHelper.verifyToken(
    token,
    config.jwt.jwtRefreshSecret as Secret,
  );

  const isExistUser = await User.findById(verifyUser?.id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.UNAUTHORIZED, 'Unauthorized access');
  }

  //create token
  const accessToken = jwtHelper.createToken(
    { id: isExistUser._id, role: isExistUser.role, email: isExistUser.email },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  return { accessToken };
};

const resendVerificationEmailToDB = async (email: string) => {
  // Find the user by ID
  const existingUser: any = await User.findOne({ email: email }).lean();

  if (!existingUser) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'User with this email does not exist!',
    );
  }

  if (existingUser?.isVerified) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'User is already verified!');
  }

  // Generate OTP and prepare email
  const otp = generateOTP();
  const emailValues = {
    name: existingUser.name,
    otp,
    email: existingUser.email,
  };
  const accountEmailTemplate = emailTemplate.createAccount(emailValues);
  emailHelper.sendEmail(accountEmailTemplate);

  // Update user with authentication details
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 20 * 60000),
  };

  await User.findOneAndUpdate(
    { email: email },
    { $set: { authentication } },
    { new: true },
  );
};

interface IGoogleLoginPayload {
  email: string;
  name: string;
  image?: string;
  uid: string;
}

const googleLogin = async (payload: IGoogleLoginPayload) => {
  const { email, name, image, uid } = payload;

  if (!email || !uid) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Email and UID are required');
  }

  // Check if user exists by email
  let user = await User.findOne({ email });

  if (user?.image && image) {
    unlinkFile(user?.image);
  }

  if (!user) {
    // Create new user if doesn't exist
    user = await User.create({
      email,
      name,
      image: image || '',
      googleId: uid,
      role: 'USER',
      verified: true, // Google accounts are pre-verified
    });
  } else if (!user.googleId) {
    // Update existing user with Google ID if they haven't logged in with Google before
    user = await User.findByIdAndUpdate(
      user._id,
      {
        googleId: uid,
        verified: true,
        image: image || user.image, // Keep existing image if no new image provided
      },
      { new: true },
    );
  }

  if (!user) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to create or update user',
    );
  }

  // Generate tokens for authentication
  const tokenPayload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );

  const refreshToken = jwtHelper.createToken(
    tokenPayload,
    config.jwt.jwtRefreshSecret as Secret,
    config.jwt.jwtRefreshExpiresIn as string,
  );

  // Remove sensitive data before sending response
  const userObject: any = user.toObject();
  delete userObject.password;
  delete userObject.authentication;

  return {
    user: userObject,
    accessToken,
    refreshToken,
  };
};

export const AuthService = {
  verifyEmailToDB,
  loginUserFromDB,
  forgetPasswordToDB,
  resetPasswordToDB,
  changePasswordToDB,
  deleteAccountToDB,
  newAccessTokenToUser,
  resendVerificationEmailToDB,
  googleLogin,
};
