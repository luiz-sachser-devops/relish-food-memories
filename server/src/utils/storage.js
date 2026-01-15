const fs = require('fs');
const path = require('path');

const ensureDirectory = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const buildRelativePath = ({ day, phaseIndex, moduleId }) => {
  const numericDay = Number(day) || day;
  const numericPhase = Number(phaseIndex);
  const parts = [
    `day-${numericDay}`,
    `phase-${Number.isNaN(numericPhase) ? phaseIndex : numericPhase + 1}`
  ];

  if (moduleId) {
    parts.push(moduleId.replace(/\s+/g, '-').toLowerCase());
  }

  return parts.join('/');
};

const getUploadRoot = () => process.env.UPLOAD_ROOT || 'uploads';

const resolveStoragePath = (metadata) => {
  const uploadRoot = getUploadRoot();
  const relativeDir = buildRelativePath(metadata);
  const absoluteDir = path.join(process.cwd(), uploadRoot, relativeDir);

  ensureDirectory(absoluteDir);

  return {
    absoluteDir,
    relativeDir
  };
};

module.exports = {
  resolveStoragePath,
  getUploadRoot
};
