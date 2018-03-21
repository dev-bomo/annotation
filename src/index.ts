import DataParser from './DataParser';
import { setTimeout } from 'timers';

function bootstrap() {
    let dataParser: DataParser = new DataParser('C:\\workspace\\bdub\\res\\1984_S1.vcf');
    dataParser.buildCSV();
}

bootstrap();