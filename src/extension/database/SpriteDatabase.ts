import { getOptions, getWorkingInstallation } from '../config';
import { basename, join } from 'path';
import { readdirSync, readFileSync,  existsSync } from 'fs';
import { OutputChannel, window, workspace, WorkspaceFolder } from 'vscode';
import { SpriteCollection, ModJson } from '../sprite';
import { SpriteDatabase } from '@shared/SpriteDatabase';

function removeQualityDecorators(file: string) {
    return file.replace(/-uhd|-hd/g, '');
}

function readdirRecursiveSync(dir: string) {
    let res: string[] = [];
  
    readdirSync(dir, { withFileTypes:  true }).forEach(file => {
        if (file.isDirectory()) {
            res = res.concat(readdirRecursiveSync(join(dir, file.name)));
        } else {
            res.push(join(dir, file.name));
        }
    });
  
    return res;
}

export function getModInDir(dir: string): ModJson | null {
    if (existsSync(join(dir, 'mod.json'))) {
        const modJson = JSON.parse(
            readFileSync(join(dir, 'mod.json')).toString()
        ) as ModJson;
        return modJson;
    }
    return null;
}

export function refreshSpriteDatabase(channel: OutputChannel | null = null) {
    channel?.append('Loading sprites... ');

    // set search directories
    database.searchDirectories = [
        join(getWorkingInstallation()?.path ?? "", 'Resources'),
        ...getOptions().spriteSearchDirectories
    ];

    if (workspace.workspaceFolders) {
        for (const editor of workspace.workspaceFolders) {
            // is current workspace a geode mod?
            if (existsSync(join(editor.uri.fsPath, 'mod.json'))) {
                database.searchDirectories.push(editor.uri.fsPath);
            }
        }
    }

    // reset database
    database.collections = [];

    // search sprites
    for (const dir of database.searchDirectories) {

        // read all files in directory
        const files = readdirRecursiveSync(dir);
        const modInfo = getModInDir(dir);

        const collection: SpriteCollection = {
            directory: dir,
            mod: modInfo,
            sheets: {},
            fonts: [],
            sprites: [],
        };

        // find spritesheets
        for (const sheetPath of files) {
            if (sheetPath.endsWith('.plist')) {
                // check if this is a spritesheet (does it have a corresponding .png file)
                if (!existsSync(sheetPath.replace('.plist', '.png'))) {
                    continue;
                }

                const sheetName = removeQualityDecorators(basename(sheetPath));

                // read sheet data and find all *.png strings inside
                readFileSync(sheetPath).toString().match(/\w+\.png/g)?.forEach(match => {
                    match = removeQualityDecorators(match);
                    // check that this is not the same as the sheet (metadata field)
                    if (match.replace('.png', '.plist') !== sheetName) {
                        // has a sheet with this name already been found?
                        if (!(sheetName in collection.sheets)) {
                            collection.sheets[sheetName] = [{
                                name: match,
                                path: sheetPath,
                                mod: modInfo?.id ?? ''
                            }];
                        }
                        // does that sheet contain this sprite?
                        else if (!collection.sheets[sheetName].some(spr => spr.name === match)) {
                            collection.sheets[sheetName].push({
                                name: match,
                                path: sheetPath,
                                mod: modInfo?.id ?? ''
                            });
                        }
                    }
                });
            }
        }

        // find fonts
        for (const fontPath of files) {
            if (fontPath.endsWith('.fnt')) {
                const fontName = removeQualityDecorators(basename(fontPath));
                // has this font been added already?
                if (!collection.fonts.some(fnt => fnt.name === fontName)) {
                    collection.fonts.push({
                        name: fontName,
                        path: fontPath,
                        mod: modInfo?.id ?? ''
                    });
                }
            }
        }

        // find sprites
        for (const filePath of files) {
            if (filePath.endsWith('.png')) {
                const fileName = removeQualityDecorators(basename(filePath));
                // is this a spritesheet?
                if (fileName.replace('.png', '.plist') in collection.sheets) {
                    continue;
                }
                // is this a font?
                if (collection.fonts.some(fnt => fnt.name === fileName.replace('.png', '.fnt'))) {
                    continue;
                }
                // has this sprite been added already?
                if (collection.sprites.some(spr => spr.name === fileName)) {
                    continue;
                }
                collection.sprites.push({
                    name: fileName,
                    path: filePath,
                    mod: modInfo?.id ?? ''
                });
            }
        }

        database.collections.push(collection);
    }

    // log findings
    channel?.appendLine(`done (found ${
        database.getTotalCount()
    })`);
}

let database: SpriteDatabase = {
    searchDirectories: [],
    collections: [],
    favorites: [],

    getTotalCount() {
        return database.collections.reduce((a, v) => {
            return a +
                v.sprites.length + 
                v.fonts.length +
                Object.values(v.sheets).reduce((a, b) => a + b.length, 0);
        }, 0);
    },

    getFontCount() {
        return database.collections.reduce((a, v) => a + v.fonts.length, 0);
    },

    getSheetCount() {
        return database.collections.reduce(
            (a, v) => a + Object.values(v.sheets).reduce((a, b) => a + b.length, 0),
            0
        );
    },

    getSpriteCount() {
        return database.collections.reduce((a, v) => a + v.sprites.length, 0);
    },

    getAllInMod(id: string) {
        const collection = database.collections.find(c => c.mod?.id === id);
        if (!collection) {
            return [];
        }
        return collection.sprites
            .concat(Object.values(collection.sheets).flat())
            .concat(collection.fonts);
    },

    getAll() {
        return database.collections.flatMap(collection => 
            collection.sprites
                .concat(Object.values(collection.sheets).flat())
                .concat(collection.fonts)
        ).sort((a, b) => a.name.localeCompare(b.name));
    },

    getAllFonts() {
        return database.collections.flatMap(collection => 
            collection.fonts
        ).sort((a, b) => a.name.localeCompare(b.name));
    },

    getAllSprites() {
        return database.collections.flatMap(collection => 
            collection.sprites
        ).sort((a, b) => a.name.localeCompare(b.name));
    },

    getAllSheets() {
        return database.collections.flatMap(collection => 
            Object.values(collection.sheets).flat()
        ).sort((a, b) => a.name.localeCompare(b.name));
    },

    getFavorites() {
        return database.getAll().filter(
            spr => database.favorites.some(f => f === spr.name)
        );
    }
};

export function getSpriteDatabase() {
    return database;
}
