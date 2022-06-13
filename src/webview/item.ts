
import { Sprite } from '../types/sprite';

export function getFilename(path: string) {
    return path.replace(/^.*[\\\/]/, '');
}

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

export enum ItemType {
    sprite,
    sheetSprite,
    font,
}

export interface ItemOptions {
    sprite: Sprite,
    favorite: boolean,
    onUse: (item: Item) => void,
    onFavorite: (item: Item, val: boolean) => void,
    onSheet: (item: Item) => void,
    onInfo: (item: Item) => void,
}

export class Item {
    type: ItemType;
    sprite: Sprite;
    id: string;
    element: HTMLElement;
    image: HTMLImageElement | HTMLParagraphElement | null = null;
    imageDiv: HTMLDivElement;
    isFavorite: boolean;

    constructor(options: ItemOptions) {
        if (options.sprite.path.endsWith('.fnt')) {
            this.type = ItemType.font;
        } else if (options.sprite.path.endsWith('.plist')) {
            this.type = ItemType.sheetSprite;
        } else {
            this.type = ItemType.sprite;
        }
        this.sprite = options.sprite;
        this.isFavorite = options.favorite;
        this.id = options.sprite.name;
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

    becameVisible(visible: boolean, fetchFunc: (item: Item) => void) {
        if (visible) {
            this.fetchImage(fetchFunc);
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

    private fetchImage(fetchFunc: (item: Item) => void) {
        this.addLoadingCircle();
        fetchFunc(this);
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
            <p>${this.sprite.name}</p>
            ${
                this.type === ItemType.sheetSprite ?
                `<a>${getFilename(this.sprite.path)}</a>` : ''
            }
            <div id="buttons"></div>
        `;

        const useButton = document.createElement('button');
        useButton.innerHTML = 'Use';
        useButton.addEventListener('click', _ => options.onUse(this));
        element.querySelector('#buttons')?.appendChild(useButton);

        const starButton = document.createElement('button');
        starButton.innerHTML = '★';
        if (options.favorite) {
            starButton.classList.add('favorite');
        }
        starButton.addEventListener('click', _ => {
            this.isFavorite = !this.isFavorite;
            if (this.isFavorite) {
                starButton.classList.add('favorite');
            } else {
                starButton.classList.remove('favorite');
            }
            options.onFavorite(this, this.isFavorite);
        });
        element.querySelector('#buttons')?.appendChild(starButton);

        if (this.type === ItemType.sheetSprite) {
            const sheetLink = element.querySelector('a');
            sheetLink?.addEventListener('click', _ => options.onSheet(this));
        }

        const hoverItem = document.createElement('div');
        hoverItem.classList.add('hover-item');

        const infoButton = document.createElement('button');
        infoButton.innerHTML = 'Info';
        infoButton.addEventListener('click', _ => options.onInfo(this));
        hoverItem.appendChild(infoButton);

        element.insertBefore(hoverItem, element.children[0]);

        return element;
    }
}

export class ItemDatabase {
    items: Item[] = [];

    create(options: ItemOptions) {
        const item = new Item(options);
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
            if (filterSearch(item.sprite.name, query)) {
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
