"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const taquito_1 = require("@taquito/taquito");
const signer_1 = require("@taquito/signer");
const michel_codec_1 = require("@taquito/michel-codec");
const config_1 = require("@nestjs/config");
const Tezos = new taquito_1.TezosToolkit('https://mainnet-tezos.giganode.io');
async function signMessage(key, params) {
    const signer = new signer_1.InMemorySigner(key);
    console.log({ publicKey: await signer.publicKey() });
    Tezos.setProvider({ signer });
    const data = {
        prim: 'Pair',
        args: [
            { string: params.address },
            { int: String(params.token_id) },
            { int: String(params.allocationQty) },
        ],
    };
    const type = {
        prim: 'pair',
        args: [{ prim: 'address' }, { prim: 'int' }, { prim: 'int' }],
    };
    const bytes = (0, michel_codec_1.packDataBytes)(data, type).bytes;
    const result = await signer.sign(bytes);
    console.log(result.sig);
    return result.sig;
}
let AppService = class AppService {
    constructor(configService) {
        this.configService = configService;
    }
    createSignature(params) {
        const key = this.configService.get('KEY');
        const signature = signMessage(key, params);
        return signature;
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppService);
//# sourceMappingURL=app.service.js.map