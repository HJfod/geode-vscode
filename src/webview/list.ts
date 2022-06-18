
import { select } from "./types";

export class SelectModel {
    button: HTMLButtonElement;
    popups: HTMLDivElement[];
    value: string | undefined;
    text: string | undefined;
    arrow: boolean;
    textValueMap: { [name: string]: string };
    options: select.Menu;
    onChangeStateFun: ((value: string | undefined) => void) | null = null;

    constructor(elem: HTMLButtonElement) {
        this.button = elem;
        this.popups = [];
        this.value = undefined;
        this.text = undefined;
        this.arrow = true;
        this.options = {
            topLevel: {
                title: '',
                options: [],
                subgroups: [],
            },
        };
        this.textValueMap = {};

        this.button.addEventListener('click', _ => {
            this.show();
        });
    }

    private createMenu(group: select.Group, x: number, y: number) {
        // create new popup
        const popup = document.createElement('div');
        popup.classList.add('select-menu');
        popup.style.top = `${y}px`;
        popup.style.left = `${x}px`;

        for (const option of group.options) {
            const button = document.createElement('button');
            button.innerHTML = option.text;
            button.addEventListener('click', _ => {
                this.value = option.value;
                if (option.selected) {
                    option.selected();
                }
                this.stateChanged();
                this.hide();
            });
            popup.appendChild(button);
        }

        for (const subgroup of group.subgroups) {
            const button = document.createElement('button');
            button.innerHTML = `${
                subgroup.title
            }<span class="arrow"></span>`;
            button.classList.add('group');
            button.addEventListener('click', _ => {
                const rect = button.getBoundingClientRect();
                this.createMenu(subgroup, rect.left + rect.width, rect.top);
            });
            popup.appendChild(button);
        }

        document.body.appendChild(popup);
        this.popups.push(popup);

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
        const iterateAddOptions = (group: select.Group) => {
            for (const opt of group.options) {
                if (opt.value) {
                    this.textValueMap[opt.value] = opt.text;
                }
            }
            for (const grp of group.subgroups) {
                iterateAddOptions(grp);
            }
        };
        iterateAddOptions(menu.topLevel);
    }

    onChangeState(fun: (value: string | undefined) => void) {
        this.onChangeStateFun = fun;
    }

    stateChanged() {
        const arrow = this.arrow ? '<span class="arrow"></span>' : '';
        if (this.text) {
            this.button.innerHTML = `${this.text}${arrow}`;
        } else if (this.value) {
            this.button.innerHTML = `${this.textValueMap[this.value]}${arrow}`;
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
