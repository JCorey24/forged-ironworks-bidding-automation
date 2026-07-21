import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { FORGED_IRONWORKS_ESTIMATING_PROFILE } from "../config/company-estimating-profile";
import { exportProjectPricingWorkbook } from "../export/project-workbook-export";
import { ALPHABET_ACADEMY_FIXTURE } from "../fixtures/alphabet-academy";
import { createEstimatorReviewReport } from "../services/estimator-review-report";
import { priceProject } from "../services/project-pricing";

export async function runAlphabetAcademyDraftReview(outputPath: string) {
  const pricing = priceProject(
    {
      takeoffLines: ALPHABET_ACADEMY_FIXTURE.takeoffLines,
      assemblyExceptions: ALPHABET_ACADEMY_FIXTURE.unresolvedAssemblyExceptions,
      requiredQuoteRateKeys: ALPHABET_ACADEMY_FIXTURE.requiredQuoteRateKeys,
      costInputs: {
        equipment: { required: true },
        erection: { required: true },
      },
    },
    FORGED_IRONWORKS_ESTIMATING_PROFILE,
  );
  const reviewReport = createEstimatorReviewReport(pricing);
  const buffer = await exportProjectPricingWorkbook(
    {
      projectName: "Alphabet Academy",
      pricing,
      reviewReport,
      companyProfile: FORGED_IRONWORKS_ESTIMATING_PROFILE,
    },
    "DRAFT_REVIEW",
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);

  return { outputPath, pricing, reviewReport, byteLength: buffer.byteLength };
}
