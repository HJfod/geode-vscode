import { getOptions, getWorkingInstallation } from './config';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { window, OutputChannel, ViewColumn, Uri, ExtensionContext } from 'vscode';

interface Sprite {
    name: string;
    path: string;
}

function removeQualityDecorators(file: string) {
    return file.replace(/-uhd|-hd/g, '');
}

export interface SpriteDatabase {
    searchDirectories: string[];
    sheets: { [name: string]: Sprite[] };
    sprites: Sprite[];
}

let database: SpriteDatabase = {
    searchDirectories: [],
    sheets: {},
    sprites: [],
};

export function refreshSpriteDatabase(channel: OutputChannel | null = null) {
    database.searchDirectories = [
        join(getWorkingInstallation()?.path ?? "", 'Resources'),
        ...getOptions().spriteSearchDirectories
    ];

    channel?.append('Loading sprites... ');

    database.sprites = [];
    database.sheets = {};

    for (let dir of database.searchDirectories) {
        for (let file of readdirSync(dir)) {
            file = removeQualityDecorators(file);
            if (file.endsWith('.png')) {
                if (!database.sprites.some(spr => spr.name === file)) {
                    database.sprites.push({ name: file, path: join(dir, file) });
                }
            }
            if (file.endsWith('.plist')) {
                readFileSync(join(dir, file)).toString().match(/\w+\.png/g)?.forEach(match => {
                    match = removeQualityDecorators(match);
                    if (!(file in database.sheets)) {
                        database.sheets[file] = [{ name: match, path: join(dir, file) }];
                    } else if (!database.sheets[file].some(spr => spr.name === match)) {
                        database.sheets[file].push({ name: match, path: join(dir, file) });
                    }
                });
            }
        }
    }

    // remove "square.png"
    for (const key in database.sheets) {
        if (database.sheets[key].length === 1 && database.sheets[key][0].name === 'square.png') {
            delete database.sheets[key];
        }
    }

    channel?.appendLine(`done (found ${
        database.sprites?.length
    } + ${
        Object.values(database.sheets).reduce((a, v) => a + v.length, 0)
    })`);
}

export function getSpriteDatabase() {
    return database;
}

function buildDatabasePageHtml(context: ExtensionContext) {
    return readFileSync(join(context.extension.extensionPath, 'src/database.html')).toString()
        .replace('DATABASE_INFO',
            `Sprites: ${
                database.sprites.length
            }, sheets: ${
                Object.keys(database.sheets).length
            }, total: ${
                database.sprites.length + 
                    Object.values(database.sheets).reduce((a, b) => a + b.length, 0)
            }`
        ).replace('DATABASE_OPTIONS', 
            `${
                Object.keys(database.sheets).reduce((a, v) => {
                    return a + `<option value="sheet:${v}">${v}</option>`;
                }, "")
            }`
        );
}

export function buildDatabasePanel(context: ExtensionContext) {
    const panel = window.createWebviewPanel(
        'spriteDatabase',
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
    panel.webview.html = buildDatabasePageHtml(context);
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

                case 'request-all': {
                    panel.webview.postMessage({
                        command: 'update',
                        data: database.sprites.concat(Object.values(getSpriteDatabase().sheets).flat())
                    });
                } break;

                case 'load-image': {
                    if (message.path.endsWith('.plist')) {
                        return;
                    }
                    const data = readFileSync(message.path, { encoding: 'base64' });
                    panel.webview.postMessage({
                        command: 'image',
                        element: message.element,
                        data: data.toString()
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
