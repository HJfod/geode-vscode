import { getOptions, getWorkingInstallation } from './config';
import { join } from 'path';
import { readdirSync, readFileSync, promises, existsSync } from 'fs';
import { window, OutputChannel, ViewColumn, Uri, ExtensionContext, WebviewPanel } from 'vscode';
import { getBMFontDatabase } from './font';
import { SpriteDatabase } from '../types/sprite';
import { getSheetDatabase } from './sheet';

function removeQualityDecorators(file: string) {
    return file.replace(/-uhd|-hd/g, '');
}

const database: SpriteDatabase = {
    searchDirectories: [],
    sheets: {},
    sprites: [],
    fonts: [],
    total: () => { 
        return database.sprites.length + 
            database.fonts.length +
            Object.values(database.sheets).reduce((a, b) => a + b.length, 0);
    },
    all: () => {
        return database.sprites
            .concat(
                Object.values(getSpriteDatabase().sheets
            ).flat())
            .concat(database.fonts)
            .sort((a, b) => a.name.localeCompare(b.name));
    }
};

export function refreshSpriteDatabase(channel: OutputChannel | null = null) {
    channel?.append('Loading sprites... ');

    // set search directories
    database.searchDirectories = [
        join(getWorkingInstallation()?.path ?? "", 'Resources'),
        ...getOptions().spriteSearchDirectories
    ];

    // reset database
    database.sprites = [];
    database.sheets = {};
    database.fonts = [];

    // search sprites
    for (let dir of database.searchDirectories) {

        // read all files in directory
        const files = readdirSync(dir).map(f => removeQualityDecorators(f));

        // find spritesheets
        for (const sheet of files) {
            if (sheet.endsWith('.plist')) {
                // check if this is a spritesheet (does it have a corresponding .png file)
                if (!existsSync(join(dir, sheet.replace('.plist', '.png')))) {
                    continue;
                }

                // read sheet data and find all *.png strings inside
                readFileSync(join(dir, sheet)).toString().match(/\w+\.png/g)?.forEach(match => {
                    match = removeQualityDecorators(match);
                    // check that this is not the same as the sheet (metadata field)
                    if (match.replace('.png', '.plist') !== sheet) {
                        // has a sheet with this name already been found?
                        if (!(sheet in database.sheets)) {
                            database.sheets[sheet] = [{ name: match, path: join(dir, sheet) }];
                        }
                        // does that sheet contain this sprite?
                        else if (!database.sheets[sheet].some(spr => spr.name === match)) {
                            database.sheets[sheet].push({ name: match, path: join(dir, sheet) });
                        }
                    }
                });
            }
        }

        // find fonts
        for (const font of files) {
            if (font.endsWith('.fnt')) {
                // has this font been added already?
                if (!database.fonts.some(fnt => fnt.name === font)) {
                    database.fonts.push({ name: font, path: join(dir, font) });
                }
            }
        }

        // find sprites
        for (const file of files) {
            if (file.endsWith('.png')) {
                // is this a spritesheet?
                if (file.replace('.png', '.plist') in database.sheets) {
                    continue;
                }
                // is this a font?
                if (database.fonts.some(fnt => fnt.name === file.replace('.png', '.fnt'))) {
                    continue;
                }
                // has this sprite been added already?
                if (database.sprites.some(spr => spr.name === file)) {
                    continue;
                }
                database.sprites.push({ name: file, path: join(dir, file) });
            }
        }
    }

    // remove "square.png" sheets
    for (const key in database.sheets) {
        if (database.sheets[key].length === 1 && database.sheets[key][0].name === 'square.png') {
            delete database.sheets[key];
        }
    }

    // log findings
    channel?.appendLine(`done (found ${
        database.sprites.length
    } + ${
        Object.values(database.sheets).reduce((a, v) => a + v.length, 0)
    } + ${
        database.fonts.length
    })`);
}

export function getSpriteDatabase() {
    return database;
}

function buildDatabasePageHtml(panel: WebviewPanel, context: ExtensionContext) {
    // read html file and replace static content
    return readFileSync(join(context.extension.extensionPath, 'src/webview/database.html')).toString()
        .replace('DATABASE_INFO',
            `Sprites: ${
                database.sprites.length
            }, sheets: ${
                Object.keys(database.sheets).length
            }, fonts: ${
                database.fonts.length
            }, total: ${
                database.total()
            }`
        ).replace('DATABASE_OPTIONS', 
            `${
                Object.keys(database.sheets).reduce((a, v) => {
                    return a + `<option value="sheet:${v}">${v}</option>`;
                }, "")
            }`
        ).replace('DATABASE_SCRIPT', panel.webview.asWebviewUri(Uri.file(join(
            context.extension.extensionPath,
            'out/webview/database.js'
        ))).toString()).replace('DATABASE_CSS', panel.webview.asWebviewUri(Uri.file(join(
            context.extension.extensionPath,
            'src/webview/database.css'
        ))).toString());
}

export function buildDatabasePanel(context: ExtensionContext) {
    const panel = window.createWebviewPanel(
        'gmdSpriteDatabase',
        'Sprite Database',
        ViewColumn.Beside,
        {
            enableScripts: true
        }
    );
    panel.iconPath = {
        light: Uri.file(join(context.extension.extensionPath, 'images/blockman-light.svg')),
        dark:  Uri.file(join(context.extension.extensionPath, 'images/blockman-dark.svg'))
    };
    panel.webview.html = buildDatabasePageHtml(panel, context);
    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'request-sheet': {
                    panel.webview.postMessage({
                        command: 'update',
                        data: database.sheets[message.sheet]
                    });
                } break;

                case 'request-sprites': {
                    panel.webview.postMessage({
                        command: 'update',
                        data: database.sprites
                    });
                } break;

                case 'request-fonts': {
                    panel.webview.postMessage({
                        command: 'update',
                        data: database.fonts
                    });
                } break;

                case 'request-all': {
                    panel.webview.postMessage({
                        command: 'update',
                        data: database.all()
                    });
                } break;

                case 'load-image': {
                    if (message.sprite.path.endsWith('.plist')) {
                        getSheetDatabase().loadSheet(message.sprite.path)
                            .then(sheet => sheet.extract(message.sprite.name))
                            .then(data => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: data
                                });
                            })
                            .catch(_ => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: null
                                });
                            });
                    } else {
                        promises.readFile(message.sprite.path, { encoding: 'base64' })
                            .then(data => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: data.toString()
                                });
                            })
                            .catch(_ => {
                                panel.webview.postMessage({
                                    command: 'image',
                                    element: message.element,
                                    data: null
                                });
                            });
                    }
                } break;

                case 'load-font': {
                    getBMFontDatabase().loadFont(message.path)
                        .then(font => font.render(message.text))
                        .then(data => {
                            panel.webview.postMessage({
                                command: 'font',
                                element: message.element,
                                data: data
                            });
                        })
                        .catch(err => {
                            console.log(`Error rendering font: ${err}`);
                            panel.webview.postMessage({
                                command: 'font',
                                element: message.element,
                                data: null
                            });
                        });
                } break;

                default: {
                    console.log(`Unknown message.command: ${message.command}`);
                } break;
            }
        },
        undefined,
        context.subscriptions
    );
    return panel;
}
