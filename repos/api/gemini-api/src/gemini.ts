import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleAIFileManager, type FileMetadataResponse } from "@google/generative-ai/server";
import { createWatchCompilerHost } from "typescript";
import { TRANSACTION_ANALYSIS_PROMPT } from "./constants";
  
const geminiApiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(geminiApiKey);
const fileManager = new GoogleAIFileManager(geminiApiKey);
  
if (!geminiApiKey) {
  console.error('GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

/**
 * Uploads the given file to Gemini.
 *
 * See https://ai.google.dev/gemini-api/docs/prompting_with_media
 */
async function uploadToGemini(path: string, mimeType: string): Promise<FileMetadataResponse> {
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path,
  });
  const file = uploadResult.file;
  console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
  return file;
}
  
/**
 * Waits for the given files to be active.
 *
 * Some files uploaded to the Gemini API need to be processed before they can
 * be used as prompt inputs. The status can be seen by querying the file's
 * "state" field.
 *
 * This implementation uses a simple blocking polling loop. Production code
 * should probably employ a more sophisticated approach.
 */
async function waitForFilesActive(files: FileMetadataResponse[]): Promise<void> {
  console.log("Waiting for file processing...");
  for (const name of files.map((file) => file.name)) {
    let file = await fileManager.getFile(name);
    while (file.state === "PROCESSING") {
      process.stdout.write(".")
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      file = await fileManager.getFile(name)
    }
    if (file.state !== "ACTIVE") {
      throw Error(`File ${file.name} failed to process`);
    }
  }
  console.log("...all files ready\n");
}
  
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: "You are a helpful precise document reader able to read tabular data and intepret the records.",
});
  
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};
  
export async function run(filePath: string): Promise<string> {
  let uploadedFiles: FileMetadataResponse[] = [];
  
  try {
    // Upload files and store references for cleanup
    uploadedFiles = [
      await uploadToGemini(filePath, "application/pdf"),
    ];

    // Wait for files to be processed
    await waitForFilesActive(uploadedFiles);

    const chatSession = model.startChat({
      generationConfig,
      history: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: uploadedFiles[0].mimeType,
                fileUri: uploadedFiles[0].uri,
              },
            }
          ],
        }
      ]
    });

    const result = await chatSession.sendMessage(TRANSACTION_ANALYSIS_PROMPT);
    var resultJson = result.response.text();
    return resultJson;

  } catch (error) {
    console.error('Error processing request:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  } finally {
    // Cleanup: Delete all uploaded files
    console.log('Cleaning up uploaded files...');
    try {
      await Promise.all(
        uploadedFiles.map(async (file) => {
          await fileManager.deleteFile(file.name);
          console.log(`Deleted file: ${file.displayName}`);
        })
      );
    } catch (cleanupError) {
      console.error('Error during file cleanup:', cleanupError instanceof Error ? cleanupError.message : 'Unknown error');
    }
  }
}

// Only run directly if this is the main module
if (require.main === module) {
  console.log('Running Gemini API locally...');
  run("!2017-test.PDF").catch(error => {
    console.error('Application error:', error);
    process.exit(1);
  });
}