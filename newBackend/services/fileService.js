const path = require("path");
const fsPromises = require("fs").promises;
const { sanitize, retryDelete } = require("../utils/commonUtils");
const { uploadToSupabase } = require("../utils/apiUtils");

const pptStorageDir = "ppt_storage";

const savePptCopy = async (pptPath, originalName, ext) => {
  const pptCopyPath = path.join(pptStorageDir, `${sanitize(originalName)}-${Date.now()}${ext}`);
  await fsPromises.copyFile(pptPath, pptCopyPath);
  console.log(`PPT copy saved locally: ${pptCopyPath}`);
  return pptCopyPath;
};

const uploadPptToSupabase = async (pptPath, originalName, ext, folderName) => {
  const pptFileName = `${folderName}/ppt-${originalName}${ext}`;
  const pptUploadData = await uploadToSupabase(
    "ppt-files",
    pptPath,
    pptFileName,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
  const pptUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ppt-files/${pptUploadData.path}`;
  console.log(`PPT uploaded to Supabase: ${pptUrl}`);
  return pptUrl;
};

const uploadPdfToSupabase = async (pdfPath, originalName, folderName) => {
  const pdfFileName = `${folderName}/pdf-${originalName}.pdf`;
  const pdfUploadData = await uploadToSupabase("ppt-pdfs", pdfPath, pdfFileName, "application/pdf");
  const pdfUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ppt-pdfs/${pdfUploadData.path}`;
  console.log(`PDF uploaded to Supabase: ${pdfUrl}`);
  return pdfUrl;
};

const uploadUserImageToSupabase = async (imagePath, originalName, ext, folderName) => {
  const imageFileName = `${folderName}/user-image-${originalName}${ext}`;
  const imageUploadData = await uploadToSupabase("user-images", imagePath, imageFileName, "image/" + ext.slice(1));
  const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/user-images/${imageUploadData.path}`;
  console.log(`User image uploaded to Supabase: ${imageUrl}`);
  return imageUrl;
};

module.exports = {
  savePptCopy,
  uploadPptToSupabase,
  uploadPdfToSupabase,
  uploadUserImageToSupabase,
};