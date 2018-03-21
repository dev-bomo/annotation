// "https://rest.ensembl.org/variation/human/rs870124?content-type=application/json"

import FileAccess, { VariantData } from './FileAccess';
import HttpAccess from './HttpAccess';

export default class DataParser {
    private _location: string;

    constructor(location: string) {
        this._location = location;
    }

    public buildCSV(): void {
        console.log('Doing the work...');
        let variants: VariantData[] = FileAccess.extractVariantData(this._location);
        console.log('Got variant data from .vcf');
        // go through the variants and for each one do a call to ensembl and one to OMIM and get stuff from the cancer db file

        let restCalls: Promise<void>[] = [];
        let ensemblHost: string = 'rest.ensembl.org';
        let extractedIds: string[] = variants.map((variant: VariantData) => {
            return variant.dbSnpId;
        });

        let pathVar: string = '/variation/homo_sapiens?phenotypes=1';
        restCalls.push(HttpAccess.getBulkEnsemblData(ensemblHost, pathVar, extractedIds).then((itemList: any[]) => {
            variants = this.annotateVariantsFromEnsemblRawVER(variants, itemList);
        }));

        pathVar = '/vep/human/id?variant_class=1&protein=1&hgvs=1';
        restCalls.push(HttpAccess.getBulkEnsemblData(ensemblHost, pathVar, extractedIds).then((itemList: any[]) => {
            variants = this.annotateVariantsFromEnsemblRawVEP(variants, itemList);
        }));

        Promise.all(restCalls).then(() => {
            console.log('gonna write');
            FileAccess.writeVariantData('C:\\workspace\\bdub\\res\\out.csv', variants);
        });
    }

    private annotateVariantsFromEnsemblRawVER(variants: VariantData[], rawEsemblData: any[]): VariantData[] {
        rawEsemblData.forEach((rawItem: any) => {
            if (!rawItem)
                return;
            let variant: VariantData = variants.find((variant: VariantData) => { return variant.dbSnpId === rawItem['id'] });
            if (variant) {
                variant.start = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['start'];
                variant.end = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['end'];
                variant.strand = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['strand'];
                variant.assemblyName = rawItem['mappings'] && rawItem['mappings'][0] && rawItem['mappings'][0]['assembly_name'];
                variant.MAF = rawItem['MAF'];
                variant.clinicalSignificance = rawItem['clinical_significance'];
                variant.mostSevereConsequence = rawItem['most_severe_consequence'];
                variant.phenotypes = (rawItem['phenotypes'] as any[]).map((phenotype: any) => {
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

    private annotateVariantsFromEnsemblRawVEP(variants: VariantData[], rawEsemblData: any[]): VariantData[] {
        rawEsemblData.forEach((rawItem: any) => {
            if (!rawItem)
                return;
            let variant: VariantData = variants.find((variant: VariantData) => { return variant.dbSnpId === rawItem['id'] });
            if (variant && rawItem['transcript_consequences']) {
                variant.transcripts = (rawItem['transcript_consequences'] as any[]).map((element: any) => {
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