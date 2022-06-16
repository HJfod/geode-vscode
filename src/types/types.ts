
export namespace modjson {
    export interface Font {
        path: string,
        size: number,
        charset: string,
        outline: number,
    }

    export interface Resources {
        files: string[],
        fonts: Font[],
        spritesheets: { [name: string]: string[] },
        resources: Resources[],
    }

    export interface Mod {
        id: string;
        name: string;
    }
}

export enum ItemType {
    sprite,
    sheetSprite,
    font,
    audio,
}

export interface Item {
    type: ItemType, // item
    name: string,   // name[.png|.plist|.ogg|.mp3]
    path: string,   // path to item
    owner: ItemOwner,
}

export interface ItemOwner {
    directory: string,
    mod: modjson.Mod | null,
}

export interface SpriteCollection {
    owner: ItemOwner,
    sheets: { [name: string]: Item[] },
    sprites: Item[],
    fonts: Item[],
    audio: Item[],
}
