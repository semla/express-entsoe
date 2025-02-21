import * as express from 'express'
import { InputError, UpstreamError } from './Errors';
import { Loader } from './Loader';
import { CreateSwagger } from './Swagger';
import { gzip } from 'zlib';
import { Datevalidator } from './Datevalidator';
import { ChartGroup } from './interfaces/charts';
//import { EntsoeCache } from './Cache';
import { EntsoeConfig } from './interfaces/entsoeCache';
//import { ConfigurationOptions, config } from 'aws-sdk';
import axios from 'axios';


export class Entsoe {
  static init(entsoeConfig: EntsoeConfig): express.Router {

    let entsoeDomain = 'https://transparency.entsoe.eu';
    let basePath = '/entsoe';
    entsoeConfig.maxAge = 60*60;

    if (entsoeConfig.basePath) {
      basePath = entsoeConfig.basePath;
    }
    // if (entsoeConfig.maxAge) {
    //   maxAge = entsoeConfig.maxAge;
    // }
    if (entsoeConfig.entsoeDomain) {
      entsoeDomain = entsoeConfig.entsoeDomain;
    }
    // const awsConfig: ConfigurationOptions = {
    //   secretAccessKey: entsoeConfig.awsSecretAccessKey,
    //   accessKeyId: entsoeConfig.awsAccessKeyId,
    //   region: 'eu-central-1'
    // }
    // delete entsoeConfig.awsAccessKeyId;
    // delete entsoeConfig.awsSecretAccessKey;
    // config.update(awsConfig);

    const loader = new Loader(entsoeConfig.securityToken, entsoeDomain);
    const router = express.Router();



    router.use(async (req, res, next) => {
      //if (req.headers?.refresh === 'true') {
        next()
      //} else {
    //     const fileName = req.url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    //     try {
    //       let ETag = '';
    //       const ETagParts = req.headers['if-none-match']?.split('/');
    //       if (ETagParts?.[1]) {
    //         ETag = ETagParts[1];
    //       }
    //       // console.log(`>${ETag}<`)
    //       const stream = await EntsoeCache.read(fileName, entsoeConfig, ETag);
    //       if (!stream) {
    //         res.set('ETag', 'W/' + ETag);
    //         res.set('Last-Modified', (new Date()).toUTCString());
    //         return res.sendStatus(304);
    //       } else {
    //         res.set('Cache-Control', `public, max-age=${maxAge}`);
    //         res.set('content-type', 'application/json');
    //         res.set('content-encoding', 'gzip');
    //         if (stream.Body) {
    //           res.set('ETag', 'W/' + stream.ETag);
    //           res.set('Last-Modified', (new Date()).toUTCString());
    //           res.end(stream.Body, 'binary')
    //         } else {
    //           res.set('ETag', 'W/' + stream.ETag);
    //           res.set('Last-Modified', (new Date()).toUTCString());
    //           stream.file.pipe(res);
    //         }
    //       }
    //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //     } catch (e: any) {
    //       if (e.code !== 'NotModified') {
    //         //console.log('e1', e)
    //         next();
    //       } else {
    //         const ETag = req.headers['if-none-match'];
    //         res.set('ETag', ETag + '');
    //         // res.set('Last-Modified', (new Date()).toUTCString());
    //         res.set('Cache-Control', `public, max-age=${maxAge}`);
    //         res.sendStatus(304)
    //       }
    //     }
    //   }
    });



    router.get(`${basePath}/:country/installed`, async (req, res) => {
      const country = req.params.country;
      try {
        if (req.query.year && typeof (req.query.year) === 'string') {
          const [periodStart, periodEnd] = Datevalidator.getYear(req.query.year);
          const data = await loader.getInstalled(country, periodStart, periodEnd);
          this.cacheAndSend(req, res, data, entsoeConfig);
        } else {
          const data = await loader.getAllInstalled(country);
          this.cacheAndSend(req, res, data, entsoeConfig);
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    router.get(`${basePath}/:country/generation`, async (req, res) => {
      const country = req.params.country;
      let psrType: string | undefined
      if (typeof (req.query.psrType) === 'string') {
        psrType = req.query.psrType;
      }
      try {
        const [periodStart, periodEnd] = Datevalidator.getStartEnd(req.query);
        const data = await loader.getEntsoeData(country, 'generation', periodStart, periodEnd, psrType);
        this.cacheAndSend(req, res, data, entsoeConfig);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    router.get(`${basePath}/:country/generation_per_plant`, async (req, res) => {
      const country = req.params.country;
      let psrType: string | undefined
      if (typeof (req.query.psrType) === 'string') {
        psrType = req.query.psrType;
      }
      try {
        const [periodStart, periodEnd] = Datevalidator.getStartEnd(req.query);
        const data = await loader.getEntsoeData(country, 'generation_per_plant', periodStart, periodEnd, psrType);
        this.cacheAndSend(req, res, data, entsoeConfig);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    router.get(`${basePath}/:country/prices`, async (req, res) => {
      const country = req.params.country;
      try {
        const [periodStart, periodEnd] = Datevalidator.getStartEnd(req.query);
        const data = await loader.getEntsoeData(country, 'prices', periodStart, periodEnd);
        this.cacheAndSend(req, res, data, entsoeConfig);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    router.get(`${basePath}/:country/hydrofill`, async (req, res) => {
      const country = req.params.country;
      try {
        const [periodStart, periodEnd] = Datevalidator.getStartEnd(req.query, true);
        const data = await loader.getEntsoeData(country, 'hydrofill', periodStart, periodEnd);
        this.cacheAndSend(req, res, data, entsoeConfig);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    router.get(`${basePath}/:country/load`, async (req, res) => {
      const country = req.params.country;
      try {
        const [periodStart, periodEnd] = Datevalidator.getStartEnd(req.query);
        const data = await loader.getEntsoeData(country, 'load', periodStart, periodEnd);
        this.cacheAndSend(req, res, data, entsoeConfig);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    router.get(`${basePath}/datalists/countries`, async (req, res) => {
      try {
        const data = await loader.getCountries();
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(data);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    router.get(`${basePath}/datalists/psrtypes`, async (req, res) => {
      try {
        const data = await loader.getPsrTypes();
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(data);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })


    router.get(`${basePath}`, async (req, res) => {
      try {
        const data = await CreateSwagger.load(basePath);
        res.set('Cache-Control', 'public, max-age=31536000');
        res.send(data);
      } catch (e: unknown) {
        if (e instanceof Error) {
          this.errorHandler(res, e);
        }
      }
    })

    return router;
  }

  private static cacheAndSend(req: express.Request, res: express.Response, data: ChartGroup, config: EntsoeConfig): void {
    const buf = Buffer.from(JSON.stringify(data), 'utf-8');
    gzip(buf, async (_, result) => {
      //res.set('etag', (new Date()).getTime() + '');  //assuming the file will be writen in same second
      if (req.get('accept-encoding')?.indexOf('gzip') !== -1) {
        res.set('content-type', 'application/json');
        res.set('content-encoding', 'gzip');
        res.set('Last-Modified', (new Date()).toUTCString());
        // set the cache to longer if it is data that will not be updated, like data further back than yesterday
        if (endOfPeriodIsFurtherBackThanYesterday(data)){
          res.set('Cache-Control', `public, max-age=${60*60*24*10}, s-maxage=${60*60*24*30}`);
        } else {
          res.set('Cache-Control', `public, max-age=${config.maxAge}`);
        }

        // todo: use etag even if no cache file?
        // const ETag = await EntsoeCache.write(result, req.url, config);
        // if (ETag) {
        //   res.set('Last-Modified', (new Date()).toUTCString());
        //   res.set('ETag', 'W/' + ETag);  //aws ETag
        // }
        res.send(result);
      } else {
        res.send(data); // all browsers support gzip, I guess that is why no headers are set here
      }
      //EntsoeCache.write(result, req.url, config);
      /*
      const fileName = req.url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileDirName = path.join(cacheDir, fileName);
      writeFile(fileDirName, result, (e) => {
        if (e) {
          console.log(e);
        }
      })
      */
    });

     function endOfPeriodIsFurtherBackThanYesterday(data:ChartGroup):boolean {
       const endDate = new Date(data.dataInterval?.end as string);
       return (new Date().getTime() - endDate.getTime() > 24*60*60*1000)
     }
  }

  private static errorHandler(res: express.Response, e: Error): express.Response {
    if (e instanceof InputError) {
      return res.status(e.status).send({
        title: 'Invalid input',
        detail: e.message,
        status: 400
      });
    }
    if (e instanceof UpstreamError) {
      return res.status(e.rfc7807.status).send(e.rfc7807)
    }
    console.trace(e.message);
    if (axios.isAxiosError(e)) {
      console.log(`ENTSOE ERROR ${e.response?.status} ${e.response?.statusText}`)
      return res.status(e.response?.status || 500).send(`ENTSOE ERROR ${e.response?.statusText}`);
    } else {
      return res.status(500).send('unexpected internal error');
    }
  }
  /*
  static async writeCachedFile(data: string, cacheDir: string, url: string): Promise<void>{
    const fileName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileDirName = path.join(cacheDir, fileName);
    writeFile(fileDirName, data, (e) => {
      if (e) {
        console.log(e);
      }
    })
  }

  static async getCachedFile(fileDirName: string, ETag?: string): Promise<ReadStream | undefined> {
    const stats = await promises.stat(fileDirName);
    const fileTime = (new Date(stats.mtime)).getTime() + '';

    if (fileTime === ETag) {
      return;
    } else {
      const stream = createReadStream(fileDirName).on('error', e => {
        throw e;
      });
      return stream;

    }
  }
  */
}

