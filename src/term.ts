type Color = string; // Adjust this type according to your color representation

interface Term {
    getBackgroundColor(): Color;
    getTextColor(): Color;
    setBackgroundColor(color: Color): void;
    setTextColor(color: Color): void;
    setCursorPos(x: number, y: number): void;
    write(text: string): void;
    getSize(): [number, number]; // Returns width and height
    blit(text: string, fg: string, bg: string): void;
}