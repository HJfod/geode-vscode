
import { MetaItem, select, SpriteCollection } from "./types";

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

    constructSelectMenu(): select.Menu {
        return {
            topLevel: {
                title: 'Database',
                options: [
                    { value: 'all', text: 'All', },
                    { value: 'favorites', text: 'Favorites', },
                    { value: 'sprites', text: 'Sprites', },
                    { value: 'fonts', text: 'Fonts', },
                    { value: 'audio', text: 'Audio', },
                ],
                subgroups: this.collections.map(col => {
                    const title = col.owner.mod ?
                        col.owner.mod.name :
                        col.owner.directory;

                    const options: select.Option[] = [
                        { value: `all::${col.owner.directory}`, text: 'All', },
                        { value: `sprites::${col.owner.directory}`, text: 'Sprites', },
                        { value: `fonts::${col.owner.directory}`, text: 'Fonts', },
                        { value: `audio::${col.owner.directory}`, text: 'Audio', },
                    ];

                    Object.keys(col.sheets).forEach(k => {
                        options.push({
                            value: `sheet::${col.owner.directory}::${k}`,
                            text: k,
                        });
                    });

                    return { title, options, subgroups: [], };
                }),
            }
        };
    }
}
