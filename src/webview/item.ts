
import { Item, ItemType, MetaItem, select } from '../types/types';
import { getFavorites, removeFavorite } from './database';
import { getSelectDatabase, SelectModel } from './list';

function filterSearch(name: string, query: string) {
    return name.replace(/\s/g, '').toLowerCase().includes(
        query.replace(/\s/g, '').toLowerCase()
    );
}

export function createLoadingCircle(parent: Element | null) {
    if (!parent?.querySelector('.loading-circle')) {
        const circle = document.createElement('div');
        circle.classList.add('loading-circle');
        return circle;
    }
    return null;
}

export interface ItemOptions {
    meta: MetaItem,
    favorite: boolean,
    globalSelect: SelectModel,
    postMessage: (message: unknown) => void
}

export class ItemModel {
    item: Item;
    sheet: string | null;
    id: string;
    element: HTMLElement;
    image: HTMLImageElement | HTMLParagraphElement | null = null;
    imageDiv: HTMLDivElement;
    isFavorite: boolean;
    options: ItemOptions;
    select: SelectModel | null;

    constructor(options: ItemOptions) {
        this.options = options;
        this.item = options.meta.item;
        this.sheet = options.meta.sheet;
        this.isFavorite = options.favorite;
        this.id = options.meta.item.name;
        this.select = null;
        this.element = this.build(options);
        this.imageDiv = this.element.querySelector('#image-div') as HTMLDivElement;
    }

    show(show: boolean) {
        if (show) {
            this.element.classList.remove('hidden');
        } else {
            this.element.classList.add('hidden');
        }
    }

    becameVisible(visible: boolean) {
        if (visible) {
            this.fetchImage();
        } else {
            this.becameHidden();
        }
    }

    setImage(data: string) {
        this.image?.remove();
        this.image = document.createElement('img');
        this.imageDiv.appendChild(this.image);
        if (data) {
            (this.image as HTMLImageElement).src = `data:image/png;base64,${data}`;
        } else {
            this.addFailedImage();
        }
        this.removeLoadingCircle();
    }

    private addFailedImage() {
        this.image?.remove();
        this.image = document.createElement('p');
        this.image.innerHTML = '418 Not found :(';
        this.imageDiv.appendChild(this.image);
    }

    private addLoadingCircle() {
        const circle = createLoadingCircle(this.imageDiv);
        if (circle) {
            this.imageDiv.appendChild(circle);
        }
    }

    private removeLoadingCircle() {
        this.imageDiv.querySelector('.loading-circle')?.remove();
    }

    private fetchImage() {
        this.addLoadingCircle();
        switch (this.item.type) {
            case ItemType.font: {
                this.options.postMessage({
                    command: 'load-font',
                    path: this.item.path,
                    element: this.id,
                    text: "Abc123"
                });
            } break;

            case ItemType.sheetSprite: case ItemType.sprite: {
                this.options.postMessage({
                    command: 'load-image',
                    sprite: this.item,
                    element: this.id,
                });
            } break;

            case ItemType.audio: {
                this.options.postMessage({
                    command: 'load-audio',
                    element: this.id,
                });
            } break;

            default: {
                this.setImage('');
            } break;
        }
    }

    private becameHidden() {
        this.image?.remove();
        this.removeLoadingCircle();
    }

