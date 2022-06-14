import { existsSync, mkdirSync, writeFileSync } from "fs";
import lodash = require("lodash");
import { dirname, join } from "path";
import { SnippetString, TextEditor, ViewColumn, window, workspace, WorkspaceFolder } from "vscode";
import { Sprite } from "../types/sprite";

// class for placeholders in snippets
class Placeholder {
    text: string;
    index: number | undefined;
    constructor(text: string, index: number | undefined) {
        this.text = text;
        this.index = index;
    }
}

// get string literal value for sprite
function getLiteral(value: Sprite) {
    // todo: check if id is from mod in current workspace or external
    return `"${value.name}"${value.mod ? '_spr' : ''}`;
}

// make Placeholder variable name for sprite
function makeVar(value: Sprite, index: number | undefined = undefined) {
    const val = value.name.replace('.png', '').replace(/\w+?_/, '').replace(/_\w+/g, '');
    return new Placeholder(val.charAt(0).toLowerCase() + val.substring(1), index);
}

type SnippetInsert = string | Placeholder;

function alignAndTrim(str: string) {
    return str
        // align
        .replace(new RegExp(`^ {${str.match(/^ +/m)?.at(0)?.length ?? 0}}`, 'gm'), '')
        // and trim :3
        .trim();
}

// snippet literal
function snippet(strs: TemplateStringsArray, ...fmts: SnippetInsert[]) {
    const snippet = new SnippetString();
    let spaces: RegExp;
    strs.forEach((str, ix) => {
        // remove indentation
        if (ix === 0) {
            spaces = new RegExp(`^ {${str.match(/^ +/m)?.at(0)?.length ?? 0}}`, 'gm');
            str = str.trimStart();
        } else {
            str = str.replace(spaces, '');
        }
        if (ix === strs.length - 1) {
            str = str.trimEnd();
        }
        // insert components
        snippet.appendText(str);
        if (ix < fmts.length) {
            const fmt = fmts[ix];
            if (fmt instanceof Placeholder) {
                snippet.appendPlaceholder(fmt.text, fmt.index);
            } else {
                snippet.appendText(fmt);
            }
        }
    });
    return snippet;
}

export function createCCSprite(editor: TextEditor, value: Sprite) {
    const fun = value.path.endsWith('.plist') ? 'createWithSpriteFrameName' : 'create';
    editor.insertSnippet(
        snippet`auto ${makeVar(value)} = CCSprite::${fun}(${getLiteral(value)});`
    );
}

export function createCCMenuItemSpriteExtra(editor: TextEditor, value: Sprite) {
    const fun = value.path.endsWith('.plist') ? 'createWithSpriteFrameName' : 'create';
    editor.insertSnippet(snippet`
        auto ${makeVar(value, 1)}Spr = CCSprite::${fun}(${getLiteral(value)});

        auto ${makeVar(value, 1)} = CCMenuItemSpriteExtra::create(
            ${makeVar(value, 1)}Spr, this, nullptr
        );
    `);
}

export function createCCMISEithBS(editor: TextEditor, value: Sprite) {
    editor.insertSnippet(snippet`
        auto ${makeVar(value, 1)}Spr = ButtonSprite::create(
            "${new Placeholder('Hi mom', 2)}", "bigFont.fnt", ${getLiteral(value)}
        );

        auto ${makeVar(value, 1)} = CCMenuItemSpriteExtra::create(
            ${makeVar(value, 1)}Spr, this, nullptr
        );
    `);
}

export function insertSpriteName(editor: TextEditor, value: Sprite) {
    editor.insertSnippet(new SnippetString(getLiteral(value)));
}

interface ClassCreateOptions {
    inheritFrom: string,
    className: string,
    includeDir: string,
    sourceDir: string,
    dllExportMacro?: string,
    namespace?: string,
    listDataType?: string,
    listDataTypeIsCCObject?: boolean,
}

type ClassFileGenerator = (options: ClassCreateOptions) => string;

interface DefaultClassSnippet {
    defaultName: string,
    nameSuffix?: string,
    header: ClassFileGenerator,
    source: ClassFileGenerator,
}

interface DefaultClassSnippets {
    /* eslint-disable */
    'CustomListView': DefaultClassSnippet,
    'CCNode': DefaultClassSnippet,
    'CCLayer': DefaultClassSnippet,
    'FLAlertLayer': DefaultClassSnippet,
    'Other': DefaultClassSnippet,
    /* eslint-enable */
}

