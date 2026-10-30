import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  toSafeObject(): {
    id: string;
    fullName: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

const userSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [70, 'Full name cannot exceed 70 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: any) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User = model<IUser>('User', userSchema);
