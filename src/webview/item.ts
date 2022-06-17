
import { Item, ItemType, MetaItem } from '../types/types';
import { getFavorites, removeFavorite } from './database';

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

    constructor(options: ItemOptions) {
        this.options = options;
        this.item = options.meta.item;
        this.sheet = options.meta.sheet;
        this.isFavorite = options.favorite;
        this.id = options.meta.item.name;
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
            ${this.sheet ? `<a>${this.sheet}</a>` : ''}
            <div id="buttons"></div>
            <div id="dropdown" class="hidden"></div>
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

        const dropdown = element.querySelector('#dropdown') as HTMLDivElement;

        // todo: deal with fonts (have a Create CCLabel for them)
        const dropdownItems = [
            {
                text: 'Create CCSprite',
                callback: (_: MouseEvent) => {
                    options.postMessage({
                        command: 'use-value',
                        value: this.item,
                        type: 'CCSprite'
                    });
                }
            },
            {
                text: 'Create button',
                callback: (_: MouseEvent) => {
                    options.postMessage({
                        command: 'use-value',
                        value: this.item,
                        type: 'CCMenuItemSpriteExtra'
                    });
                }
            }
        ];

        if (this.item.type === ItemType.sprite) {
            dropdownItems.push({
                text: 'Create button w/ ButtonSprite',
                callback: (_: MouseEvent) => {
                    options.postMessage({
                        command: 'use-value',
                        value: this.item,
                        type: 'CCMenuItemSpriteExtra+ButtonSprite'
                    });
                }
            });
        }

        for (const btn of dropdownItems) {
            const dropdownBtn = document.createElement('button');
            dropdownBtn.innerHTML = btn.text;
            dropdownBtn.addEventListener('click', btn.callback);
            dropdown.appendChild(dropdownBtn);
        }

        const otherUseButton = document.createElement('button');
        otherUseButton.innerHTML = '...';
        otherUseButton.addEventListener('click', e => {
            dropdown.style.top = e.pageY + 'px';
            dropdown.style.left = e.pageX + 'px';
            dropdown.classList.remove('hidden');
            e.stopPropagation();
        });
        element.querySelector('#buttons')?.appendChild(otherUseButton);

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

        if (this.sheet) {
            const sheetLink = element.querySelector('a');
            sheetLink?.addEventListener('click', _ => {
                const select = document.getElementById('select-source') as HTMLSelectElement;
                select.value = `sheet::${this.item.owner.directory}::${this.sheet}`;
                select.dispatchEvent(new Event('change'));
            });
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
            item.element.remove();
        });
        this.items = [];
    }
}

const database = new ItemDatabase;

export function getItemDatabase() {
    return database;
}
