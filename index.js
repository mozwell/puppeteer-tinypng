const puppeteer = require('puppeteer');
const to = require('await-to-js').default;
const _Array = require('lodash/array');
const {
  iterateFiles,
  filterImgs,
  logImgs,
  parseLog,
  saveImg,
  clearLog,
  hasLog
} = require('./file');
const {
  setSrcDir,
  resumeOrNot,
  showLogo,
  customOra: ora,
  showResult,
  Timer,
  MultiProgressBar,
  askForContinue
} = require('./info');

(async () => {
  showLogo();
  let UPLOAD_TOTAL = 0, DOWNLOAD_TOTAL = 0, UPLOAD_CURRENT = 0, DOWNLOAD_CURRENT = 0, UPLOAD_ERROR = 0, DOWNLOAD_ERROR = 0;
  const RESUME_TASK = await hasLog() && await resumeOrNot();
  const CURRENT_SRC_DIR = await setSrcDir();
  const INTERVAL_BETWEEN_TASKS = 2000;
  const IMAGES_PER_TASK = 20;
  const INTERVAL_BETWEEN_UPLOADS = 1300;
  const totalTimer = new Timer().start();

  /** LAUNCH PUPPETEER */
  const progress1 = ora('Launch browser').start();
  const browser = await puppeteer.launch({
    /** SET THE PATH WHERE YOUR CHROMIUM APP IS LOCATED */
    // executablePath: '/Users/mozwell/chromium/Chromium.app/Contents/MacOS/Chromium',
    /** STOP THE ENTIRE PROCESS IF YOUR CHROMIUM DOESN'T START IN TIME */
    timeout: 15000,
    ignoreHTTPSErrors: true,
    headless: true
  });
  progress1.succeed();

  /** LOG & RETRIEVE ALL IMAGES IN THE SOURCE DIRECTORY */
  const progress2 = ora('Make records for local images').start();
  let imgFiles =
    RESUME_TASK
      ? (await parseLog()).filter((item) => item)
      : filterImgs(await iterateFiles(CURRENT_SRC_DIR));
  await logImgs(imgFiles);
  progress2.succeed();

  /** INITIALIZE UPLOAD & DOWNLOAD PROGRESS BARS */
  const multiBars = new MultiProgressBar();
  UPLOAD_TOTAL = imgFiles.length;
  DOWNLOAD_TOTAL = imgFiles.length;
  const uploadBar = multiBars.create('⬆', 'Uploading', UPLOAD_TOTAL, UPLOAD_CURRENT, UPLOAD_ERROR);
  const downloadBar = multiBars.create('⬇', 'Downloading', DOWNLOAD_TOTAL, DOWNLOAD_CURRENT, DOWNLOAD_ERROR);

  /** A FIXED AMOUNT OF IMAGES PER TASK (DUE TO THE MAXIMUM) */
  const taskArr = _Array.chunk(imgFiles, IMAGES_PER_TASK);
  for (const [index, task] of taskArr.entries()) {

    /** OPEN A NEW PAGE FOR CURRENT TASK */
    const page = await browser.newPage();
    /** A HEADLFUL CRHOME UA IS NEED TO BYPASS THE ANTI-SCRAPING SNIFFER */
    const FAKE_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3391.0 Safari/537.36';
    await page.setUserAgent(FAKE_UA);
    // console.log(await page.evaluate(() => navigator.userAgent));
    const gotoPromise = page.goto('https://www.tinypng.com/', {
      waitUntil: 'networkidle2',
      timeout: 0
    });
    const inputEl = await page.waitForSelector('input[type=file]');
    Promise.resolve(gotoPromise).catch();

    /** UPLOAD ALL IMAGES ONE BY ONE AT A FIXED INTERVAL & LISTEN TO REQUESTS */
    page.on('requestfinished', request => {
      if (request.url() === 'https://tinypng.com/web/shrink') {
        if (request.response().status() !== 201) {
          UPLOAD_ERROR++;
        }
        UPLOAD_CURRENT++;
        uploadBar.update(UPLOAD_CURRENT, {
          error: UPLOAD_ERROR
        });
      }
    });
    for (const imgPath of task) {
      await inputEl.uploadFile(imgPath);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, INTERVAL_BETWEEN_UPLOADS);
      });
    };

    /** DOWNLOAD IMAGES ONE BY ONE AND DELETE CORRESPONDING RECORD */
    for (const [subIndex, imgPath] of task.entries()) {
      const absIndex = index * IMAGES_PER_TASK + subIndex;
      const DOWNLOAD_LINK_SELECTOR = `ul .upload:nth-of-type(${subIndex + 1}) .after a`;
      const ERROR_SELECTOR = `ul .upload:nth-of-type(${subIndex + 1}) .error`;
      const successPromise = page.waitForSelector(DOWNLOAD_LINK_SELECTOR);
      const errorPromise = page.waitForSelector(ERROR_SELECTOR);
      await Promise.race([successPromise, errorPromise]);
      const hasLink = await page.$(DOWNLOAD_LINK_SELECTOR);
      if (hasLink) {
        const link = await page.$eval(DOWNLOAD_LINK_SELECTOR, el => el.href);
        await saveImg(link, CURRENT_SRC_DIR, absIndex);
      } else {
        DOWNLOAD_ERROR++;
      }
      DOWNLOAD_CURRENT++;
      downloadBar.update(DOWNLOAD_CURRENT, {
        error: DOWNLOAD_ERROR
      });
    }

    /** CLOSE CURRENT PAGE */
    await page.waitFor(INTERVAL_BETWEEN_TASKS);
    await page.close();
  }

  /** STOP ALL PROGRESS BARS & SHOW RESULT & CONTINUE FAILED TASKS */
  multiBars.stop();
  showResult(DOWNLOAD_TOTAL, DOWNLOAD_ERROR, totalTimer.stop().duration);
  // const IS_CONTINUE = await hasLog() && await askForContinue();

  /** CLEAR LOG AND CLOSE BROWSER */
  const progress3 = ora('Clear log and close browser').start();
  await clearLog();
  await browser.close();
  progress3.succeed();
})();