    private build(options: ItemOptions): HTMLElement {
        const element = document.createElement('article');
        element.setAttribute('owner-item', this.id);
        element.innerHTML = `
            <div id="image-div"></div>
            <p>${this.item.name}</p>
            <div id="links"></div>
            <div id="buttons"></div>
        `;

        const useButton = document.createElement('button');
        useButton.innerHTML = 'Use';
        useButton.addEventListener('click', _ => {
            options.postMessage({
                command: 'use-value',
                value: this.item,
                type: ''
            });
        });
        element.querySelector('#buttons')?.appendChild(useButton);

        const dropdownMenu: select.Menu = {
            topLevel: {
                title: '',
                options: [],
                subgroups: [],
            }
        };
        
        // todo: deal with fonts (have a Create CCLabel for them)
        dropdownMenu.topLevel.options = [
            {
                text: 'Create CCSprite',
                selected: () => {
                    options.postMessage({
                        command: 'use-value',
                        value: this.item,
                        type: 'CCSprite'
                    });
                },
            },
            {
                text: 'Create button',
                selected: () => {
                    options.postMessage({
                        command: 'use-value',
                        value: this.item,
                        type: 'CCMenuItemSpriteExtra'
                    });
                },
            }
        ];

        if (this.item.type === ItemType.sprite) {
            dropdownMenu.topLevel.options.push({
                text: 'Create button w/ ButtonSprite',
                selected: () => {
                    options.postMessage({
                        command: 'use-value',
                        value: this.item,
                        type: 'CCMenuItemSpriteExtra+ButtonSprite'
                    });
                }
            });
        }

        const otherUseButton = document.createElement('button');
        otherUseButton.classList.add('select-button');
        element.querySelector('#buttons')?.appendChild(otherUseButton);

        this.select = getSelectDatabase().create(otherUseButton);
        this.select.text = '...';
        this.select.arrow = false;
        this.select.setOptions(dropdownMenu);
        this.select.update();

        const starButton = document.createElement('button');
        starButton.innerHTML = '★';
        if (options.favorite) {
            starButton.classList.add('favorite');
        }
        starButton.addEventListener('click', _ => {
            this.isFavorite = !this.isFavorite;
            if (this.isFavorite) {
                starButton.classList.add('favorite');
                getFavorites().push(this.item.name);
            } else {
                starButton.classList.remove('favorite');
                removeFavorite(this.item.name);
            }
            options.postMessage({
                command: 'set-favorite',
                name: this.item.name,
                favorite: this.isFavorite
            });
        });
        element.querySelector('#buttons')?.appendChild(starButton);

        const srcLink = document.createElement('a');
        srcLink.innerHTML = 'Source';
        srcLink.addEventListener('click', _ => {
            options.globalSelect.value = `all::${this.item.owner.directory}`;
            options.globalSelect.update();
        });
        element.querySelector('#links')?.appendChild(srcLink);
        
        if (this.sheet) {
            const sheetLink = document.createElement('a');
            sheetLink.innerHTML = 'Sheet';
            sheetLink.addEventListener('click', _ => {
                options.globalSelect.value = `sheet::${this.item.owner.directory}::${this.sheet}`;
                options.globalSelect.update();
            });
            element.querySelector('#links')?.appendChild(sheetLink);
        }

        const hoverItem = document.createElement('div');
        hoverItem.classList.add('hover-item');

        const infoButton = document.createElement('button');
        infoButton.innerHTML = 'Info';
        infoButton.addEventListener('click', _ => {
            options.postMessage({
                command: 'info',
                item: this.item
            });
        });
        hoverItem.appendChild(infoButton);

        element.insertBefore(hoverItem, element.children[0]);

        return element;
    }
}

export class ItemDatabase {
    items: ItemModel[] = [];

    create(options: ItemOptions) {
        const item = new ItemModel(options);
        this.items.push(item);
        return item;
    }

    itemById(id: string) {
        return this.items.find(item => item.id === id);
    }

    itemByElement(elem: Element) {
        const id = elem.getAttribute('owner-item');
        return id ? this.itemById(id) : undefined;
    }

    showByQuery(query: string): number {
        let show = 0;
        this.items.forEach(item => {
            if (filterSearch(item.item.name, query)) {
                item.show(true);
                show++;
            } else {
                item.show(false);
            }
        });
        return show;
    }

    clear() {
        this.items.forEach(item => {
            if (item.select) {
                getSelectDatabase().remove(item.select);
            }
            item.element.remove();
        });
        this.items = [];
    }
}

const database = new ItemDatabase;

export function getItemDatabase() {
    return database;
}
