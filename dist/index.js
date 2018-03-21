"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DataParser_1 = require("./DataParser");
function bootstrap() {
    let dataParser = new DataParser_1.default('C:\\workspace\\bdub\\res\\1984_S1.vcf');
    dataParser.buildCSV();
}
bootstrap();
//# sourceMappingURL=index.js.map