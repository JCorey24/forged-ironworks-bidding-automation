import { resolve } from "node:path";
import { runAlphabetAcademyDraftReview } from "../src/integration/alphabet-academy-draft-review";

async function main(): Promise<void> {
  const outputPath = resolve(
    process.argv[2] ?? "Alphabet-Academy-draft-review.xlsx",
  );
  const result = await runAlphabetAcademyDraftReview(outputPath);

  console.log(JSON.stringify({
    project: "Alphabet Academy",
    outputPath: result.outputPath,
    byteLength: result.byteLength,
    supportedDraftTotal: result.pricing.supportedDraftTotal,
    blockerCount: result.reviewReport.requiredEstimatorActions.filter(
      (action) => action.severity === "BLOCKER" && action.status === "OPEN",
    ).length,
    reviewItemCount: result.reviewReport.requiredEstimatorActions.filter(
      (action) => action.severity === "REVIEW" && action.status === "OPEN",
    ).length,
    readiness: result.reviewReport.projectReadiness,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
