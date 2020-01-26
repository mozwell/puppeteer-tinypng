# TinyPuppet

> TinyPuppet (aka puppeteer-tinypng) is an elegant tool which helps you minify .png or .jp(e)g files on TinyPNG via Puppeteer (Headless Chrome).

## ✨ Features
- 💪 Work without the Developer API key.
- 💅 A beautiful & friendly GUI.
- 🌳 Tree structure of the source directory is kept.
- 👾 The upload & download processes are fully automated.
- 📝 Log failed tasks & re-minify images.

## 🔨 Usage
The simplest and most common usage:
```bash
git clone https://github.com/mozwell/puppeteer-tinypng.git
cd puppeteer-tinypng
npm start
```

You could also pass the path of your source directory as the first parameter:
```bash
npm start <srcDir>
```
It could be a relative path (e.g. ./imgs), or an absolute path (e.g. /Users/mozwell/imgs).

The target directory will be at the same location as your source directory. It will have the same name as your source directory, with an '@tinypng' suffix.

## ©️ License

MIT © [mozwell](https://github.com/mozwell)

## 🙏 Contribution
All kinds of contribution are welcomed, please submit PRs if you've got any good idea. Issues are also kindly appreciated.
