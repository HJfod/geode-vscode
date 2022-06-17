
import { MetaItem, SpriteCollection } from "./types";

export class PickList {
    data: SpriteCollection[];

    constructor(data: SpriteCollection[]) {
        this.data = data;
    }

    from(pickFun: (collection: SpriteCollection) => boolean) {
        this.data = this.data.filter(pickFun);
        return this;
    }

    get(keys: (keyof SpriteCollection)[]) {
        if (!this.data) {
            return [];
        }
        let got: MetaItem[] = [];
        for (const data of this.data) {
            for (const key of keys) {
                if (key === 'sheets') {
                    for (const [sheet, sprites] of Object.entries(data[key])) {
                        got = got.concat(sprites.flatMap(spr => {
                            return { item: spr, sheet: sheet };
                        }));
                    }
                } else if (key !== 'owner') {
                    got = got.concat(data[key].map(s => { return { item: s, sheet: null }; }));
                }
            }
        }
        return got.sort((a, b) => a.item.name.localeCompare(b.item.name));
    }

    in(filter: (sheet: string) => boolean) {
        let got: MetaItem[] = [];
        for (const data of this.data) {
            for (const [sheet, sprites] of Object.entries(data.sheets)) {
                if (!filter(sheet)) {
                    continue;
                }
                got = got.concat(sprites.flatMap(spr => {
                    return { item: spr, sheet: sheet };
                }));
            }
        }
        return got;
    }

    all() {
        return this.get([ 'sprites', 'sheets', 'fonts', 'audio' ]);
    }
}

export function pick(collections: SpriteCollection[]): PickList {
    return new PickList(collections);
}

export class SpriteDatabase {
    searchDirectories: string[] = [];
    collections: SpriteCollection[] = [];
    favorites: string[] = [];

    getTotalCount() {
        return this.collections.reduce((a, v) => {
            return a +
                v.sprites.length + 
                v.fonts.length +
                v.audio.length +
                Object.values(v.sheets).reduce((a, b) => a + b.length, 0);
        }, 0);
    }

    getFontCount() {
        return this.collections.reduce((a, v) => a + v.fonts.length, 0);
    }

    getSheetCount() {
        return this.collections.reduce(
            (a, v) => a + Object.values(v.sheets).reduce((a, b) => a + b.length, 0),
            0
        );
    }

    getSpriteCount() {
        return this.collections.reduce((a, v) => a + v.sprites.length, 0);
    }

    getAudioCount() {
        return this.collections.reduce((a, v) => a + v.audio.length, 0);
    }
}
