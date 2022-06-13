
import { Sprite } from '../types/sprite';
import { RenderedChars } from '../types/font';

function getFilename(path: string) {
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

export class Item {
    type: ItemType;
    sprite: Sprite;
    id: string;
    element: HTMLElement;
    image: HTMLImageElement | HTMLCanvasElement | HTMLParagraphElement | null = null;
    imageDiv: HTMLDivElement;

    constructor(spr: Sprite) {
        if (spr.path.endsWith('.fnt')) {
            this.type = ItemType.font;
        } else if (spr.path.endsWith('.plist')) {
            this.type = ItemType.sheetSprite;
        } else {
            this.type = ItemType.sprite;
        }
        this.sprite = spr;
        this.id = spr.name;
        this.element = this.build();
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
        this.addImageType();
        if (data) {
            (this.image as HTMLImageElement).src = `data:image/png;base64,${data}`;
        } else {
            this.addFailedImage();
        }
        this.removeLoadingCircle();
    }

    renderFont(rendered: RenderedChars) {
        if (!rendered) {
            this.removeLoadingCircle();
            this.addFailedImage();
            return;
        }
        this.addImageType();

        const canvas = this.image as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        
        canvas.width = 150;
        canvas.height = 150;
        
        let posx = rendered.xoffset;
        rendered.chars.forEach(char => {
            const img = new Image(char.width, char.height);
            img.src = `data:image/png;base64,${char.data}`;
            ctx?.drawImage(img, posx, rendered.base);
            posx += char.xadvance;
        });

        this.removeLoadingCircle();
    }

    private addImageType() {
        this.image?.remove();
        if (this.type === ItemType.font) {
            this.image = document.createElement('canvas');
        } else {
            this.image = document.createElement('img');
        }
        this.imageDiv.appendChild(this.image);
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

    private build(): HTMLElement {
        const element = document.createElement('article');
        element.setAttribute('owner-item', this.id);
        element.innerHTML = `
            <div id="image-div"></div>
            <p>${this.sprite.name}</p>
            ${this.sprite.path.endsWith('.plist') ? `
                <p class="source">${getFilename(this.sprite.path)}</p>
            ` : ''}
            <div id="buttons">
                <button>Use</button>
                <button>★</button>
            </div>
        `;
        return element;
    }
}

export class ItemDatabase {
    items: Item[] = [];

    create(spr: Sprite) {
        const item = new Item(spr);
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
