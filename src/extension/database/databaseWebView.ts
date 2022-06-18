import { promises, readFileSync } from "fs";
import { dirname, join } from "path";
import { ColorThemeKind, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { getOptions } from "../options";
import { getBMFontDatabase } from "./BMFontDatabase";
import { getSheetDatabase } from "./SheetDatabase";
import { insertSnippet } from "../source/textSnippet";
import { getSpriteDatabase } from "./SpriteDatabase";
import openExplorer from 'open-file-explorer';
import { Item } from "../../types/types";
import { pick } from "../../types/SpriteDatabase";

function buildDatabasePageHtml(context: ExtensionContext) {
    // read html file and replace static content
    return readFileSync(join(context.extension.extensionPath, 'out/webview/database.html')).toString()
        .replace('DATABASE_INFO',
            `Sprites: ${
                getSpriteDatabase().getSpriteCount()
            }, sheets: ${
                getSpriteDatabase().getSheetCount()
            }, fonts: ${
                getSpriteDatabase().getFontCount()
            }, audio: ${
                getSpriteDatabase().getAudioCount()
            }, total: ${
                getSpriteDatabase().getTotalCount()
            }`
        );
}

export function buildDatabasePanel(context: ExtensionContext) {
    let targetEditor = window.activeTextEditor;
	context.subscriptions.push(window.onDidChangeActiveTextEditor(e => {
        if (e) {
            targetEditor = e;
        }
	}));

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
    panel.webview.html = buildDatabasePageHtml(context);
    panel.webview.onDidReceiveMessage( 
        message => {
            switch (message.command) {
                case 'get-database': {
                    const database = getSpriteDatabase();
                    panel.webview.postMessage({
                        command: 'database',
                        favorites: database.favorites,
                        default: 
                            getOptions().databaseShowFavoritesByDefault &&
                            database.favorites.length ? 'favorites' : 'all',
                        options: database.constructSelectMenu(),
                    });
                } break;

                case 'get-items': {
                    const database = getSpriteDatabase();
                    switch (message.parts[0]) {
                        case 'all': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: pick(database.collections)
                                    .from(c =>
                                        message.parts.length > 1 ?
                                            c.owner.directory === message.parts[1]
                                            : true
                                    )
                                    .all(),
                            });
                        } break;

                        case 'favorites': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: pick(database.collections)
                                    .all()
                                    .filter(
                                        spr => database.favorites.some(fav => fav === spr.item.name)
                                    ),
                            });
                        } break;

                        case 'fonts': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: pick(database.collections)
                                    .from(c =>
                                        message.parts.length > 1 ?
                                            c.owner.directory === message.parts[1]
                                            : true
                                    )
                                    .get([ 'fonts' ]),
                            });
                        } break;

                        case 'audio': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: pick(database.collections)
                                    .from(c =>
                                        message.parts.length > 1 ?
                                            c.owner.directory === message.parts[1]
                                            : true
                                    )
                                    .get([ 'audio' ]),
                            });
                        } break;

                        case 'sheets': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: pick(database.collections)
                                    .from(c =>
                                        message.parts.length > 1 ?
                                            c.owner.directory === message.parts[1]
                                            : true
                                    )
                                    .get([ 'sheets' ]),
                            });
                        } break;

                        case 'sprites': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: pick(database.collections)
                                    .from(c =>
                                        message.parts.length > 1 ?
                                            c.owner.directory === message.parts[1]
                                            : true
                                    )
                                    .get([ 'sprites' ]),
                            });
                        } break;
                    
                        case 'sheet': {
                            panel.webview.postMessage({
                                command: 'items',
                                items: pick(database.collections)
                                    .from(c => c.owner.directory === message.parts[1])
                                    .in(s => s === message.parts[2]),
                            });
                        } break;
                    }
                } break;

                case 'set-favorite': {
                    const database = getSpriteDatabase();
                    if (message.favorite) {
                        database.favorites.push(message.name);
                    } else {
                        database.favorites = database.favorites.filter(f => f !== message.name);
                    }
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

                case 'load-audio': {
                    const path = window.activeColorTheme.kind === ColorThemeKind.Dark ?
                        join(context.extension.extensionPath, 'images/audio-dark.png') :
                        join(context.extension.extensionPath, 'images/audio-light.png');
                    promises.readFile(path, { encoding: 'base64' })
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
                } break;

                case 'load-font': {
                    getBMFontDatabase().loadFont(message.path)
                        .then(font => font.render(message.text))
                        .then(data => {
                            panel.webview.postMessage({
                                command: 'image',
                                element: message.element,
                                data: data
                            });
                        })
                        .catch(err => {
                            console.log(`Error rendering font: ${err}`);
                            panel.webview.postMessage({
                                command: 'image',
                                element: message.element,
                                data: null
                            });
                        });
                } break;

                case 'use-value': {
                    if (targetEditor && window.visibleTextEditors.some(e => e === targetEditor)) {
                        insertSnippet(targetEditor, message.value, message.type);
                        panel.dispose();
                    } else {
                        window.showErrorMessage(
                            'You are not currently in an active editor. ' + 
                            'Please select an editor to continue :)'
                        );
                    }
                } break;

                case 'info': {
                    const item = message.item as Item;
                    window.showInformationMessage(
                        `Name: ${
                            item.name
                        }\nPath: ${
                            item.path
                        }\nType: ${
                            item.type
                        }\nDirectory: ${
                            item.owner.directory
                        }\nMod: ${
                            item.owner.mod?.name ?? '<none>'
                        }`,
                        {
                            modal: true
                        },
                        'Open file location'
                    ).then(value => {
                        if (value === 'Open file location') {
                            openExplorer(dirname(message.sprite.path), _ => {});
                        }
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
