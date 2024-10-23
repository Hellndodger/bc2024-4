let { program } = require('commander');
let http = require('http');
let fs = require('fs').promises; 
let path = require('path');
let superagent = require('superagent');

program
  .requiredOption('-h, --host <address>', 'address port')
  .requiredOption('-p, --port <number>', 'port of the server')
  .requiredOption('-c, --cache <path>', 'path to the directory that contins the files');

program.parse(process.argv);

let options = program.opts();

let requestListener = async function (req, res) {
  let filePath = path.join(options.cache, req.url + ".jpg");

  switch(req.method){
    case 'GET':
      fs.readFile(filePath)
      .then(content => {
        console.log('Image has been taken from the cache,success');
        res.setHeader("Content-Type", "image/jpeg");
        res.writeHead(200);
        res.end(content);
      })
      .catch(async () => {
        try {
          const content = await superagent.get(path.join('https://http.cat/' + req.url));
          await fs.writeFile(filePath, content.body);
          console.log('Картинку взято з сайту');
          res.setHeader("Content-Type", "image/jpeg");
          res.writeHead(200);
          res.end(content.body);
        } catch (err) {
          console.log('Request ended with an error unfortunetely');
          console.log(err);
          res.writeHead(404);
          res.end();
        }
      });
      break;
    case 'PUT':
      const chunks = [];

      req.on('data', chunk => {
        chunks.push(chunk);
      });

      req.on('end', async () => {
        const imageBuffer = Buffer.concat(chunks); 

        fs.writeFile(filePath, imageBuffer)
        .then(() => {
          res.setHeader("Content-Type", "text/plain");
          res.writeHead(201);
          res.end('Image saved successfully slava bohu.');
        })
        .catch(err => {
          console.error('Error saving image: damn', err);
          res.writeHead(500);
          res.end('Error saving image oops someone wrote shitty code(me).');
        });
      });

      req.on('error', (err) => {
        console.error('Request error:', err);
        res.writeHead(400);
        res.end('Bad request.');
      });
      break;
    case 'DELETE':
      fs.unlink(filePath)
      .then(() => {
        res.setHeader("Content-Type", "text/plain");
        res.writeHead(200);
        res.end('Image deleted successfully.');
      })
      .catch(() => {
        console.error('No picture in cache: same as in your future oohh', filePath);
        res.writeHead(404);
        res.end();
      });
      break;
    default:
      console.error('Wrong method');
      res.writeHead(405);
      res.end();
      break;
  }
};

let server = http.createServer(requestListener);

server.listen(options.port, options.host, () => {
  console.log(`Server is listening on http://${options.host}:${options.port}`);
});