const defaultClassSnippets: DefaultClassSnippets = {
    /* eslint-disable */
    'CustomListView': {
        defaultName: 'MyListView',
        nameSuffix: 'ListView',
        header: options => {
            const listName = `${options.className}ListView`;
            const cellName = `${options.className}Cell`;
            let objName = `${options.listDataType}`;

            let res = `class ${listName};` + '\n\n';

            let dataName = lodash.upperFirst(
                objName.match(/((?<=::)([a-z]|[0-9])+|([A-Z]([a-z]|[0-9])+))/)?.at(0) ?? 'Data'
            );
            let dataVarName = lodash.lowerFirst(dataName);
            
            if (!options.listDataTypeIsCCObject) {
                objName = `${options.className}Object`;
                const ref = options.listDataType?.endsWith('*') ? '' : ' const&';
                res += alignAndTrim(`
                struct ${options.dllExportMacro}${objName} : public cocos2d::CCObject {
                    ${options.listDataType} m_data;
                    inline ${objName}(${options.listDataType}${ref} data) {
                        m_data = data;
                        this->autorelease();
                    }
                };
                `) + '\n\n';
            }

            return res + alignAndTrim(`

            class ${options.dllExportMacro}${cellName} : public TableViewCell {
            protected:
                ${listName}* m_list;
                cocos2d::CCMenu* m_menu;

                ${cellName}(const char* name, cocos2d::CCSize const& size);

                bool init(${listName}* list);
                void draw() override;
            
            public:
                void updateBGColor(int index);
                void loadFrom${dataName}(${objName}* ${dataVarName});

                static ${cellName}* create(${listName}* list, const char* key, cocos2d::CCSize size);
            };

            class ${options.dllExportMacro}${listName} : public CustomListView {
            protected:
                void setupList() override;
                TableViewCell* getListCell(const char* key) override;
                void loadCell(TableViewCell* cell, unsigned int index) override;
            
            public:
                static ${listName}* create(
                    cocos2d::CCArray* ${dataVarName}s,
                    float width = 358.f,
                    float height = 220.f
                );
            };

            `);
        },
        source: options => {
            const listName = `${options.className}ListView`;
            const cellName = `${options.className}Cell`;
            let objName = `${options.listDataType}`;

            let dataName = lodash.upperFirst(
                objName.match(/((?<=::)([a-z]|[0-9])+|([A-Z]([a-z]|[0-9])+))/)?.at(0) ?? 'Data'
            );
            let dataVarName = lodash.lowerFirst(dataName);

            if (!options.listDataTypeIsCCObject) {
                objName = `${options.className}Object`;
            }

            return alignAndTrim(`

            ${cellName}::${cellName}(const char* name, CCSize const& size) :
                TableViewCell(name, size.width, size.height) {}

            void ${cellName}::draw() {
                reinterpret_cast<StatsCell*>(this)->StatsCell::draw();
            }

            void ${cellName}::updateBGColor(int index) {
                if (index & 1) m_backgroundLayer->setColor(ccc3(0xc2, 0x72, 0x3e));
                else m_backgroundLayer->setColor(ccc3(0xa1, 0x58, 0x2c));
                m_backgroundLayer->setOpacity(255);
            }

            bool ${cellName}::init(${listName}* list) {
                m_list = list;
                return true;
            }

            void ${cellName}::loadFrom${dataName}(${objName}* ${dataVarName}) {
                m_mainLayer->setVisible(true);
                m_backgroundLayer->setOpacity(255);
                                
                m_menu = CCMenu::create();
                m_menu->setPosition(m_height / 2, m_height / 2);
                m_mainLayer->addChild(m_menu);

                // cell ui code here
            }

            ${cellName}* ${cellName}::create(
                ${listName}* list, const char* key, CCSize size
            ) {
                auto pRet = new ${cellName}(key, size);
                if (pRet && pRet->init(list)) {
                    return pRet;
                }
                CC_SAFE_DELETE(pRet);
                return nullptr;
            }

            void ${listName}::setupList() {
                // set item size
                m_itemSeparation = 40.0f;
                
                // load data
                if (!m_entries->count()) return;
                m_tableView->reloadData();

                // fix content layer content size so the 
                // list is properly aligned to the top
                auto coverage = calculateChildCoverage(m_tableView->m_contentLayer);
                m_tableView->m_contentLayer->setContentSize({
                    -coverage.origin.x + coverage.size.width,
                    -coverage.origin.y + coverage.size.height
                });
                
                // align list to the top
                if (m_entries->count() == 1) {
                    m_tableView->moveToTopWithOffset(m_itemSeparation * 2);
                } else if (m_entries->count() == 2) {
                    m_tableView->moveToTopWithOffset(-m_itemSeparation);
                } else {
                    m_tableView->moveToTop();
                }
            }

            TableViewCell* ${listName}::getListCell(const char* key) {
                return ${cellName}::create(this, key, { m_width, m_itemSeparation });
            }

            void ${listName}::loadCell(TableViewCell* cell, unsigned int index) {
                as<${cellName}*>(cell)->loadFrom${dataName}(
                    as<${objName}*>(m_entries->objectAtIndex(index))
                );
                as<${cellName}*>(cell)->updateBGColor(index);
            }

            ${listName}* ${listName}::create(
                CCArray* ${dataVarName}s,
                float width,
                float height
            ) {
                auto ret = new ${listName};
                if (ret && ret->init(
                    ${dataVarName}s,
                    BoomListType::Default,
                    width,
                    height
                )) {
                    ret->autorelease();
                    return ret;
                }
                CC_SAFE_DELETE(ret);
                return nullptr;
            }

            `);
        },
    },
    'CCNode': {
        defaultName: 'MyNode',
        header: options => alignAndTrim(`
        
        class ${options.dllExportMacro}${options.className} : public cocos2d::CCNode {
        protected:
            bool init();
        
        public:
            static ${options.className}* create();
        };

        `),
        source: options => alignAndTrim(`
        
        bool ${options.className}::init() {
            if (!CCNode::init())
                return false;

            return true;
        }
        
        ${options.className}* ${options.className}::create() {
            auto ret = new ${options.className}();
            if (ret && ret->init()) {
                ret->autorelease();
                return ret;
            }
            CC_SAFE_DELETE(ret);
            return nullptr;
        }

        `),
    },
    'CCLayer': {
        defaultName: 'MyLayer',
        header: options => alignAndTrim(`
        
        class ${options.dllExportMacro}${options.className} : public cocos2d::CCLayer {
        protected:
            bool init();
        
        public:
            static ${options.className}* create();
        };

        `),
        source: options => alignAndTrim(`
        
        bool ${options.className}::init() {
            if (!CCLayer::init())
                return false;
            
            this->setKeypadEnabled(true);
            this->setTouchEnabled(true);

            return true;
        }
        
        ${options.className}* ${options.className}::create() {
            auto ret = new ${options.className}();
            if (ret && ret->init()) {
                ret->autorelease();
                return ret;
            }
            CC_SAFE_DELETE(ret);
            return nullptr;
        }

        `),
    },
    'FLAlertLayer': {
        defaultName: 'MyPopup',
        header: _ => '',
        source: _ => ''
    },
    'Other': {
        defaultName: 'MyNode',
        header: options => alignAndTrim(`
        
        class ${options.dllExportMacro}${options.className} : public ${options.inheritFrom} {
        protected:
            bool init();
        
        public:
            static ${options.className}* create();
        };

        `),
        source: options => alignAndTrim(`
        
        bool ${options.className}::init() {
            if (!${options.inheritFrom}::init())
                return false;

            return true;
        }
        
        ${options.className}* ${options.className}::create() {
            auto ret = new ${options.className}();
            if (ret && ret->init()) {
                ret->autorelease();
                return ret;
            }
            CC_SAFE_DELETE(ret);
            return nullptr;
        }

        `),
    },
    /* eslint-enable */
};

