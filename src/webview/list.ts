import { select } from "./types";



export class SelectModel {
    button: HTMLButtonElement;
    popup: HTMLDivElement | null;
    value: string;
    textValueMap: { [name: string]: string };
    options: select.Menu;
    onChangeStateFun: ((value: string) => void) | null = null;

    constructor(elem: HTMLButtonElement) {
        this.button = elem;
        this.popup = null;
        this.value = '';
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

        const createOption = (opt: select.Option) => {
            const button = document.createElement('button');
            button.innerHTML = opt.text;
            button.addEventListener('click', _ => {
                this.value = opt.value;
                this.stateChanged();
                this.hide();
            });
            return button;
        };

        const createSubmenu = (subgroup: select.Group) => {
            const button = document.createElement('button');
            button.innerHTML = `${
                subgroup.title
            }<span class="arrow"></span>`;
            button.classList.add('group');
            button.addEventListener('click', _ => {
                const rect = button.getBoundingClientRect();
                const boundingRect = button.parentElement?.getBoundingClientRect();
                popup.appendChild(this.createMenu(
                    subgroup,
                    rect.width,
                    rect.top - (boundingRect?.top ?? 0),
                ));
            });
            return button;
        };

        for (const option of group.options) {
            popup.appendChild(createOption(option));
        }

        for (const subgroup of group.subgroups) {
            popup.appendChild(createSubmenu(subgroup));
        }

        return popup;
    }

    show() {
        // remove old popup if one exists
        this.popup?.remove();
        // get button position
        const rect = this.button.getBoundingClientRect();
        // create new popup
        document.body.appendChild(
            this.popup = this.createMenu(
                this.options.topLevel,
                rect.left + document.body.scrollLeft,
                rect.top + rect.height + document.body.scrollTop,
            )
        );
    }

    hide(node: Node | null = null) {
        if (!node) {
            // remove popup
            this.popup?.remove();
            this.popup = null;
        } else {
            // if the button was clicked, just 
            // reshow the whole menu
            if (this.button.contains(node)) {
                this.show();
            }
            // otherwise, check if we have a menu 
            // to hide
            else if (this.popup) {
                // hide submenus that are not the parents of 
                // or the one clicked
                const showIfIn = (menu: Element) => {
                    if (!menu.contains(node)) {
                        menu.remove();
                    } else {
                        menu.querySelectorAll('.select-menu')
                            .forEach(p => showIfIn(p));
                    }
                };
                showIfIn(this.popup);
            }
        }
    }

    setOptions(menu: select.Menu) {
        this.options = menu;
        this.textValueMap = {};
        const iterateAddOptions = (group: select.Group) => {
            for (const opt of group.options) {
                this.textValueMap[opt.value] = opt.text;
            }
            for (const grp of group.subgroups) {
                iterateAddOptions(grp);
            }
        };
        iterateAddOptions(menu.topLevel);
        console.log(this.textValueMap);
    }

    onChangeState(fun: (value: string) => void) {
        this.onChangeStateFun = fun;
    }

    stateChanged() {
        console.log(this.value);
        this.button.innerHTML = this.textValueMap[this.value];
        if (this.onChangeStateFun) {
            this.onChangeStateFun(this.value);
        }
    }
}
