import mongoose from "mongoose";
const testCaseSchema = new mongoose.Schema(
    {
        input: {
            type: String,
            required: true,
        },
        expectedOutput: {
            type: String,
            required: true,
        }
    },
    { _id: false }
);
const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required"],
      enum: {
        values: ["easy", "medium", "hard"],
        message: "Difficulty must be easy, medium, or hard",
      },
    },
    starterCode: {
      type: String,
      required: [true, "Starter code is required"],
    },
    sampleTestCases: {
      type: [testCaseSchema],
      default: [],
      validate: {
        validator: function(array) {
            return array.length >= 1;
        },
        message: "You must provide at least 1 sample test case."
    }
    },
    hiddenTestCases: {
      type: [testCaseSchema],
      default: [],
      select: false,
      validate: {
        validator: function(array) {
            return array.length >= 1;
        },
        message: "You must provide at least 1 hidden test case."
    }
    },
  },
  { timestamps: true }
);
 
const Problem = mongoose.model("Problem", problemSchema);
 
export default Problem;
 