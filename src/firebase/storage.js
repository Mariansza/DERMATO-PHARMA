import { storage } from './config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} folder - The folder path (e.g., 'photos', 'prescriptions', 'reports')
 * @param {boolean} skipDownloadUrl - If true, don't fetch download URL (for unauthenticated uploads)
 * @returns {Promise<{file_url: string|null, path: string}>}
 */
export const uploadFile = async (file, folder = 'photos', skipDownloadUrl = false) => {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `${folder}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, file);

  if (skipDownloadUrl) {
    return {
      file_url: null,
      path: path
    };
  }

  const url = await getDownloadURL(snapshot.ref);

  return {
    file_url: url,
    path: path
  };
};

/**
 * Upload a medical photo
 * @param {File} file - The photo file
 * @returns {Promise<{file_url: string, path: string}>}
 */
export const uploadPhoto = async (file) => {
  return uploadFile(file, 'photos');
};

/**
 * Upload a prescription document
 * @param {File|Blob} file - The prescription file (usually PDF)
 * @param {string} caseId - The case ID for reference
 * @returns {Promise<{file_url: string, path: string}>}
 */
export const uploadPrescription = async (file, caseId) => {
  const timestamp = Date.now();
  const path = `prescriptions/${caseId}_${timestamp}.pdf`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return {
    file_url: url,
    path: path
  };
};

/**
 * Upload a medical report document
 * @param {File|Blob} file - The report file (usually PDF)
 * @param {string} caseId - The case ID for reference
 * @returns {Promise<{file_url: string, path: string}>}
 */
export const uploadReport = async (file, caseId) => {
  const timestamp = Date.now();
  const path = `reports/${caseId}_${timestamp}.pdf`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return {
    file_url: url,
    path: path
  };
};

/**
 * Delete a file from Firebase Storage
 * @param {string} path - The storage path of the file to delete
 */
export const deleteFile = async (path) => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

/**
 * Get download URL for a file
 * @param {string} path - The storage path of the file
 * @returns {Promise<string>}
 */
export const getFileUrl = async (path) => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

/**
 * Upload a blob (e.g., from canvas) as a file
 * @param {Blob} blob - The blob to upload
 * @param {string} filename - The filename to use
 * @param {string} folder - The folder path
 * @returns {Promise<{file_url: string, path: string}>}
 */
export const uploadBlob = async (blob, filename, folder = 'documents') => {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `${folder}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, blob);
  const url = await getDownloadURL(snapshot.ref);

  return {
    file_url: url,
    path: path
  };
};
