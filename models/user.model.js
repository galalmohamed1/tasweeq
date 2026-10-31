const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide your name"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      required: [true, "Plase provide your email"],
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
        "Please provide a valid email address",
      ],
      lowercase: true,
    },
    password: {
      type: String,
      trim: true,
      required: [true, "Please provide your password"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    phoneNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: [
        "user",
        "admin",
        "salesManager",
        "sales",
        "accountant",
        "warehouse",
        "courier",
      ],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationOTP: {
      type: String,
      select: false,
    },
    verificationOTPExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