async function createClassFiles(target: WorkspaceFolder, options: ClassCreateOptions) {
    let actualClassName = options.className;

    const snippet = (options.inheritFrom in defaultClassSnippets) ?
        defaultClassSnippets[options.inheritFrom as keyof DefaultClassSnippets] :
        defaultClassSnippets.Other;

    if (snippet.nameSuffix) {
        actualClassName += snippet.nameSuffix;
    }

    function finishHeader(str: string) {
        if (options.namespace) {
            return '#pragma once\n\n' +
                '#include <Geode.hpp>\n\n' + 
                `namespace ${options.namespace} {\n\t` +
                str.replace(/\n/g, '\n    ') + 
                '\n}\n';
        }
        return `#pragma once\n\n#include <Geode.hpp>\n\n${str}\n`;
    }

    function finishSource(str: string) {
        const incPath = 
            options.sourceDir === options.includeDir ?
            `"${actualClassName}.hpp"` :
            `<${options.includeDir.replace(/\\/g, '/')}/${actualClassName}.hpp>`;
        if (options.namespace) {
            return `#include ${incPath}\n\n` + 
                'USE_GEODE_NAMESPACE();\n' +
                `using namespace ${options.namespace};\n\n` +
                str + 
                '\n';
        }
        return `#include ${incPath}\n\nUSE_GEODE_NAMESPACE();\n\n${str}\n`;
    }

    if (!options.listDataType) {
        options.listDataType = 'void*';
        options.listDataTypeIsCCObject = false;
    }

    options.dllExportMacro = 
        options.includeDir !== options.sourceDir ?
            '/* dllexport here */ ' : '';
    
    const headerDir = join(target.uri.fsPath, options.includeDir);
    const sourceDir = join(target.uri.fsPath, options.sourceDir);
    if (!existsSync(headerDir)) {
        mkdirSync(headerDir, { recursive: true });
    }
    if (!existsSync(sourceDir)) {
        mkdirSync(sourceDir, { recursive: true });
    }

    const headerLoc = join(headerDir, actualClassName + '.hpp');
    const sourceLoc = join(sourceDir, actualClassName + '.cpp');

    writeFileSync(headerLoc, finishHeader(snippet.header(options)));
    writeFileSync(sourceLoc, finishSource(snippet.source(options)));

    window.showTextDocument(await workspace.openTextDocument(headerLoc), undefined);
    await window.showTextDocument(await workspace.openTextDocument(sourceLoc), ViewColumn.Beside);

    window.showInformationMessage('Class files created :)');
}

