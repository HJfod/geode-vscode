
export interface RenderedChar {
    data: string,
    x: number,
    y: number,
    width: number,
    height: number,
    xadvance: number,
}

export interface RenderedChars {
    chars: RenderedChar[],
    xoffset: number,
    base: number,
}
