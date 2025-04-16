/**
 * Utility functions for formatting content for copying
 */

import { FileData } from "../types/FileTypes";
import { generateAsciiFileTree, normalizePath, basename, dirname, isSubPath } from "./pathUtils";
import { getLanguageFromFilename } from "./languageUtils";

/**
 * Interface defining parameters for formatting file content
 */
interface FormatContentParams {
  files: FileData[];           // All files in the project
  selectedFiles: string[];     // Paths of selected files
  sortOrder: string;           // Current sort order (e.g., "tokens-desc")
  includeFileTree: boolean;    // Whether to include file tree in output
  selectedFolder: string | null; // Current selected folder path
  userInstructions: string;    // User instructions to append to content
}

/**
 * Calculates the relative path from the selectedFolder to the file path
 * @param selectedFolder Base folder path
 * @param filePath Full file path
 * @returns Relative path from selectedFolder to filePath
 */
function getRelativePath(selectedFolder: string, filePath: string): string {
  const normalizedFolder = normalizePath(selectedFolder);
  const normalizedFile = normalizePath(filePath);
  
  // If the file starts with the folder path, we can calculate a relative path
  if (normalizedFile.startsWith(normalizedFolder)) {
    let relativePath = normalizedFile.substring(normalizedFolder.length);
    // Remove any leading slash
    relativePath = relativePath.replace(/^\/+/, '');
    return relativePath;
  }
  
  // If file path doesn't start with the selected folder path,
  // we can't calculate a proper relative path
  return filePath;
}

/**
 * Helper function to get all files from a specific folder
 * @param files All files in the project
 * @param folderPath The path of the folder to filter by
 * @returns Array of files that belong to the specified folder
 */
function getFilesInFolder(files: FileData[], folderPath: string): FileData[] {
  const normalizedFolderPath = normalizePath(folderPath);
  return files.filter((file) => {
    const normalizedFilePath = normalizePath(file.path);
    return isSubPath(normalizedFolderPath, normalizedFilePath);
  });
}

/**
 * Assembles the formatted content for copying
 * The content is assembled in the following order:
 * 1. File tree (if enabled) within <FILE STRUCTURE> tags
 * 2. All selected file content within <CODEBASE> tags
 * 3. User instructions at the end within <user_instructions> tags
 * 
 * Each section is clearly separated with the appropriate tags
 * File contents include the full file path and language syntax highlighting
 * 
 * @param {FormatContentParams} params - Parameters for formatting content
 * @returns {string} The concatenated content ready for copying
 */
export const formatContentForCopying = ({
  files,
  selectedFiles,
  sortOrder,
  includeFileTree,
  selectedFolder,
  userInstructions
}: FormatContentParams): string => {
  // Sort files according to current sort settings
  const sortedSelected = files
    .filter((file: FileData) => selectedFiles.includes(file.path))
    .sort((a: FileData, b: FileData) => {
      let comparison = 0;
      const [sortKey, sortDir] = sortOrder.split("-");

      if (sortKey === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === "tokens") {
        comparison = a.tokenCount - b.tokenCount;
      } else if (sortKey === "size") {
        comparison = a.size - b.size;
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

  if (sortedSelected.length === 0) {
    return "No files selected.";
  }

  let concatenatedString = "";
  
  // Add ASCII file tree if enabled within <FILE STRUCTURE> tags
  if (includeFileTree && selectedFolder) {
    const normalizedFolder = normalizePath(selectedFolder);
    
    // Get all files in the selected folder for the tree view instead of just selected files
    const allFolderFiles = getFilesInFolder(files, selectedFolder);
    
    // Generate the ASCII tree with all files in the folder
    const asciiTree = generateAsciiFileTree(allFolderFiles, selectedFolder);
    
    concatenatedString += `<FILE STRUCTURE>\n${normalizedFolder}\n${asciiTree}\n</FILE STRUCTURE>\n\n`;
  }
  
  // Add file contents section
  concatenatedString += `<CODEBASE>\n`;
  
  // Add each file with its path and language-specific syntax highlighting
  sortedSelected.forEach((file: FileData) => {
    // Use the enhanced getLanguageFromFilename utility for optimal language detection
    const language = getLanguageFromFilename(file.name);
    // Normalize the file path for cross-platform compatibility
    const normalizedPath = normalizePath(file.path);
    
    // Calculate relative path if a selected folder is provided
    let relativePath = "";
    if (selectedFolder) {
      relativePath = getRelativePath(selectedFolder, file.path);
    }
    
    // Add file path (both absolute and relative) and content with language-specific code fencing
    let pathInfo = `File: ${normalizedPath}`;
    if (relativePath && relativePath !== file.path) {
      // Include the selected directory name at the beginning of the relative path
      const folderName = selectedFolder ? basename(selectedFolder) : "";
      pathInfo = `File: ${folderName}/${relativePath}`;
    }
    
    concatenatedString += `${pathInfo}\n\`\`\`${language}\n${file.content}\n\`\`\`\n\n`;
  });
  
  concatenatedString += `</CODEBASE>\n\n`;
  
  // Add user instructions at the end if present
  if (userInstructions.trim()) {
    concatenatedString += `<user_instructions>\n${userInstructions.trim()}\n</user_instructions>`;
  }

  return concatenatedString;
}; 