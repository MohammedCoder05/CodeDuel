import Problem from "../models/problem.model.js";
import mongoose from "mongoose";
export const createProblem = async (req, res) => {
    try {
        const { title, description, difficulty, starterCode, sampleTestCases, hiddenTestCases } = req.body;
        if (!title || !description || !difficulty || !starterCode || !sampleTestCases || !hiddenTestCases) {
            return res.status(400).json({ message: "All fields are required" })
        }
        await Problem.create({
            title,
            description,
            difficulty,
            starterCode,
            sampleTestCases,
            hiddenTestCases,
        })
        return res.status(201).json({ message: "Problem created successfully" })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: "Validation failed",
                error: error.message
            });
        }
        console.log(error)
        res.status(500).json({ message: "Internal server error", error: error.message })
    }
}

export const getAllProblems = async (req, res) => {
    try {
        const problems = await Problem.find()
        return res.status(200).json({ problems })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}

export const getProblemById = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid ID format' });
        }   
        const problem = await Problem.findById(id)
        if (!problem) {
            return res.status(404).json({
                message: "Problem not found"
            })
        }

        return res.status(200).json({ problem })
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" })
    }
}
