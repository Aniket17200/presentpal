const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const shell = require("shelljs");
const poppler = require("pdf-poppler");
const sanitize = require("sanitize-filename");
const axios = require("axios");
const unzipper = require("unzipper");

const checkLibreOffice = () => {
  const office = process.env.PPT_TO_PDF_PATH || "soffice";
  if (!shell.which(office)) {
    throw new Error("LibreOffice is not installed or not in PATH.");
  }
  console.log("LibreOffice found in PATH.");
  return office;
};

const convertToPDF = (file, ext) => {
  return new Promise((resolve, reject) => {
    const office = checkLibreOffice();
    const outdir = path.dirname(file);
    if (![".ppt", ".pptx", ".pps", ".ppsx"].includes(ext)) {
      return reject(new Error("Invalid file type. Only PPT files are allowed."));
    }
    const command = `"${office}" --headless --convert-to pdf --outdir "${outdir}" "${file}"`;
    console.log(`Executing PPT to PDF conversion: ${command}`);
    shell.exec(command, { silent: true }, (code, stdout, stderr) => {
      if (code !== 0) {
        console.error(`Conversion failed: ${stderr}`);
        reject(new Error(`Conversion failed: ${stderr}`));
      } else {
        const pdfPath = file.replace(ext, ".pdf");
        console.log(`PDF generated: ${pdfPath}`);
        resolve(pdfPath);
      }
    });
  });
};

const convertPDFToImages = async (pdfPath) => {
  const outputDir = path.dirname(pdfPath);
  const outputPrefix = path.join(outputDir, "page");
  const opts = {
    format: "png",
    out_dir: outputDir,
    out_prefix: path.basename(outputPrefix),
    page: null,
  };
  console.log(`Converting PDF to images: ${pdfPath}`);
  try {
    await poppler.convert(pdfPath, opts);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const files = await fsPromises.readdir(outputDir);
    const images = files
      .filter((file) => file.startsWith("page") && file.endsWith(".png"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/page-(\d+)\.png/)[1], 10);
        const numB = parseInt(b.match(/page-(\d+)\.png/)[1], 10);
        return numA - numB;
      })
      .map((file) => path.join(outputDir, file));
    console.log(`Generated images: ${images.length} files`);
    return images;
  } catch (err) {
    console.error("Error converting PDF to images:", err);
    throw err;
  }
};

const retryDelete = async (filePath, retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await fsPromises.rm(filePath, { force: true, recursive: true });
      console.log(`Deleted: ${filePath}`);
      return;
    } catch (err) {
      if (i === retries - 1) {
        console.error(`Failed to delete after retries: ${filePath}`, err);
        return;
      }
      console.warn(`Retrying deletion of ${filePath} (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

const downloadFile = async (url, destPath) => {
  const response = await axios.get(url, { responseType: "stream" });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

const extractZip = async (zipPath, extractTo) => {
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: extractTo }))
    .promise();
};

module.exports = {
  checkLibreOffice,
  convertToPDF,
  convertPDFToImages,
  retryDelete,
  downloadFile,
  extractZip,
  sanitize,
};