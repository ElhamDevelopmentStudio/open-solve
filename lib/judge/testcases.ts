import { logger } from "@/lib/logger";
import { downloadObjectFromMinio } from "@/lib/storage/minio";

const INLINE_PREFIX = "inline://";

type BlobInputs = {
  reference?: string | null;
  inlineData?: string | null;
};

export const resolveBlobValue = async ({ reference, inlineData }: BlobInputs) => {
  if (typeof inlineData === "string" && inlineData.length > 0) {
    return inlineData;
  }
  if (!reference) {
    return "";
  }
  if (!reference.startsWith(INLINE_PREFIX)) {
    return reference;
  }
  const key = reference.replace(INLINE_PREFIX, "");
  try {
    const payload = await downloadObjectFromMinio(key);
    if (payload) {
      return payload;
    }
  } catch (error) {
    logger.warn({ error, key }, "failed to fetch blob from storage");
  }
  return "";
};

type ResolvableTestCase = {
  inputBlobRef: string;
  outputBlobRef: string;
  inputData?: string | null;
  outputData?: string | null;
};

export const resolveTestcaseIO = async (testCase: ResolvableTestCase) => {
  const [input, output] = await Promise.all([
    resolveBlobValue({ reference: testCase.inputBlobRef, inlineData: testCase.inputData }),
    resolveBlobValue({ reference: testCase.outputBlobRef, inlineData: testCase.outputData }),
  ]);
  return { input, output };
};

export const resolveSubmissionSource = async ({
  sourceCode,
  sourceRef,
}: {
  sourceCode?: string | null;
  sourceRef?: string | null;
}) => {
  if (sourceCode && sourceCode.length > 0) {
    return sourceCode;
  }
  return resolveBlobValue({ reference: sourceRef, inlineData: null });
};
