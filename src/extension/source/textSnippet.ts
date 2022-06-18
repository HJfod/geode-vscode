
import { existsSync, mkdirSync, writeFileSync } from "fs";
import lodash = require("lodash");
import { dirname, join } from "path";
import { SnippetString, TextEditor, ViewColumn, window, workspace, WorkspaceFolder } from "vscode";
import { Item, ItemType } from "../../types/types";

// class for placeholders in snippets
class Placeholder {
    prefix?: string;
    suffix?: string;
    text: string;
    index: number;
    static incrementIndex = 1;
    constructor(text: string, index: number | undefined = undefined) {
        this.text = text;
        this.index = index ?? Placeholder.incrementIndex++;
    }
    copy() {
        const clone = new Placeholder(this.text, this.index);
        clone.suffix = this.suffix;
        clone.prefix = this.prefix;
        return clone;
    }
}

// get string literal value for sprite
function getLiteral(value: Item) {
    // todo: check if id is from mod in current workspace or external
    return `"${value.name}"${value.owner.mod ? '_spr' : ''}`;
}

// make Placeholder variable name for sprite
function makeVar(value: Item, index: number | undefined = undefined) {
    const val = value.name
        .replace(/\.[a-z]+/g, '')
        .replace(/-hd|-uhd/g, '')
        .replace(/\w+?_/, '')
        .replace(/_\w+/g, '');
    return new Placeholder(val.charAt(0).toLowerCase() + val.substring(1), index);
}

type SnippetInsert = string | Placeholder;

// snippet literal
function snippet(strs: TemplateStringsArray, snippet: SnippetString, ...fmts: SnippetInsert[]) {
    let spaces: RegExp;
    strs.slice(1).forEach((str, ix, list) => {
        // remove indentation
        if (ix === 0) {
            spaces = new RegExp(`^ {${str.match(/^ +/m)?.at(0)?.length ?? 0}}`, 'gm');
            str = str.trimStart();
        } else {
            str = str.replace(spaces, '');
        }
        if (ix === list.length - 1) {
            str = str.trimEnd();
        }
        // insert components
        snippet.appendText(str);
        if (ix < fmts.length) {
            const fmt = fmts[ix];
            if (fmt instanceof Placeholder) {
                if (fmt.prefix) {
                    snippet.appendText(fmt.prefix);
                }
                snippet.appendPlaceholder(fmt.text, fmt.index);
                if (fmt.suffix) {
                    snippet.appendText(fmt.suffix);
                }
            } else {
                snippet.appendText(fmt);
            }
        }
    });
    return snippet;
}

function insert(editor: TextEditor, snippet: SnippetString): Promise<void> {
    return new Promise((resolve, reject) => {
        editor.insertSnippet(snippet)
            .then(async v => {
                if (v) {
                    resolve();
                } else {
                    reject('Snippet could not be inserted');
                }
            });
    });
}

interface SnippetParam {
    data: string,
    params: SnippetParam[],
}

type SnippetGen = (
    value: Item,
    snippet: SnippetString,
    varName?: Placeholder,
    params?: SnippetParam[],
) => void;

type DefaultShortSnippets = { [name: string]: SnippetGen };

const shortSnippets: DefaultShortSnippets = {
    /* eslint-disable */
    'CCSprite': (value, res, varName) => {
        const fun = value.path.endsWith('.plist') ? 'createWithSpriteFrameName' : 'create';
        if (!varName) {
            varName = makeVar(value);
        }
        snippet`${res}
            auto ${varName} = CCSprite::${fun}(${getLiteral(value)});
        `;
    },
    
    'CCMenuItemSpriteExtra': (value, res, varName, params) => {
        if (!varName) {
            varName = makeVar(value);
        }

        if (!params) {
            snippet`${res}"Internal error: no parameters provided"`;
            return;
        }

        const sprVarName = varName.copy();
        sprVarName.suffix = 'Spr';

        if (!(params[0].data in shortSnippets)) {
            snippet`${res}"Internal error: param ${params[0].data} not known"`;
            return;
        }

        (shortSnippets[params[0].data as keyof DefaultShortSnippets] as SnippetGen)(
            value, res, sprVarName, params[0].params
        );

        res.appendText('\n');

        snippet`${res}
            auto ${varName} = CCMenuItemSpriteExtra::create(
                ${sprVarName}, this, nullptr
            );
        `;
    },

    'ButtonSprite': (value, res, varName) => {
        if (!varName) {
            varName = makeVar(value);
        }

        const font = value.type === ItemType.font ? getLiteral(value)    : '"bigFont.fnt"';
        const spr  = value.type === ItemType.font ? '"GJ_button_01.png"' : getLiteral(value);

        snippet`${res}
            auto ${varName} = ButtonSprite::create(
                "${new Placeholder('Hi mom')}", ${font}, ${spr}
            );
        `;
    },

    'CCLabelBMFont': (value, res, varName) => {
        if (!varName) {
            varName = new Placeholder('label');
        }
        snippet`${res}
            auto ${varName} = CCLabelBMFont::create(
                "${new Placeholder('Hi mom')}", ${getLiteral(value)}
            );
        `;
    },
    /* eslint-enable */
};

export function insertSpriteName(editor: TextEditor, value: Item) {
    editor.insertSnippet(new SnippetString(getLiteral(value)));
}

export async function insertSnippet(editor: TextEditor, value: Item, rawExpr: string | undefined) {
    if (rawExpr) {
        // remove all whitespace
        const expr = rawExpr.replace(/\s*/g, '');

        let index = 0;

        const getName = () => {
            let startIndex = index;
            while (index < expr.length) {
                const code = expr.charCodeAt(index);
                if (
                    !(code > 47 && code < 58) && // numeric (0-9)
                    !(code > 64 && code < 91) && // upper alpha (A-Z)
                    !(code > 96 && code < 123)   // lower alpha (a-z)
                ) {
                    break;
                }
                index++;
            }
            return expr.substring(startIndex, index);
        };

        const getParams = () => {
            const res: SnippetParam[] = [];
            // skip '('
            index++;
            while (index < expr.length) {
                const data = getName();
                let params: SnippetParam[] = [];
                if (expr.at(index) === '(') {
                    params = getParams();
                }
                res.push({
                    data,
                    params,
                });
                if (expr.at(index) === ',') {
                    index++;
                } else {
                    break;
                }
            }
            // skip ')'
            index++;
            return res;
        };

        while (index < expr.length) {
            const data = getName();
            let params: SnippetParam[] = [];
            if (expr.at(index) === '(') {
                params = getParams();
            }
            // check if valid snippet id
            if (data in shortSnippets) {
                const snippet = new SnippetString();
                // get snippets
                shortSnippets[
                    data as keyof DefaultShortSnippets
                ](value, snippet, undefined, params);

                // insert snippet
                await insert(editor, snippet);
            } else {
                await insert(
                    editor,
                    new SnippetString(`"internal error: unhandled key: ${data}"`)
                );
            }
            // to make sure we don't end up in an infinite 
            // loop by accident, have some break condition
            if (index < expr.length && expr.at(index) === '+') {
                index++;
            } else {
                break;
            }
        }
    } else {
        insertSpriteName(editor, value);
    }
}
