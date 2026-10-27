import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export async function registerUser(req, res) {
    try {
        const { username, email, password } = req.body

        if (!username || !email || !password) {
            return res.status(409).json({ message: "All fields are required" })
        }
        const emailExists = await User.findOne({ email })
        const usernameExists = await User.findOne({ username })
        if (emailExists || usernameExists) {
            return res.status(409).json({ message: "User already exists" })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        })
        await newUser.save()
        return res.status(201).json({ message: "User created successfully" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export async function loginUser(req, res) {
    try {
        const { username, password } = req.body

        if (!username || !password) {
            return res.status(400).json({ message: "All fields are required" })
        }
        const userExists = await User.findOne({ username })
        if (!userExists) {
            return res.status(401).json({ message: "Invalid username or password" })
        }

        const isPasswordValid = await bcrypt.compare(password, userExists.password)
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid username or password" })
        }
        const payload = {
            id: userExists._id
        }
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1h'
        })
        const user = {
            id: userExists._id,
            username: userExists.username,
            email: userExists.email
        }
        res.cookie("token", token, {
            httpOnly: true
        })

        return res.status(200).json({ message: "User logged in successfully", user })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}
export async function getCurrentUser(req, res) {
    try {
        const id = req.id
        const user = await User.findById(id).select("-password")
        if(!user){
            return res.status(404).json({ message: "User not found" })
        }
        return res.status(200).json({ message: "User fetched successfully", user })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

export function logoutUser(req, res) {
    res.clearCookie("token")
    return res.status(200).json({ message: "User logged out successfully" })
}