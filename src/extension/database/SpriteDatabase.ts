import { getOptions } from '../options';
import { geode } from '../geode/geode';
import { basename, join } from 'path';
import { readdirSync, readFileSync,  existsSync, exists } from 'fs';
import { OutputChannel, workspace } from 'vscode';
import { SpriteCollection, modjson, ItemType } from '../../types/types';
import { SpriteDatabase } from '../../types/SpriteDatabase';
import G, { glob } from 'glob';

function removeQualityDecorators(file: string) {
    return file.replace(/-uhd|-hd/g, '');
}

function preferredFile(rawFile: string) {
    let ext = "";
    switch (getOptions().textureQuality) {
        case 'UHD': ext = '-uhd'; break;
        case 'HD':  ext = '-hd';  break;
    }
    const file = removeQualityDecorators(rawFile)
        .replace('.png', `${ext}.png`)
        .replace('.plist', `${ext}.plist`);
    return existsSync(file) ? file : rawFile;
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

export function getModInDir(dir: string): modjson.Mod | null {
    if (existsSync(join(dir, 'mod.json'))) {
        const modJson = JSON.parse(
            readFileSync(join(dir, 'mod.json')).toString()
        ) as modjson.Mod;
        return modJson;
    }
    return null;
}

export function refreshSpriteDatabase(channel: OutputChannel | null = null) {
    channel?.append('Loading sprites... ');

    // set search directories
    database.searchDirectories = [
        join(geode.getWorkingInstallation()?.path ?? "", 'Resources'),
        ...getOptions().spriteSearchDirectories
    ];

    console.log(database.searchDirectories);

    // check if the current workspace(s) contain Geode mods
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

        const modInfo = getModInDir(dir);

        const collection: SpriteCollection = {
            owner: {
                directory: dir,
                mod: modInfo,
            },
            sheets: {},
            fonts: [],
            sprites: [],
            audio: [],
        };

        // if this is a mod, use `[mod.json].resources` to find files
        if (modInfo) {
            const globOptions: G.IOptions = {
                cwd: dir,
                absolute: true,
            };

            // todo: fix this horrible indentation

            if (modInfo.resources) {
                // find files
                if (modInfo.resources.files) {
                    for (const pattern of modInfo.resources.files) {
                        for (const file of glob.sync(pattern, globOptions)) {
                            if (file.endsWith('.ogg')) {
                                collection.audio.push({
                                    name: basename(file),
                                    path: file,
                                    type: ItemType.audio,
                                    owner: collection.owner,
                                });
                            } else {
                                collection.sprites.push({
                                    name: basename(file),
                                    path: file,
                                    type: ItemType.sprite,
                                    owner: collection.owner,
                                });
                            }
                        }
                    }
                }

                // find spritesheets
                if (modInfo.resources.spritesheets) {
                    for (const [sheet, patterns] of Object.entries(modInfo.resources.spritesheets)) {
                        for (const pattern of patterns) {
                            for (const file of glob.sync(pattern, globOptions)) {
                                if (sheet in collection.sheets) {
                                    collection.sheets[sheet].push({
                                        name: basename(file),
                                        path: file,
                                        type: ItemType.sheetSprite,
                                        owner: collection.owner,
                                    });
                                } else {
                                    collection.sheets[sheet] = [{
                                        name: basename(file),
                                        path: file,
                                        type: ItemType.sheetSprite,
                                        owner: collection.owner,
                                    }];
                                }
                            }
                        }
                    }
                }

                // find fonts
                if (modInfo.resources.fonts) {
                    for (const [name, font] of Object.entries(modInfo.resources.fonts)) {
                        collection.fonts.push({
                            name: name,
                            path: join(dir, font.path),
                            type: ItemType.font,
                            owner: collection.owner,
                        });
                    }
                }
            }
        } else {
            // if it's not, then just enumerate files 
            // and resolve by extension

            // read all files in directory
            const files = readdirRecursiveSync(dir);

            // find spritesheets
            for (const rawSheetPath of files) {
                if (rawSheetPath.endsWith('.plist')) {
                    // check if this is a spritesheet (does it have a corresponding .png file)
                    if (!existsSync(rawSheetPath.replace('.plist', '.png'))) {
                        continue;
                    }
                    
                    const sheetPath = preferredFile(rawSheetPath);
                    const sheetName = removeQualityDecorators(basename(rawSheetPath));

                    // read sheet data and find all *.png strings inside
                    readFileSync(sheetPath).toString().match(/\w+\.png/g)?.forEach(match => {
                        match = removeQualityDecorators(match);
                        // check that this is not the same as the sheet (metadata field)
                        if (match.replace('.png', '.plist') !== sheetName) {
                            // has a sheet with this name already been found?
                            if (!(sheetName in collection.sheets)) {
                                collection.sheets[sheetName] = [{
                                    type: ItemType.sheetSprite,
                                    name: match,
                                    path: sheetPath,
                                    owner: collection.owner,
                                }];
                            }
                            // does that sheet contain this sprite?
                            else if (!collection.sheets[sheetName].some(spr => spr.name === match)) {
                                collection.sheets[sheetName].push({
                                    type: ItemType.sheetSprite,
                                    name: match,
                                    path: sheetPath,
                                    owner: collection.owner,
                                });
                            }
                        }
                    });
                }
            }

            // find fonts
            for (const rawFontPath of files) {
                if (rawFontPath.endsWith('.fnt')) {
                    const fontPath = preferredFile(rawFontPath);
                    const fontName = removeQualityDecorators(basename(rawFontPath));
                    // has this font been added already?
                    if (!collection.fonts.some(fnt => fnt.name === fontName)) {
                        collection.fonts.push({
                            type: ItemType.font,
                            name: fontName,
                            path: fontPath,
                            owner: collection.owner,
                        });
                    }
                }
            }

            // find songs
            for (const rawAudioPath of files) {
                if (rawAudioPath.endsWith('.ogg')) {
                    const audioPath = preferredFile(rawAudioPath);
                    const audioName = removeQualityDecorators(basename(audioPath));
                    // has this font been added already?
                    if (!collection.audio.some(a => a.name === audioName)) {
                        collection.audio.push({
                            type: ItemType.audio,
                            name: audioName,
                            path: audioPath,
                            owner: collection.owner,
                        });
                    }
                }
            }

            // find sprites
            for (const rawFilePath of files) {
                if (rawFilePath.endsWith('.png')) {
                    const filePath = preferredFile(rawFilePath);
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
                        type: ItemType.sprite,
                        name: fileName,
                        path: filePath,
                        owner: collection.owner,
                    });
                }
            }
        }

        database.collections.push(collection);
    }

    // log findings
    channel?.appendLine(`done (found ${
        database.getTotalCount()
    })`);
}

const database = new SpriteDatabase;

export function getSpriteDatabase() {
    return database;
}
