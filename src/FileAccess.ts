import * as fs from 'fs';

export interface VariantData {
    chromosome: number;
    position: number;
    start?: number;
    end?: number;
    strand?: string;
    dbSnpId: string;
    refBase: string;
    altBase: string;
    quality: number;
    infoBlob: string;
    info?: VariantInfo;
    assemblyName?: string;
    phenotypes?: {
        riskAlele: string;
        trait: string;
        genes: string;
    }[];
    transcripts?: {
        id: string,
        polyphen: number,
        sift: number,
        impact: string
    }[],
    MAF?: number;
    mostSevereConsequence?: string;
    clinicalSignificance?: string[];
}

export interface VariantInfo {
    /**
     * Approximate read depth (DP)
     */
    AproxReadDepth: number;

    /**
     * Genotype (GT)
     */
    Genotype: string;
}

/**
 * Does file manipulation and extracts and writes variant data.
 */
export default class FileAccess {
    /**
     * Parses a given .vcf file and returns the variant data in a structured format
     * @param location The absolute path to the file that needs to be parsed
     */
    public static extractVariantData(location: string): VariantData[] {
        let line: string = '';
        let validData: boolean = false;

        let fileContent: string = fs.readFileSync(location, 'utf8');
        let lines: string[] = fileContent.split('\n');
        let linIdx: number = 0;

        let variantData: VariantData[] = [];

        while (line = lines[linIdx++]) {
            if (validData) {
                // build the variant 
                let data: string[] = line.split('\t');
                variantData.push(FileAccess.createVariantFromStringArray(data));
            }

            if (line.indexOf('#CHROM') === 0) {
                // this is the table head, after this there's valid information
                validData = true;
            }
        }
        return variantData;
    }

    /**
     * Writes the variant data to a file at the given location
     * @param location The absolute path to the file that will be written
     * @param variantData The data to be written
     */
    public static writeVariantData(location: string, variantData: VariantData[]): void {
        console.log('data');
        let stream: fs.WriteStream = fs.createWriteStream(location, { flags: 'a' });
        stream.write(FileAccess.getHeaderLine() + '\n');
        variantData.forEach((variant: VariantData) => {
            stream.write(FileAccess.convertVariantDataToString(variant) + '\n');
        });
    }

    private static getHeaderLine(): string {
        return 'rs, chr, start, end, ref, alt, strand, quality, most_severe_consequence, MAF, clinical_significance, assembly_name, phenotypes, gene, transcripts(id polyphen sift impact)';
    }

    /**
     * Writes a one line string containing all the properties of the variant object in order
     * @param variant The variant data to be written
     */
    private static convertVariantDataToString(variant: VariantData): string {
        let pheno: string = '';
        variant.phenotypes && variant.phenotypes.forEach((pt: { riskAlele: string, trait: string, genes: string }) => {
            pheno += pt.trait + ' ';
        });

        let trans: string = '';
        variant.transcripts && variant.transcripts.forEach((transcript: { id: string, polyphen: number, sift: number, impact: string }) => {
            trans += transcript.id + ' ' + (transcript.polyphen ? transcript.polyphen + ' ' : '') +
                (transcript.sift ? transcript.sift + ' ' : '') + transcript.impact + ';';
        });

        return variant.dbSnpId + ',' +
            variant.chromosome + ',' +
            variant.position + ',' +
            variant.end + ',' +
            variant.refBase + ',' +
            variant.altBase + ',' +
            variant.strand + ',' +
            variant.quality + ',' +
            variant.mostSevereConsequence + ',' +
            variant.MAF + ',' +
            variant.clinicalSignificance + ',' +
            variant.assemblyName + ',' +
            pheno + ',' +
            (variant.phenotypes && variant.phenotypes.length > 0 && variant.phenotypes[0].genes) + ',' +
            trans;
    }

    /**
     * Tries to parse the data in a specific string array and dumps it in a VariantData. Does
     * not fill in VariantInfo
     * @param data The string array containing the data. This format is expected:
     * #CHROM	POS	ID	REF	ALT	QUAL	FILTER	INFO	FORMAT	1
     */
    private static createVariantFromStringArray(data: string[]): VariantData {
        let variant: VariantData = null;
        try {
            variant = {
                chromosome: data[0].length === 4 ?
                    parseInt(data[0].substr(data[0].length - 1, 1)) :
                    parseInt(data[0].substr(data[0].length - 2, 2)),
                position: parseInt(data[1]),
                dbSnpId: data[2],
                refBase: data[3],
                altBase: data[4],
                quality: parseInt(data[5]),
                infoBlob: data[7]
            }
        } catch {
            // we don't want to interrupt the process in case there's one row that's of a different format
        }

        return variant;
    }
}