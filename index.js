const fs = require('fs');
const path = require('path');
const mkdir = require('mkdirp');
const axios = require('axios');
const prompts = require('prompts');
const puppeteer = require('puppeteer');
const ora = require('ora');

const rmspace = str => str.split(' ').join('');

const readdir = (dir, cb) => {
  fs.readdir(dir, async (readErr) => {
    if (readErr) {
      return mkdir(dir, (mkErr) => {
        cb(mkErr);
      });
    } 
    cb();
  });
};

const process = (answer, data) => {
  const regex = /url\(([^)]+)\)/g;// find "url(blabla)"
  const parsedUrlStr = data.match(regex);

  // url(blabla) => blabla
  const getUrl = str => str.substring(4, str.length - 1);
  const getFamily = str => rmspace(str).toLowerCase();
  const getFilename = url => getFamily(answer.family) + '_' + rmspace(url.split('/').pop());

  const urls = parsedUrlStr.map(getUrl);

  const downloadFonts = (cb) => {
    const spinner = ora('Downloading font').start();

    const dir = answer.fontsDir;
     
    const request = async (url, onRequest) => {
      const filename = getFilename(url);
      
      try {
        const { data } = await axios({
          url,
          method: 'GET',
          responseType: 'stream',
        });
    
        const stream = fs.createWriteStream(
          path.resolve(dir, filename)
        );

        stream.on('finish', onRequest);

        data.pipe(stream);
      } catch (error) {
        console.log('Failed to download ' + url);
        onRequest();
      }
    };

    readdir(dir, (err) => {
      if (err) {
        return spinner.fail('Failed to read ' + dir);
      }

      let requested = 0;

      urls.forEach((url) => {
        request(url, () => {
          requested += 1;

          if (requested === urls.length) {
            spinner.succeed();
            cb();
          }
        });
      });
    });
  };
  
  const generateStylesheet = (cb) => {
    const spinner = ora('Generating [font].css').start();

    const dir = answer.cssDir;
    const filename = rmspace(answer.family).toLowerCase() + '.css';
    const relativeDir = path.relative(answer.cssDir, answer.fontsDir).replace(/\\/g, '/') + '/';

    const stylesheet = 
      data.replace(regex, str => `url(${relativeDir}${getFilename(getUrl(str))})`)
      + '\n'
      + 'body {'
      + '\n'
      + `  font-family: '${answer.family}', sans-serif;`
      + '\n'
      + '}';
  
    const generate = () => {
      fs.writeFile(path.resolve(dir, filename), stylesheet, (err) => {
        if (err) {
          return spinner.fail('Failed to generate [font].css');
        }
        spinner.succeed();
        cb();
      });
    };
    
    readdir(dir, (err) => {
      if (err) {
        return onError('Failed to read ' + dir);
      }
      generate();
    });
  };
  
  downloadFonts(() => {
    generateStylesheet(() => {
      console.log('Owned!');
    });
  });
};

const init = async (questions) => {
  const answer = await prompts(questions);

  const spinner = ora('Prepare to download').start();
  const notFound = () => spinner.fail('Font not found');

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(`https://fonts.googleapis.com/css?family=${answer.family}:${answer.weights.join(',')}&display=swap`);
    const data = await page.$eval('body', el => el.textContent);

    if (data.indexOf('@font-face') > -1) {
      spinner.succeed();
      process(answer, data)
    } else {
      notFound();
    }

    await browser.close();
  } catch (error) {
    notFound();
  }
};

init([
  {
    type: 'text',
    name: 'family',
    message: 'Font family',
    validate: str => str && rmspace(str).length,
  },
  {
    type: 'list',
    name: 'weights',
    message: 'Font weights (400,700)',
    initial: '400',
  },
  {
    type: 'text',
    name: 'fontsDir',
    message: 'Dir (fonts will be downloaded)',
    initial: './',
  },
  {
    type: 'text',
    name: 'cssDir',
    message: 'Dir ([font].css output)',
    initial: './',
  },
]);
