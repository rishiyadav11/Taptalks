import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import User, { IUser } from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
import { userSchema, UserInput } from "../schemas//user.schema.js"; // Adjust the path as needed

interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
    fullName: string;
    email: string;
    profilePic?: string;
  };  
}

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = userSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.flatten().fieldErrors });
      return;
    }

    const { fullName, email, password, profilePic }: UserInput = parsed.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "Email already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      profilePic,
    }) as IUser;

    await newUser.save();
    generateToken(newUser._id.toString(), res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error: any) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "All fields are required" });
      return;
    }

    const user = (await User.findOne({ email })) as IUser | null;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    generateToken(user._id.toString(), res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error: any) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (_req: Request, res: Response): void => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Error in logout controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { profilePic } = req.body;
    const userId = req.user?._id;

    if (!profilePic || !userId) {
      res.status(400).json({ message: "Profile pic is required" });
      return;
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error: any) {
    console.error("Error in updateProfile controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req: AuthenticatedRequest, res: Response): void => {
  try {
    res.status(200).json(req.user);
  } catch (error: any) {
    console.error("Error in checkAuth controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
