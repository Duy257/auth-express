import mongoose, { Schema, Document } from "mongoose";

export interface IUserDevice extends Document {
  id: string;
  userId: mongoose.Types.ObjectId;
  deviceId: string;
  fcmToken: string;
  platform: "android" | "ios" | "web";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserDeviceSchema: Schema = new Schema<IUserDevice>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceId: { type: String, required: true },
    fcmToken: { type: String, required: true, index: true },
    platform: {
      type: String,
      enum: ["android", "ios", "web"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUserDevice>("UserDevice", UserDeviceSchema);
