const fs = require('fs');
const https = require('https');
const path = require('path');
const { promisify } = require('util');
const makeDir = require('make-dir');
const to = require('await-to-js').default;
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const accessAsync = promisify(fs.access);

const LOG_PATH = './imgs.log';

/** ITERATE ALL FILES (INCLUDING THOSE IN SUBDIRECTORIES) IN A DIRECTORY */
const iterateFiles = async (rootDir) => {
  let resultArr = [];
  let filePathArr = await readdirAsync(rootDir);
  for (let filePath of filePathArr) {
    let fullPath = path.resolve(path.join(rootDir, filePath));
    let stats = await statAsync(fullPath);
    if (stats.isFile()) {
      resultArr.push(fullPath);
    } else {
      resultArr.push(...await iterateFiles(fullPath));
    }
  }
  return resultArr;
};

/** PICK UP FILES WITH IMAGE EXTENSIONS FROM A FILE PATH ARRAY */
const filterImgs = (arr) => {
  let imgPattern = /.(jpg|png|jpeg)$/i;
  return arr.filter((filePath) => {
    return imgPattern.test(filePath);
  });
};

/** MAKE A RECORD FOR IMAGE PATHS */
const logImgs = async (pathArr) => {
  let resultStr = pathArr.join('\n');
  await writeFileAsync(LOG_PATH, resultStr);
  // for (let path of pathArr) {
  //   await writeFileAsync('./imgs.log', path + '\n', {
  //     flag: 'a+'
  //   });
  // }
};

/** RETRIEVE IMAGE PATHS FROM THE LOG */
const parseLog = async () => {
  let log = await readFileAsync(LOG_PATH, 'utf8');
  let pathArr = log.split('\n');
  return pathArr;
};

/** DOWNLOAD IMAGE FROM URL WITH ITS ORIGINAL NAME */
/** MOVE IMAGE SO AS TO KEEP THE ORIGINAL TREE STRCUTURE & MODIFY LOG */
const saveImg = async (url, localRoot, index) => {
  const pattern = /[^\/]+\.\w+$/i;
  const fileName = url.match(pattern)[0];

  const absLocalRoot = path.resolve(localRoot);
  const escapedLocalRoot = absLocalRoot.replace('/', '\/');
  const logPathArr = await parseLog();
  const logPath = logPathArr[index];
  const logPathPattern = new RegExp(`(${escapedLocalRoot})\/(.*${fileName})`, 'i');
  const logPathObj = logPath.match(logPathPattern);
  // console.log('logPath', logPath, 'logPathPattern', logPathPattern, 'logPathObj', logPathObj)
  // const logPathObj = logPath.match(/(.+)\/([^\/]+)\/(.+\.\w+)$/i);

  const fullPath = absLocalRoot + '@tinypng/' + logPathObj[2];
  const fullDir = path.dirname(fullPath);
  await makeDir(fullDir);

  const file = fs.createWriteStream(fullPath);
  await new Promise(resolve => {
    https.get(url, response => {
      response
        .pipe(file)
        .on('finish', resolve);
    });
  });
  let pathArr = await parseLog();
  pathArr[index] = '';
  await logImgs(pathArr);
};

/** DELETE LOG FILE IF ALL IMAGE FILES HAVE BEEN DOWNLOADED */
const clearLog = async () => {
  let imgPathArr = await parseLog();
  if (imgPathArr.filter((imgPath) => imgPath).length === 0) {
    await unlinkAsync(LOG_PATH);
  };
};

/** DETERMINE WHETHER THE LOG FILE EXISTS */
const hasLog = async () => {
  let [ err ] = await to(accessAsync(LOG_PATH));
  return err ? false : true;
};

module.exports = {
  iterateFiles,
  filterImgs,
  logImgs,
  parseLog,
  saveImg,
  clearLog,
  hasLog
};
