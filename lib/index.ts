import * as functions from "firebase-functions";

import express = require('express');
import http = require('http')
import cors = require("cors")

// export { Entsoe} from './Entsoe'
// export { Config} from './Config'
// export { EntsoeConfig } from './interfaces/entsoeCache'

import { Entsoe} from './Entsoe'
// export { Config} from './Config'
// export { EntsoeConfig } from './interfaces/entsoeCache'

const app = express()
app.use(cors({origin: true}));
app.use(Entsoe.init({
  securityToken: process.env.KEY as string
}));

export const e = functions
    .region("europe-west1") // https://firebase.google.com/docs/functions/locations#web
    .runWith({memory: "256MB", timeoutSeconds: 15})
    .https.onRequest(app);
