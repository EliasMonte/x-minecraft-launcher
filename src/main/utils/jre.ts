import { Net, Task } from '@xmcl/minecraft-launcher-core';
import Unzip from '@xmcl/unzip';
import { exec } from 'child_process';
import { createHash } from 'crypto';
import { app, net } from 'electron';
import { createDecompressor } from 'lzma-native';
import os from 'os';
import { basename, join, resolve } from 'path';
import fs from './vfs';

export async function officialEndpoint(context: Task.Context) {
    console.log('Try auto Java from Mojang source');
    const root = app.getPath('userData');
    function resolveArch() {
        switch (os.arch()) {
            case 'x86':
            case 'x32': return '32';
            case 'x64': return '64';
            default: return '32';
        }
    }
    function resolveSystem() {
        switch (os.platform()) {
            case 'darwin': return 'osx';
            case 'win32': return 'windows';
            case 'linux': return 'linux';
            default: return '';
        }
    }
    const info: { [system: string]: { [arch: string]: { jre: { sha1: string; url: string; version: string } } } } = await context.execute('fetchInfo', () => new Promise((resolve, reject) => {
        const req = net.request('https://launchermeta.mojang.com/mc/launcher.json');
        req.on('response', (response) => {
            let str = '';
            response.on('data', (buf) => { str += buf.toString(); });
            response.on('end', () => { resolve(JSON.parse(str)); });
        });
        req.end();
    }));
    const system = resolveSystem();
    const arch = resolveArch();
    if (system === '' || system === 'linux') {
        return '';
    }
    const { sha1, url, version } = info[system][arch].jre;

    const filename = basename(url);
    const dest = resolve(root, 'temp', filename);

    let needDownload = true;
    if (await fs.exists(dest)) {
        needDownload = await new Promise((resolve, reject) => {
            const hash = createHash('sha1');
            fs.createReadStream(dest)
                .pipe(hash)
                .on('finish', () => { resolve(hash.digest('hex') !== sha1); });
        });
    }
    if (needDownload) {
        await fs.ensureFile(dest);
        await context.execute('download', Net.downloadFileIfAbsentWork({
            url,
            destination: dest,
            checksum: {
                algorithm: 'sha1',
                hash: sha1,
            },
        }));
    }

    const javaRoot = resolve(root, 'jre');
    await context.execute('decompress', async () => {
        await fs.ensureDir(javaRoot);

        await fs.createReadStream(dest)
            .pipe(createDecompressor())
            .pipe(Unzip.createExtractStream(javaRoot))
            .wait();
    });
    await context.execute('cleanup', async () => {
        await fs.unlink(dest);
    });
    return version;
}

export async function selfHostAPI(context: Task.Context) {
    console.log('Try auto Java from self hosted source');
    const root = app.getPath('userData');
    function resolveArch() {
        switch (os.arch()) {
            case 'x86':
            case 'x32': return '32';
            case 'x64': return '64';
            default: return '32';
        }
    }
    function resolveSystem() {
        switch (os.platform()) {
            case 'darwin': return 'osx';
            case 'win32': return 'win';
            case 'linux': return 'linux';
            default: return '';
        }
    }
    const system = resolveSystem();
    const arch = resolveArch();
    if (system === '' || system === 'linux') {
        return;
    }
    const url = `https://voxelauncher.azurewebsites.net/api/v1/jre/${system}/${arch}`;
    const filename = 'jre.lzma';
    const dest = resolve(root, 'temp', filename);

    await fs.ensureFile(dest);
    await context.execute('download', Net.downloadFileWork({
        url,
        destination: dest,
    }));

    const javaRoot = resolve(root, 'jre');
    await context.execute('decompress', async () => {
        await fs.ensureDir(javaRoot);

        await fs.createReadStream(dest)
            .pipe(createDecompressor())
            .pipe(Unzip.createExtractStream(javaRoot))
            .wait();
    });
    await context.execute('cleanup', async () => {
        await fs.unlink(dest);
    });
}

export async function bangbangAPI(context: Task.Context) {
    console.log('Try auto Java from Bangbang source');
    const x64 = os.arch() === 'x64';
    const platform = os.platform();
    function resolveJava() {
        switch (platform) {
            case 'darwin': return 'jre_mac.dmg';
            case 'win32': return x64 ? 'jre_x64.exe' : 'jre_x86.exe';
            case 'linux': return x64 ? 'jre_x64.tar.gz' : 'jre_x86.tar.gz';
            default: return '';
        }
    }
    const filename = resolveJava();
    const root = app.getPath('userData');
    const javaRoot = resolve(root, 'jre');
    const destination = resolve(root, 'temp', filename);
    await context.execute('download', Net.downloadFileWork({
        url: `http://bmclapi2.bangbang93.com/java/${filename}`,
        destination,
    }));

    function exec_(cmd: string, option = {}) {
        return new Promise((resolve, reject) => {
            exec(cmd, option, (err, stdout, stderr) => {
                if (err) { reject(err); } else {
                    resolve(stdout);
                }
            });
        });
    }
    switch (platform) {
        case 'darwin':
            await fs.copyFile(join(__static, 'mac-jre-installer.sh'), join(root, 'temp', 'mac-jre-installer.sh'));
            await fs.mkdir(join(root, 'jre'));
            await exec_(join(root, 'temp', 'mac-jre-installer.sh'), { cwd: root });
            break;
        case 'win32':
            await exec_([destination, `INSTALLDIR=${javaRoot}`, 'STATIC=1', 'INSTALL_SILENT=1', 'SPONSORS=0'].join(' '));
            break;
        case 'linux':
            await exec_(`tar xvzf ${destination} -C ${join(root, 'jre')}`, { cwd: root });
            break;
        default:
            break;
    }
}
