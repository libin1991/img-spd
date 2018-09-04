const puppeteer = require("puppeteer");
const path = require("path");
const { promisify } = require("util");
const http = require("http");
const https = require("https");
const fs = require("fs");

const folder = "/download";
const target = path.join(__dirname, folder);
if (!fs.existsSync(target)) {
  fs.mkdirSync(target);
}

// url => image
const urlToImg = promisify((url, dir, callback) => {
  const mod = /^https:/.test(url) ? https : http;
  const ext = path.extname(url);
  const file = path.join(dir, `${Date.now()}${ext}`);

  mod.get(url, res => {
    res.pipe(fs.createWriteStream(file)).on("finish", () => {
      callback();
      console.log(file);
    });
  });
});

// base64 => image
const base64ToImg = async function(base64Str, dir) {
  // data:image/jpeg;base64,/asdasda

  const matches = base64Str.match(/^data:(.+?);base64,(.+)$/);
  try {
    const ext = matches[1].split("/")[1].replace("jpeg", "jpg");
    const file = path.join(dir, `${Date.now()}.${ext}`);

    await fs.writeFile(file, matches[2], "base64");
    console.log(file);
  } catch (ex) {
    console.log("非法 base64 字符串");
    console.log(ex);
  }
};

const convertToImg = async (src, dir) => {
  if (/\.(jpg|png|gif)$/.test(src)) {
    await urlToImg(src, dir);
  } else {
    await base64ToImg(src, dir);
  }
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("https://image.baidu.com/");
  console.log("go to https://image.baidu.com/");

  await page.focus("#kw");
  await page.keyboard.sendCharacter("狗");
  await page.waitFor(".s_search");
  await page.click(".s_search");
  console.log("go to search list");

  page.on("load", async () => {
    console.log("page loading done, start fetch...");

    const srcs = await page.evaluate(() => {
      const images = document.querySelectorAll("img.main_img");
      return Array.prototype.map.call(images, img => img.src);
    });
    console.log("srcs: ", srcs);
    console.log(`get ${srcs.length} images, start download`);

    for (let i = 0; i < srcs.length; i++) {
      // sleep
      await page.waitFor(200);
      await convertToImg(srcs[i], target);
    }

    await browser.close();
  });
})();