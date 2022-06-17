
export namespace modjson {
    export interface Font {
        path: string,
        size: number,
        charset: string,
        outline: number,
    }

    export interface Resources {
        files: string[],
        fonts: { [name: string]: Font },
        spritesheets: { [name: string]: string[] },
    }

    export interface Mod {
        id: string;
        name: string;
        resources: Resources,
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

export interface MetaItem {
    item: Item,
    sheet: string | null,
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

export namespace select {
    export interface Option {
        value: string,
        text: string,
    }

    export interface Group {
        title: string,
        options: Option[],
        subgroups: Group[],
    }

    export interface Menu {
        topLevel: Group,
    }
}
