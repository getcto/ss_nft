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
const utils_1 = require("@taquito/utils");
const config_1 = require("@nestjs/config");
const Tezos = new taquito_1.TezosToolkit('https://mainnet-tezos.giganode.io');
async function signMessage(key, message) {
    const signer = new signer_1.InMemorySigner(key);
    Tezos.setProvider({ signer });
    const dappUrl = 'star-symphony.app';
    const ISO8601formatedTimestamp = new Date().toISOString();
    const formattedInput = [
        'Tezos Signed Message:',
        dappUrl,
        ISO8601formatedTimestamp,
        message,
    ].join(' ');
    const bytes = (0, utils_1.char2Bytes)(formattedInput);
    const bytesLength = (bytes.length / 2).toString(16);
    const addPadding = `00000000${bytesLength}`;
    const paddedBytesLength = addPadding.slice(addPadding.length - 8);
    const payloadBytes = '05' + '01' + paddedBytesLength + bytes;
    const signature = signer.sign(payloadBytes);
    return (await signature).sig;
}
let AppService = class AppService {
    constructor(configService) {
        this.configService = configService;
    }
    signForAddress(address) {
        const key = this.configService.get('KEY');
        return signMessage(key, address);
    }
};
exports.AppService = AppService;
exports.AppService = AppService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppService);
//# sourceMappingURL=app.service.js.map