
import { select } from "./types";

export class SelectModel {
    button: HTMLButtonElement;
    popups: HTMLDivElement[];
    value: string | undefined;
    text: string | undefined;
    arrow: boolean;
    textValueMap: { [name: string]: { text: string, group: string, } };
    options: select.Menu;
    onChangeStateFun: ((value: string | undefined) => void) | null = null;

    constructor(elem: HTMLButtonElement) {
        this.button = elem;
        this.popups = [];
        this.value = undefined;
        this.text = undefined;
        this.arrow = true;
        this.options = {
            topLevel: {},
        };
        this.textValueMap = {};

        this.button.addEventListener('click', _ => {
            this.show();
        });
    }

    private createMenu(group: select.Option, x: number, y: number) {
        // create new popup
        const popup = document.createElement('div');
        popup.classList.add('select-menu');

        if (group.options) {
            for (const option of group.options) {
                // implicit separator
                if (!option.text && !option.value) {
                    const hr = document.createElement('div');
                    hr.classList.add('hr');
                    popup.appendChild(hr);
                } else {
                    const button = document.createElement('button');
                    button.innerHTML = option.text ?? option.value as string;
                    if (option.options) {
                        button.innerHTML += '<span class="arrow"></span>';
                        button.classList.add('group');
                    }
                    button.addEventListener('click', _ => {
                        this.value = option.value;
                        if (option.selected) {
                            option.selected();
                        }
                        if (option.options) {
                            const rect = button.getBoundingClientRect();
                            this.createMenu(option, rect.left + rect.width, rect.top);
                        } else {
                            this.update();
                            this.hide();
                        }
                    });
                    popup.appendChild(button);
                }
            }
        }

        document.body.appendChild(popup);
        this.popups.push(popup);
        
        const size = popup.getBoundingClientRect();
        const winSize = document.body.getBoundingClientRect();

        // make sure popup doesn't go outside window
        while (x + size.width > winSize.width) {
            x -= size.width;
        }

        popup.style.top = `${y}px`;
        popup.style.left = `${x}px`;
        
        return popup;
    }

    show() {
        // remove old popup if one exists
        this.hide();
        // get button position
        const rect = this.button.getBoundingClientRect();
        // create new popup
        this.createMenu(
            this.options.topLevel,
            rect.left + document.body.scrollLeft,
            rect.top + rect.height + document.body.scrollTop,
        );
    }

    hide(node: Node | null = null) {
        if (!node) {
            // remove popup
            for (const popup of this.popups) {
                popup.remove();
            }
            this.popups = [];
        } else {
            // if the button was clicked, just 
            // reshow the whole menu
            if (this.button.contains(node)) {
                this.show();
            }
            // otherwise, check if we have a menu 
            // to hide
            else if (this.popups) {
                // hide submenus that are not the parents of 
                // or the one clicked
                this.popups.forEach(p => {
                    if (!p.contains(node)) {
                        p.remove();
                    }
                });
            }
        }
    }

    setOptions(menu: select.Menu) {
        this.options = menu;
        this.textValueMap = {};
        const iterateAddOptions = (group: select.Option) => {
            if (group.options) {
                for (const opt of group.options) {
                    if (opt.value) {
                        this.textValueMap[opt.value] = {
                            text: opt.text ?? opt.value ?? 'untitled option',
                            group: group.text ?? group.value ?? 'untitled group',
                        };
                    }
                    iterateAddOptions(opt);
                }
            }
        };
        iterateAddOptions(menu.topLevel);
    }

    onChangeState(fun: (value: string | undefined) => void) {
        this.onChangeStateFun = fun;
    }

    update() {
        const arrow = this.arrow ? '<span class="arrow"></span>' : '';
        if (this.text) {
            this.button.innerHTML = `${this.text}${arrow}`;
        } else if (this.value) {
            const txt = this.textValueMap[this.value];
            this.button.innerHTML = `<span class="group-name">${txt.group}</span>${txt.text}${arrow}`;
        }
        if (this.arrow) {
            this.button.classList.add('arrowful');
        } else {
            this.button.classList.remove('arrowful');
        }
        if (this.onChangeStateFun) {
            this.onChangeStateFun(this.value);
        }
    }
}

export class SelectDatabase {
    models: SelectModel[] = [];

    create(elem: HTMLButtonElement) {
        const model = new SelectModel(elem);
        this.models.push(model);
        return model;
    }

    remove(model: SelectModel) {
        this.models = this.models.filter(m => m !== model);
    }

    hideAll(node: Node | null = null) {
        for (const model of this.models) {
            model.hide(node);
        }
    }
}

const database = new SelectDatabase;

export function getSelectDatabase() {
    return database;
}
