
export interface Sprite {
    name: string;   // name.png
    path: string;   // path to .png in the case of 
                    // standalone and .plist in the 
                    // case of sheet
    mod: string;    // mod id
}

export interface Font {
    name: string;   // name.fnt
    path: string;   // path to name.fnt
    mod: string;    // mod id
}

export interface ModJson {
    id: string;
    name: string;
}

export interface SpriteCollection {
    directory: string;
    mod: ModJson | null;
    sheets: { [name: string]: Sprite[] };
    sprites: Sprite[];
    fonts: Font[];
}