export async function createClassWalkthrough() {
    try {
        function getDefaultName(className: string) {
            if (className in defaultClassSnippets) {
                return defaultClassSnippets[className as keyof DefaultClassSnippets].defaultName;
            }
            return defaultClassSnippets.Other.defaultName;
        }

        function formatName(className: string | undefined, inheritance: string) {
            if (!className) {
                return undefined;
            }
            switch (inheritance) {
                case 'CustomListView': {
                    // remove any 'List' or 'View' extension
                    className = className.replace(/(list|view)+$/im, '');
                } break;
            }
            // convert to PascalCase
            className = lodash.upperFirst(lodash.camelCase(className));
            return className.split('').filter(c => c.match(/^[a-z0-9]+$/i)).join('');
        }

        if (!workspace.workspaceFolders) {
            throw new Error('No workspace folder opened');
        }
        const wspace = workspace.workspaceFolders.length > 1 ?
            await window.showWorkspaceFolderPick() :
            workspace.workspaceFolders[0];

        if (!wspace) {
            throw new Error('No workspace selected');
        }

        let suggestedLocation = 'src/nodes';
        if (window.activeTextEditor) {
            if (window.activeTextEditor.document.uri.fsPath.includes(wspace.uri.fsPath)) {
                suggestedLocation = dirname(
                    window.activeTextEditor.document.uri.fsPath.replace(
                        wspace.uri.fsPath, ''
                    ).substring(1)
                );
            }
        }

        const pick = await window.showQuickPick([
            ...Object.keys(defaultClassSnippets)
        ], {
            title: 'Which class to inherit from?',
            canPickMany: false
        });

        const inheritFrom = (pick === 'Other') ?
            await window.showInputBox({
                title: 'Enter class name'
            }) : pick;
        
        if (!inheritFrom) {
            throw new Error('No inheritance specified');
        }

        let className = formatName(await window.showInputBox({
            title: "What's the name of your class?"
        }), inheritFrom) ?? getDefaultName(inheritFrom);

        const expose = await window.showQuickPick([
            'Internal',
            'Export',
        ], {
            title: "Should this class be exported for other mods to use? " +
                   "(You will need to add dllexport yourself)",
            canPickMany: false
        });

        let includeDir: string;
        let sourceDir: string;
        if (expose === 'Export') {
            const inc = await window.showInputBox({
                title: 'Where should the class header be placed?',
                value: suggestedLocation.replace('src', 'include')
            });
            if (!inc) {
                throw new Error('Include directory not set');
            }
            includeDir = inc;

            const src = await window.showInputBox({
                title: 'Where should the class source be placed?',
                value: suggestedLocation
            });
            if (!src) {
                throw new Error('Source directory not set');
            }
            sourceDir = src;
        } else {
            const dir = await window.showInputBox({
                title: 'Where should the class be placed?',
                value: suggestedLocation
            });
            if (!dir) {
                throw new Error('Class directory not set');
            }
            includeDir = sourceDir = dir; 
        }

        let listDataTypeIsCCObject: boolean | undefined;
        let listDataType: string | undefined;
        
        if (inheritFrom === 'CustomListView') {
            listDataType = await window.showInputBox({
                title: 'What datatype does this list work with? ' + 
                '(Enter full C++ datatype; make sure to include `*` in pointers. ' + 
                'Defaults to `void*`)'
            });

            listDataTypeIsCCObject = await window.showQuickPick([
                'No', 'Yes'
            ], {
                title: 'Does this datatype inherit from CCObject? ' + 
                '(If not, a wrapper class will be created)'
            }) === 'Yes';
        }
        
        let namespace = await window.showInputBox({
            title: 'What namespace should the class be in? (Leave blank for none)'
        });

        createClassFiles(
            wspace,
            {
                inheritFrom,
                className,
                includeDir,
                sourceDir,
                namespace,
                listDataType,
                listDataTypeIsCCObject,
            }
        );

    } catch(e) {
        window.showErrorMessage(`Class creation cancelled: ${e}`);
    }
}
