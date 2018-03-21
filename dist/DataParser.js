"use strict";
// "https://rest.ensembl.org/variation/human/rs870124?content-type=application/json"
Object.defineProperty(exports, "__esModule", { value: true });
const FileAccess_1 = require("./FileAccess");
const HttpAccess_1 = require("./HttpAccess");
class DataParser {
    constructor(location) {
        this._location = location;
    }
    buildCSV() {
        console.log('Doing the work...');
        let variants = FileAccess_1.default.extractVariantData(this._location);
        console.log('Got variant data from .vcf');
        // go through the variants and for each one do a call to ensembl and one to OMIM and get stuff from the cancer db file
        let restCalls = [];
        let ensemblHost = 'rest.ensembl.org';
        let extractedIds = variants.map((variant) => {
            return variant.dbSnpId;
        });
        let pathVar = '/variation/homo_sapiens?phenotypes=1';
        restCalls.push(HttpAccess_1.default.getBulkEnsemblData(ensemblHost, pathVar, extractedIds).then((itemList) => {
            variants = this.annotateVariantsFromEnsemblRawVER(variants, itemList);
        }));
        pathVar = '/vep/human/id?variant_class=1&protein=1&hgvs=1';
        restCalls.push(HttpAccess_1.default.getBulkEnsemblData(ensemblHost, pathVar, extractedIds).then((itemList) => {
            variants = this.annotateVariantsFromEnsemblRawVEP(variants, itemList);
        }));
        Promise.all(restCalls).then(() => {
            console.log('gonna write');
            FileAccess_1.default.writeVariantData('C:\\workspace\\bdub\\res\\out.csv', variants);
        });
    }
    annotateVariantsFromEnsemblRawVER(variants, rawEsemblData) {
        rawEsemblData.forEach((rawItem) => {
            if (!rawItem)
                return;
            let variant = variants.find((variant) => { return variant.dbSnpId === rawItem['id']; });
            if (variant) {
                variant.start = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['start'];
                variant.end = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['end'];
                variant.strand = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['strand'];
                variant.assemblyName = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['assembly_name'];
                variant.MAF = rawItem['MAF'];
                variant.clinicalSignificance = rawItem['clinical_significance'];
                variant.mostSevereConsequence = rawItem['most_severe_consequence'];
                variant.phenotypes = rawItem['phenotypes'].map((phenotype) => {
                    return {
                        riskAlele: phenotype['risk_allele'],
                        trait: phenotype['trait'],
                        genes: phenotype['genes']
                    };
                });
            }
        });
        return variants;
    }
    annotateVariantsFromEnsemblRawVEP(variants, rawEsemblData) {
        rawEsemblData.forEach((rawItem) => {
            if (!rawItem)
                return;
            let variant = variants.find((variant) => { return variant.dbSnpId === rawItem['id']; });
            if (variant && rawItem['transcript_consequences']) {
                variant.transcripts = rawItem['transcript_consequences'].map((element) => {
                    return {
                        id: element['transcript_id'],
                        polyphen: element['polyphen_score'],
                        sift: element['sift_score'],
                        impact: element['impact']
                    };
                });
            }
        });
        return variants;
    }
}
exports.default = DataParser;
//# sourceMappingURL=DataParser.js.map