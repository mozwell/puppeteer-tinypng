const inquirer = require('inquirer');
const boxen = require('boxen');
const Ora = require('ora');
const chalk = require('chalk');
const cliProgress = require('cli-progress');
// const DEFAULT_FORMAT_BAR = require('cli-progress/lib/format-bar');
const { version, license, author } = require('./package.json');

/** DETERMINE THE SOURCE DIRECTORY FOR IMAGES */
const DEFAULT_SRC_DIR = './imgs';
const setSrcDir = async () => {
  if (!process.argv[2]) {
    const answers = await inquirer.prompt([
      {
        name: 'srcDir',
        message: 'Please enter the path of source directory for your images: ',
        default: DEFAULT_SRC_DIR
      }
    ]);
    return answers.srcDir;
  } else {
    return process.argv[2];
  }
};

/** IN THE BEGINNING, DETERMINE WHETHER TO RESUME INCOMPLETE HISTORY TASKS */
const resumeOrNot = async () => {
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'resumeTask',
      message: 'Some images were left in the task queue. Continue converting them or reconvert all images in the target directory?',
      choices: ['Continue incomplete tasks', 'Reconvert all images']
    }
  ]);
  return answers.resumeTask === 'Continue incomplete tasks';
};

/** DISPLAY LOGO AND COPYRIGHT INFO */
const showLogo = () => {
  console.log(
    boxen(chalk.black.bgHex('#efbb35')(` TinyPuppet v${version} \n`) + `${license} © ${author}`, {
      borderColor: '#FF69B4',
      padding: 1,
      margin: 1,
      borderStyle: 'doubleSingle',
      float: 'left',
      align: 'center',
      dimBorder: false
    })
  );
};

/** CUSTOMIZE ORA TO DISPLAY PRETTY INFO */
const ORA_DEFAULT_CONFIG = {
  spinner: 'earth'
};
const customOra = (text) => {
  return new Ora({
    ...ORA_DEFAULT_CONFIG,
    text
  });
};

/** SHOW COMPLETE STATUS */
const showResult = (total, error, milisec) => {
  const min = Math.floor((milisec / 1000) / 60);
  const sec = Math.floor((milisec / 1000) % 60);
  const duration = `${min}m${sec}s`;
  if (error === 0) {
    console.log(`🎉 Congrats! You have successfully minified ${chalk.hex('#FF69B4')(total)} images in ${chalk.hex('#FF69B4')(duration)}.`);
  } else {
    console.log(`❗️ Oops! You have successfully minified ${chalk.hex('#FF69B4')(total - error)} images in ${chalk.hex('#FF69B4')(duration)}. ${chalk.redBright(error)} images failed.`);
  }
};

/** A TINY TIMER */
class Timer {
  constructor() {
    this._status = 'INACTIVE';
  }
  start() {
    this._status = 'ACTIVATED';
    this._startTime = new Date().getTime();
    return this;
  }
  stop() {
    this._status = 'DONE';
    this._stopTime = new Date().getTime();
    return this;
  }
  get status() {
    return this._status;
  }
  get current() {
    return this._status === 'ACTIVATED' && (new Date().getTime() - this._startTime);
  }
  get duration() {
    return this._status === 'DONE' && (this._stopTime - this._startTime);
  }
}

/** DISPLAY A CUSTOMIZED PROGRESS BAR */
// const DEFAULT_FORMATTER = (options, params, payload) => {
//   const COMMON_FORMAT = `${chalk.hex('#FF69B4').bold(`{prefix}`)} {title} | ${chalk.cyan(`{bar}`)} | ${chalk.greenBright(`{percentage} %`)} || ${chalk.hex('#FFDEAD')(`{value}/{total} Files`)} || {duration_formatted}`
//   if (!params.error) {
//     return COMMON_FORMAT;
//   } else {
//     return `${COMMON_FORMAT} || ${chalk.redBright.inverse(`{error} ERRORS`)}`
//   }
// }
// const CUSTOM_FORMAT_BAR = (progress, options) => {
//   let newOptions = {
//     ...options,
//     barsize: 70,
//     barCompleteString: chalk.rgb(0, 255 * progress, 255 * progress)(options.barCompleteString),
//     barIncompleteString: chalk.rgb(0, 255 * progress, 255 * progress)(options.barIncompleteString)
//   };
//   return DEFAULT_FORMAT_BAR(progress, newOptions);
// };
const PROGRESS_DEFAULT_CONFIG = {
  format: `${chalk.hex('#FF69B4').bold(`{prefix}`)} {title} | ${chalk.cyan(`{bar}`)} | ${chalk.greenBright(`{percentage} %`)} || ${chalk.hex('#FFDEAD')(`{value}/{total} Files`)} || {duration_formatted} || ${chalk.red.inverse(`{error} ERRORS`)}`,
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
  // stopOnComplete: true
  // formatBar: CUSTOM_FORMAT_BAR
};
class ProgressBar extends cliProgress.SingleBar {
  constructor(prefix, title) {
    super(PROGRESS_DEFAULT_CONFIG);
    this.prefix = prefix;
    this.title = title;
  }
  start(total, current) {
    super.start(total, current, {
      prefix: this.prefix,
      title: this.title
    });
  }
}
class MultiProgressBar extends cliProgress.MultiBar {
  constructor() {
    super(PROGRESS_DEFAULT_CONFIG);
  }
  create(prefix, title, total, current, error) {
    return super.create(total, current, {
      prefix,
      title,
      error
    });
  }
}

/** IN THE END, ASK WHETHER TO CONTINUE INCOMPLETE TASKS */
const askForContinue = async () => {
  const WAIT_BEFORE_CONTINUE = 5000;
  const PROMPT_CONFIG = [
    {
      type: 'list',
      name: 'resumeTask',
      message: 'Would you like to continue minifying those failed images?',
      choices: ['YES, Continue minifying!', 'NO, I want to quit.']
    }
  ];
  const answersPromise = inquirer.prompt(PROMPT_CONFIG);
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        resumeTask: PROMPT_CONFIG[0].choices[0]
      });
    }, WAIT_BEFORE_CONTINUE);
  });
  const answers = await Promise.race([answersPromise, timeoutPromise]);
  return answers.resumeTask === PROMPT_CONFIG[0].choices[0];
};

module.exports = {
  setSrcDir,
  resumeOrNot,
  showLogo,
  customOra,
  showResult,
  Timer,
  ProgressBar,
  MultiProgressBar,
  askForContinue
};
