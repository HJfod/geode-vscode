
import { readFileSync } from 'fs';
import { parse, PlistValue, PlistObject } from 'plist';
import sharp = require('sharp');

interface SpriteFrame {
    aliases: string[],
    spriteOffset: string,
    spriteSize: string,
    spriteSourceSize: string,
    textureRect: string,
    textureRotated: boolean,
    frame: string,
}

interface SpriteTexture {
    x: number,
    y: number,
    width: number,
    height: number,
    rotated: boolean,
}

interface SpriteSheetPlist {
    frames: { [name: string]: SpriteFrame }
}

function textureFromFrame(frame: SpriteFrame): SpriteTexture {
    // since the textureRect is formatted as {{x, y}, {w, h}}
    // we can just convert the {} to [] and parse it into an array lol
    const rect = (JSON.parse((frame.textureRect ?? frame.frame)
        .replace(/{/g, '[')
        .replace(/}/g, ']')
    ) as number[][]).flat();
    return {
        x: rect[0],
        y: rect[1],
        width: frame.textureRotated ? rect[3] : rect[2],
        height: frame.textureRotated ? rect[2] : rect[3],
        rotated: frame.textureRotated
    };
}

export class Sheet {
    data: PlistValue;
    path: string;

    constructor(data: PlistValue, path: string) {
        this.path = path;
        this.data = data;
    }

    static createFromPlistFile(path: string) {
        const plistData = readFileSync(path).toString();
        return new Sheet(parse(plistData), path);
    }

    async extract(name: string) {
        const file = readFileSync(this.path.replace('.plist', '.png'));
        const data = this.data as unknown as SpriteSheetPlist;
        let frameData: SpriteFrame | null = null;
        for (const frame in data.frames) {
            if (frame === name) {
                frameData = data.frames[frame];
            }
        }
        if (!frameData) {
            return '';
        }
        const tex = textureFromFrame(frameData);
        return sharp(file)
            .extract({
                left: tex.x,
                top: tex.y,
                width: tex.width,
                height: tex.height,
            })
            .rotate(tex.rotated ? -90 : 0)
            .toBuffer()
            .then(b => b.toString('base64'));
    }
}

export class SheetDatabase {
    sheets: Sheet[] = [];

    public async loadSheet(path: string) {
        const loaded = this.sheets.find(sheet => sheet.path === path);
        if (loaded) {
            return loaded;
        }
        const sheet = Sheet.createFromPlistFile(path);
        if (!sheet) {
            return Promise.reject("Unable to load sheet");
        }
        this.sheets.push(sheet);
        return sheet;
    }
}

const database = new SheetDatabase();

export function getSheetDatabase() {
    return database;
}
