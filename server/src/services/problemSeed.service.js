import { createHash } from 'node:crypto';
import Problem from '../models/problem.model.js';
import { problemBank } from '../data/problemBank.js';

export async function seedProblems() {
  const report = [];
  for (const problem of problemBank) {
    // Validate every document before any write. Existing titles are never updated.
    await new Problem(problem).validate();
    for (const sample of [...problem.sampleTestCases, ...problem.hiddenTestCases]) {
      const args = JSON.parse(sample.input);
      if (!Array.isArray(args)) throw new Error(`Invalid argument array: ${problem.title}`);
      JSON.parse(sample.expectedOutput);
    }
  }
  for (const problem of problemBank) {
    const existing = await Problem.findOne({ title: problem.title }).select('_id');
    if (existing) { report.push({ title: problem.title, action: 'preserved', id: String(existing._id) }); continue; }
    // Stable IDs make concurrent runs of this same seed safe without changing indexes
    // or imposing a uniqueness constraint on legacy user-created documents.
    const id = createHash('sha256').update(`codeduel:problem-bank:v1:${problem.title}`).digest('hex').slice(0,24);
    try {
      const result = await Problem.updateOne({ _id: id }, { $setOnInsert: { ...problem } }, { upsert: true, runValidators: true });
      report.push({ title: problem.title, action: result.upsertedCount ? 'inserted' : 'preserved', id });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const inserted = await Problem.findById(id).select('title');
      if (inserted?.title !== problem.title) throw error;
      report.push({ title: problem.title, action: 'preserved', id });
    }
  }
  return report;
}
