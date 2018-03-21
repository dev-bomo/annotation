import { clearInterval } from "timers";

var http = require('http');

export default class HttpAccess {
    // do all the server calls here
    private static ensemblApiUrl: string = 'http://rest.ensembl.org/';

    // (OVERLAP)ensembl get all overlaping data for region - can get the ENSG from here
    public static getDataForRegion(chromosome: number, start: number, end: number): any {
        let url: string = HttpAccess.ensemblApiUrl + 'overlap/region/human/' +
            chromosome + ':' + start + '-' + end + '?feature=gene;feature=variation;content-type=application/json';

        http.get(url, (response: any) => {
            let body: string = '';
            let stuff: any;
            response.on('data', (data: string) => {
                body += data;
            });
            response.on('end', () => {
                // stuff = JSON.parse(body);
                console.log(body);
            });
        });
    }

    public static getBulkEnsemblData(host: string, path: string, ids: string[]): Promise<Array<any>> {

        let a: Promise<Array<any>> = new Promise<Array<any>>((resolve: any, reject: any) => {
            let bulkEnsemblResults: Promise<Array<any>>[] = [];

            let i: number = 0;
            let tmr: NodeJS.Timer = setInterval(() => {
                console.log(i);
                let currentChunck: string[] = ids.slice(i, i + 200 > ids.length ? ids.length : i + 200);
                bulkEnsemblResults.push(HttpAccess.getBulk200EnsemblData(host, path, currentChunck));
                i += 200;
                if (i > ids.length) {
                    clearInterval(tmr);
                    let returnedItems: Array<any> = [];
                    Promise.all(bulkEnsemblResults).then((values: Array<any>) => {
                        values.forEach((data: any[]) => { returnedItems = returnedItems.concat(data); });
                    }).then(() => {
                        console.log('resolved whole request')
                        resolve(returnedItems);
                    });
                }
            }, 200);
        });

        return a;
    }

    private static getBulk200EnsemblData(host: string, path: string, ids: string[]): Promise<Array<any>> {
        // http://rest.ensembl.org/variation/homo_sapiens?phenotypes=1
        // http://rest.ensembl.org/vep/human/id?variant_class=1&protein=1&hgvs=1

        let opt: {} = {
            host: host,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        let postData: {} = {
            'ids': ids
        };

        let a: Promise<Array<any>> = new Promise<Array<any>>((resolve: any, reject: any) => {
            let responseBody: string = '';
            let req = http.request(opt, (response: any) => {
                response.on('data', (data: string) => {
                    responseBody += data;
                });
                response.on('end', () => {
                    // parse the body and resolve
                    let responseData: any[] = path.indexOf('vep') > 0 ?
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

    private static extractResponseData(bodyAsString: string, expectedIds: string[]): any[] {
        let response: any = JSON.parse(bodyAsString);
        let returnedItems: any[] = [];
        returnedItems = expectedIds.map((id: string) => {
            let responseDataForId: any = response[id];
            responseDataForId && (responseDataForId['id'] = id);
            return responseDataForId;
        });

        return returnedItems;
    }

    private static extractResponseDataVEP(bodyAsString: string, expectedIds: string[]): any[] {
        let response: any = JSON.parse(bodyAsString);
        let returnedItems: any[] = [];
        returnedItems = expectedIds.map((id: string) => {
            let responseDataForId: any = (response as any[]).find((item: any) => {
                return item['input'] === id && item;
            });
            responseDataForId && (responseDataForId['id'] = id);
            return responseDataForId;
        });

        return returnedItems;
    }

    private static sleep(milliseconds: number) {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }

    // (Phenotype annotations) for an exact region this seems to return ClinVar, COSMIC data
    // http://rest.ensembl.org/phenotype/region/homo_sapiens/1:3328358-3438621?content-type=application/json;feature_type=Variation

    // (Sequence) This is pretty cool because it gives you the wildtype region
    // http://rest.ensembl.org/sequence/region/human/X:1000000..1000100:1?content-type=text/plain

    // (VEP) This gets a lot of info on the variant including sift scores and such
    // http://rest.ensembl.org/vep/human/id/rs56116432?content-type=application/json

    // (VEP) This supports getting multiple ids at once so should be used for larger files. It's a POST call so create the proper body
    // http://rest.ensembl.org/vep/human/id 

    // (Variants) This gets hgvs stuff for a given variant. Useful for basic information? 
    // http://rest.ensembl.org/variant_recoder/human/rs56116432?content-type=application/json

    // (Variation) Some phenotype data for a variation. Dunno if it's useful
    // http://rest.ensembl.org/variation/human/rs699?content-type=application/json;phenotypes=1
}