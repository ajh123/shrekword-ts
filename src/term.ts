export type Color = string; // Adjust this type according to your color representation

export const colors: { [key: string]: string } = { 
    "0": "#F0F0F0", 
    "1": "#F2B233", 
    "2": "#E57FD8", 
    "3": "#99B2F2", 
    "4": "#DEDE6C",
    "5": "#7FCC19",
    "6": "#F2B2CC",
    "7": "#4C4C4C",
    "8": "#999999",
    "9": "#4C99B2",
    "a": "#B266E5",
    "b": "#3366CC",
    "c": "#7F664C",
    "d": "#57A64E",
    "e": "#CC4C4C",
    "f": "#191919"
};

export interface Term {
    getBackgroundColor(): Color;
    getTextColor(): Color;
    setBackgroundColor(color: Color): void;
    setTextColor(color: Color): void;
    setCursorPos(x: number, y: number): void;
    write(text: string): void;
    getSize(): [number, number]; // Returns width and height
    blit(text: string, fg: string, bg: string): void;
    clear(): void;
}

export class HtmlTerminal implements Term {
    private bgColor: Color = colors["f"];  // Default background color
    private textColor: Color = colors["0"]; // Default text color
    private cursorX: number = 0;
    private cursorY: number = 0;
    private container: HTMLElement;

    private readonly width: number;
    private readonly height: number;

    constructor(containerId: string, width: number, height: number) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error("Invalid container ID");
        }
        this.container = container;
        this.width = width;  // Set the fixed number of columns
        this.height = height; // Set the fixed number of rows
        this.clear();
    }

    getBackgroundColor(): Color {
        return this.bgColor;
    }

    getTextColor(): Color {
        return this.textColor;
    }

    setBackgroundColor(color: Color): void {
        this.bgColor = color;
    }

    setTextColor(color: Color): void {
        this.textColor = color;
    }

    setCursorPos(x: number, y: number): void {
        this.cursorX = x;
        this.cursorY = y;
    }

    write(text: string): void {
        const lines = text.split('\n'); // Split the input text by newline characters
    
        for (let i = 0; i < lines.length; i++) {
            const row = this.getRow(); // Get the current row based on cursorY
            const currentLineText = row.textContent || '';
    
            // Overwrite characters in the existing row up to the width limit
            for (let j = 0; j < lines[i].length; j++) {
                if (this.cursorX < this.width) {
                    if (j < currentLineText.length - this.cursorX) {
                        // Replace existing character and update its color
                        const existingSpan = row.children[this.cursorX + j] as HTMLElement;
                        existingSpan.textContent = lines[i][j];
                        existingSpan.style.color = this.textColor; // Update the text color
                        existingSpan.style.backgroundColor = this.bgColor; // Update the background color
                    } else {
                        // Create a new span for additional characters
                        const span = document.createElement('span');
                        span.style.color = this.textColor;
                        span.style.backgroundColor = this.bgColor;
                        span.textContent = lines[i][j];
                        row.appendChild(span);
                    }
                }
            }
    
            this.cursorX += lines[i].length;
    
            if (i < lines.length - 1) {
                // If there is another line after this, move to the next row
                this.cursorY += 1;
                this.cursorX = 0;
            }
        }
    }

    getSize(): [number, number] {
        return [this.width, this.height]; // Return the fixed width and height
    }

    blit(text: string, fg: string, bg: string): void {
        if (text.length !== fg.length || text.length !== bg.length) {
            throw new Error("Text, foreground, and background must be the same length.");
        }

        const row = this.getRow();
        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.style.color = colors[fg[i]];
            span.style.backgroundColor = colors[bg[i]];
            span.textContent = text[i];
            row.appendChild(span);
        }
        this.cursorX += text.length;
    }

    private getRow(): HTMLElement {
        let row = this.container.children[this.cursorY] as HTMLElement;
        if (!row) {
            row = document.createElement('div');
            row.className = 'terminal-row'; // Apply the CSS class
            this.container.appendChild(row);
        }
        return row;
    }

    clear(): void {
        // Get the terminal size (width, height)
        const [width, height] = this.getSize();
    
        // Clear the entire display by overwriting each line with spaces, using the current background color
        this.container.innerHTML = ''; // Clear the container first
        for (let y = 0; y < height; y++) {
            const row = document.createElement('div');
            for (let x = 0; x < width; x++) {
                const span = document.createElement('span');
                span.style.backgroundColor = this.bgColor;
                span.innerHTML = '&nbsp;'; // Fill with spaces
                row.appendChild(span);
            }
            this.container.appendChild(row);
        }
    }
}