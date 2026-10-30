import { User, IUser } from '../models/user.model.js';
import { UserPreference, IUserPreference } from '../models/userPreference.model.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/token.js';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResult {
  user: ReturnType<IUser['toSafeObject']>;
  token: string;
  preferences: IUserPreference;
}

export class AuthService {
  async register(data: RegisterDTO): Promise<AuthResult> {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new AppError(
        'An account with this email address already exists',
        409,
        ErrorCodes.CONFLICT
      );
    }

    const passwordHash = await hashPassword(data.password);
    const user = await User.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
    });

    const preferences = await UserPreference.create({
      userId: user._id,
      unitSystem: 'metric',
      enableAlerts: true,
    });

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      user: user.toSafeObject(),
      token,
      preferences,
    };
  }

  async login(data: LoginDTO): Promise<AuthResult> {
    const user = await User.findOne({ email: data.email });
    if (!user) {
      throw new AppError(
        'Invalid email or password',
        401,
        ErrorCodes.UNAUTHORIZED
      );
    }

    const isMatch = await comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(
        'Invalid email or password',
        401,
        ErrorCodes.UNAUTHORIZED
      );
    }

    let preferences = await UserPreference.findOne({ userId: user._id });
    if (!preferences) {
      preferences = await UserPreference.create({
        userId: user._id,
        unitSystem: 'metric',
        enableAlerts: true,
      });
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      user: user.toSafeObject(),
      token,
      preferences,
    };
  }

  async getMe(userId: string): Promise<{ user: ReturnType<IUser['toSafeObject']>; preferences: IUserPreference | null }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    const preferences = await UserPreference.findOne({ userId: user._id });

    return {
      user: user.toSafeObject(),
      preferences,
    };
  }
}

export const authService = new AuthService();

