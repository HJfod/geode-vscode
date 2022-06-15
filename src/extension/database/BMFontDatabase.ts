import { readFileSync } from 'fs';
import { Char, FontData, parseFnt } from './fnt';
import { dirname, join } from 'path';
import sharp from 'sharp';

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
        interface RenderedChar {
            data: Buffer,
            c: Char,
        }
        
        let totalWidth = 0;
        let totalHeight = this.data.common.lineHeight + this.data.common.base;
        const chars: RenderedChar[] = [];
        for (let ix = 0; ix < text.length; ix++) {
            const char = this.data.chars.find(ch => ch.id === text.charCodeAt(ix));
            if (char) {
                const file = readFileSync(
                    join(dirname(this.path), this.data.pages[char.page])
                );
                chars.push({
                    data: await sharp(file)
                        .extract({
                            left: char.x,
                            top: char.y,
                            width: char.width,
                            height: char.height
                        })
                        .toBuffer(),
                    c: char
                });
                totalWidth += char.xadvance;
            }
        }
        let x = 0;
        return await sharp(
            Buffer.alloc(totalWidth * totalHeight * 4, 0x00000000),
            {
                raw: {
                    width: totalWidth,
                    height: totalHeight,
                    channels: 4
                }
            }
        )
            .composite(chars.map(char => {
                const res = {
                    input: char.data,
                    left: x + char.c.xoffset,
                    top: char.c.yoffset + this.data.common.base
                };
                x += char.c.xadvance;
                return res;
            }))
            .png()
            .toBuffer()
            .then(b => b.toString('base64'));
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
