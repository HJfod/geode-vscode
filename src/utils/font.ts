import { readFileSync, promises, readFile } from "fs";
import { FontData, parseFnt } from "./fnt";
import sharp = require('sharp');
import { dirname, join } from "path";

export interface RenderedChar {
    data: string,
    x: number,
    y: number,
    width: number,
    height: number,
    xadvance: number,
}

export interface RenderedChars {
    chars: RenderedChar[],
    xoffset: number,
    base: number,
};

export class BMFont {
    data: FontData;
    path: string;

    constructor(data: FontData, path: string) {
        this.data = data;
        this.path = path;
    }

    static createFromFntFile(path: string): BMFont | null {
        const font = parseFnt(readFileSync(path).toString());
        if (!font) {
            return null;
        }
        return new BMFont(font, path);
    }

    async render(text: string) {
        const res: RenderedChars = {
            chars: [],
            xoffset: 0,
            base: 0,
        };
        for (let ix = 0; ix < text.length; ix++) {
            const char = this.data.chars.find(ch => ch.id === text.charCodeAt(ix));
            if (char) {
                const file = await promises.readFile(
                    join(dirname(this.path), this.data.pages[char.page])
                );
                if (ix === 0) {
                    res.xoffset = char.xoffset;
                    res.base = this.data.common.base;
                }
                res.chars.push({
                    data: await sharp(file)
                        .extract({
                            left: char.x,
                            top: char.y,
                            width: char.width,
                            height: char.height
                        })
                        .toBuffer()
                        .then(b => b.toString('base64')),
                    x: char.x,
                    y: char.y,
                    width: char.width,
                    height: char.height,
                    xadvance: char.xadvance
                });
            }
        }
        return res;
    }
}

export class BMFontDatabase {
    fonts: BMFont[] = [];

    public async loadFont(path: string) {
        const loaded = this.fonts.find(font => font.path === path);
        if (loaded) {
            return loaded;
        }
        const font = BMFont.createFromFntFile(path);
        if (!font) {
            return Promise.reject("Unable to create font");
        }
        this.fonts.push(font);
        return font;
    }
}

const database = new BMFontDatabase();

export function getBMFontDatabase() {
    return database;
}
