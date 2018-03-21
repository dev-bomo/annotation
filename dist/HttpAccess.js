"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const timers_1 = require("timers");
var http = require('http');
class HttpAccess {
    // (OVERLAP)ensembl get all overlaping data for region - can get the ENSG from here
    static getDataForRegion(chromosome, start, end) {
        let url = HttpAccess.ensemblApiUrl + 'overlap/region/human/' +
            chromosome + ':' + start + '-' + end + '?feature=gene;feature=variation;content-type=application/json';
        http.get(url, (response) => {
            let body = '';
            let stuff;
            response.on('data', (data) => {
                body += data;
            });
            response.on('end', () => {
                // stuff = JSON.parse(body);
                console.log(body);
            });
        });
    }
    static getBulkEnsemblData(host, path, ids) {
        let a = new Promise((resolve, reject) => {
            let bulkEnsemblResults = [];
            let i = 0;
            let tmr = setInterval(() => {
                console.log(i);
                let currentChunck = ids.slice(i, i + 200 > ids.length ? ids.length : i + 200);
                bulkEnsemblResults.push(HttpAccess.getBulk200EnsemblData(host, path, currentChunck));
                i += 200;
                if (i > ids.length) {
                    timers_1.clearInterval(tmr);
                    let returnedItems = [];
                    Promise.all(bulkEnsemblResults).then((values) => {
                        values.forEach((data) => { returnedItems = returnedItems.concat(data); });
                    }).then(() => {
                        console.log('resolved whole request');
                        resolve(returnedItems);
                    });
                }
            }, 200);
        });
        return a;
    }
    static getBulk200EnsemblData(host, path, ids) {
        // http://rest.ensembl.org/variation/homo_sapiens?phenotypes=1
        // http://rest.ensembl.org/vep/human/id?variant_class=1&protein=1&hgvs=1
        let opt = {
            host: host,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };
        let postData = {
            'ids': ids
        };
        let a = new Promise((resolve, reject) => {
            let responseBody = '';
            let req = http.request(opt, (response) => {
                response.on('data', (data) => {
                    responseBody += data;
                });
                response.on('end', () => {
                    // parse the body and resolve
                    let responseData = path.indexOf('vep') > 0 ?
                        HttpAccess.extractResponseDataVEP(responseBody, ids) : HttpAccess.extractResponseData(responseBody, ids);
                    console.log('gotResponse');
                    resolve(responseData);
                });
            });
            req.write(JSON.stringify(postData));
            req.end();
        });
        return a;
    }
    static extractResponseData(bodyAsString, expectedIds) {
        let response = JSON.parse(bodyAsString);
        let returnedItems = [];
        returnedItems = expectedIds.map((id) => {
            let responseDataForId = response[id];
            responseDataForId && (responseDataForId['id'] = id);
            return responseDataForId;
        });
        return returnedItems;
    }
    static extractResponseDataVEP(bodyAsString, expectedIds) {
        let response = JSON.parse(bodyAsString);
        let returnedItems = [];
        returnedItems = expectedIds.map((id) => {
            let responseDataForId = response.find((item) => {
                return item['input'] === id && item;
            });
            responseDataForId && (responseDataForId['id'] = id);
            return responseDataForId;
        });
        return returnedItems;
    }
    static sleep(milliseconds) {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }
}
// do all the server calls here
HttpAccess.ensemblApiUrl = 'http://rest.ensembl.org/';
exports.default = HttpAccess;
//# sourceMappingURL=HttpAccess.js.map