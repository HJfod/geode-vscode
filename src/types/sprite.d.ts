
export interface Sprite {
    name: string; // name.png
    path: string; // path to .png in the case of 
                  // standalone and .plist in the 
                  // case of sheet
}

export interface Font {
    name: string; // name.fnt
    path: string; // path to name.fnt
}

export interface SpriteDatabase {
    searchDirectories: string[];
    sheets: { [name: string]: Sprite[] };
    sprites: Sprite[];
    fonts: Font[];
    total(): number;
    all(): Sprite[];
}
