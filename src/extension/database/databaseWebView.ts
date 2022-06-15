import { promises, readFileSync } from "fs";
import { dirname, join } from "path";
import { ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from "vscode";
import { getOptions } from "../options";
import { getBMFontDatabase } from "./BMFontDatabase";
import { getSheetDatabase } from "./SheetDatabase";
import { createCCMenuItemSpriteExtra, createCCMISEithBS, createCCSprite, insertSpriteName } from "../source/snippet";
import { getSpriteDatabase } from "./SpriteDatabase";
import openExplorer from 'open-file-explorer';

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
            }, total: ${
                getSpriteDatabase().getTotalCount()
            }`
        )
        .replace('DATABASE_OPTIONS', 
            `${
                getSpriteDatabase().collections.reduce((a, v) => {
                    if (v.mod) {
                        return a + `<option value="mod::${v.mod.id}">${v.mod.name}</option>`;
                    } else {
                        return a;
                    }
                }, '') +
                getSpriteDatabase().collections.reduce((a, v) => {
                    return a + Object.keys(v.sheets).reduce(
                        (sa, sv) => sa + `<option value="sheet::${v.directory}::${sv}">${sv}</option>`,
                        ''
                    );
                }, '')
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
                    panel.webview.postMessage({
                        command: 'database',
                        database: getSpriteDatabase(),
                        default: 
                            getOptions().databaseShowFavoritesByDefault &&
                            getSpriteDatabase().favorites.length ? 'favorites' : 'all'
                    });
                } break;

                case 'set-favorite': {
                    if (message.favorite) {
                        getSpriteDatabase().favorites.push(message.name);
                    } else {
                        getSpriteDatabase().favorites = getSpriteDatabase().favorites.filter(f => f !== message.name);
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
                        switch (message.type) {
                            case 'CCSprite': {
                                createCCSprite(targetEditor, message.value);
                            } break;

                            case 'CCMenuItemSpriteExtra': {
                                createCCMenuItemSpriteExtra(targetEditor, message.value);
                            } break;

                            case 'CCMenuItemSpriteExtra+ButtonSprite': {
                                createCCMISEithBS(targetEditor, message.value);
                            } break;

                            default: {
                                insertSpriteName(targetEditor, message.value);
                            } break;
                        }
                        panel.dispose();
                    } else {
                        window.showErrorMessage(
                            'You are not currently in an active editor. ' + 
                            'Please select an editor to continue :)'
                        );
                    }
                } break;

                case 'info': {
                    window.showInformationMessage(
                        `Name: ${message.sprite.name}\nPath: ${message.sprite.path}\nMod: ${message.sprite.mod}`,
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
