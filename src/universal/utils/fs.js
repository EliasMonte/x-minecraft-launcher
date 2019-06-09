import { promises as fs, existsSync } from 'fs';
import { dirname, resolve } from 'path';

/**
 * @param {string} file
 */
export function ensureFile(file) {
    return ensureDir(dirname(file));
}
/**
 * @param {string} dir
 * @return {Promise<void>}
 */
export async function ensureDir(dir) {
    if (!await missing(dir)) return;
    await fs.mkdir(dir, { recursive: true }).catch((e) => {
        if (e.code !== 'EEXIST') {
            return ensureDir(dirname(dir));
        }
        return undefined;
    });
}
/**
 * @param {import("fs").PathLike} file
 */
export function missing(file) {
    return fs.access(file).then(() => false, () => true);
}
/**
 * @param {string} file
 */
export async function remove(file) {
    const s = await fs.stat(file).catch((_) => { });
    if (!s) return;
    if (s.isDirectory()) {
        const childs = await fs.readdir(file);
        await Promise.all(childs.map(p => resolve(file, p)).map(p => remove(p)));
        await fs.rmdir(file);
    } else {
        await fs.unlink(file);
    }
}
/**
 * 
 * @param {string} src Src
 * @param {string} dest Destination
 * @param {(path: string) => boolean} filter
 */
export async function copy(src, dest, filter = () => true) {
    const s = await fs.stat(src).catch((_) => { });
    if (!s) return;
    if (!filter(src)) return;
    if (s.isDirectory()) {
        await ensureDir(dest);
        const childs = await fs.readdir(src);
        await Promise.all(childs.map(p => copy(resolve(src, p), resolve(dest, p))));
    } else if (!existsSync(dest)) {
        await fs.copyFile(src, dest);
    }
}
