const decode = require('base-64').decode;
const crypto = require('crypto');
const Constants = require('./Constants');

function calculateMAC(key, data) {
    const hmac = crypto.createHmac("sha256", key);
    hmac.update(data);
    return Buffer.from(hmac.digest());
}

function deriveSecrets(input, salt, info, size) {
    const PRK = calculateMAC(salt, input);
    let idx = 1;
    const infoArray = new Uint8Array(info.byteLength + 33);

    infoArray.set(info, 32);
    infoArray[infoArray.length - 1] = idx++;

    let lastStep = calculateMAC(PRK, Buffer.from(infoArray.slice(32)));
    const signed = [...lastStep];
    let remainingBytes = size - lastStep.length;

    while (remainingBytes > 0) {
        infoArray.set(lastStep);
        infoArray[infoArray.length - 1] = idx++;

        lastStep = calculateMAC(PRK, Buffer.from(infoArray));
        const stepSize = Math.min(remainingBytes, lastStep.length);
        signed.push(...lastStep.slice(0, stepSize));
        remainingBytes -= stepSize;
    }

    return Buffer.from(signed);
}

function hdkf(key, type, size) {
    try {
        return deriveSecrets(
            Buffer.from(key, "base64"),
            Constants.EMPTY_SALT,
            Buffer.from(Constants.CRYPT_KEYS[type], "hex"),
            size,
        );
    } catch (error) {
        throw new Error(`Error while generating composed token: ${error}`);
    }
}

exports.isEncrypted = model => model.mediaKey
    && model.clientUrl
    && model.clientUrl.endsWith(".enc");

exports.decrypt = (dataBuffer, model) => {
    let { mediaKey } = model;
    let composedToken = "";

    try {
        decode(mediaKey);
    } catch (error) {
        try {
            mediaKey += ("=" * (mediaKey.length % 3));
            decode(mediaKey);
        } catch (e) {
            throw new DecryptionError(`Error in media key: ${e}`);
        }
    }

    composedToken = hdkf(mediaKey, model.type, 112);

    const iv = composedToken.slice(0, 16);
    const cipherKey = composedToken.slice(16, 48);
    const data = dataBuffer.slice(0, dataBuffer.length - 10);

    try {
        const decipher = crypto.createDecipheriv("aes-256-cbc", cipherKey, iv);
        return Buffer.concat([decipher.update(data), decipher.final()]);
    } catch (error) {
        throw error;
    }
};
