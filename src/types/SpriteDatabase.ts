
import { SpriteCollection } from "./types";

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

    getAllInMod(id: string) {
        const collection = this.collections.find(c => c.owner.mod?.id === id);
        if (!collection) {
            return [];
        }
        return collection.sprites
            .concat(Object.values(collection.sheets).flat())
            .concat(collection.fonts)
            .concat(collection.audio)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    getAllInDir(dir: string) {
        const collection = this.collections.find(c => c.owner.directory === dir);
        if (!collection) {
            return [];
        }
        return collection.sprites
            .concat(Object.values(collection.sheets).flat())
            .concat(collection.fonts)
            .concat(collection.audio)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    getAll() {
        return this.collections.flatMap(collection => 
            collection.sprites
                .concat(Object.values(collection.sheets).flat())
                .concat(collection.fonts)
                .concat(collection.audio)
        ).sort((a, b) => a.name.localeCompare(b.name));
    }

    getAllFonts() {
        return this.collections.flatMap(collection => 
            collection.fonts
        ).sort((a, b) => a.name.localeCompare(b.name));
    }

    getAllSprites() {
        return this.collections.flatMap(collection => 
            collection.sprites
        ).sort((a, b) => a.name.localeCompare(b.name));
    }

    getAllSheets() {
        return this.collections.flatMap(collection => 
            Object.values(collection.sheets).flat()
        ).sort((a, b) => a.name.localeCompare(b.name));
    }

    getAllAudio() {
        return this.collections.flatMap(collection => 
            collection.audio
        ).sort((a, b) => a.name.localeCompare(b.name));
    }

    getFavorites() {
        return this.getAll().filter(
            spr => this.favorites.some(f => f === spr.name)
        );
    }
}
