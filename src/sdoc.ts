import * as textutils from './textutils'
import { Color, Term } from './term';

export const _VERSION = "1.10"
const ESCAPE_CHAR = "\x70"

type BLIT = string[][];

const escapeCharWidth: { [key: string]: number } = { 
    "c": 3, 
    "r": 2, 
    "a": 3, 
    "p": 2, 
    "t": 34 
};

export function extractEscapeCodes(s: string): [string[], { [key: number]: string[] }] {
    const escapeCharMap: { [key: number]: string[] } = {};
    const output: string[] = [];
    let oidx = 0; // Output index
    let sidx = 0; // String index

    while (sidx < s.length) {
        const ch = s.charAt(sidx); // Get current character

        if (ch === ESCAPE_CHAR) {
            const esch = s.charAt(sidx + 1); // Next character after escape
            const w = escapeCharWidth[esch];

            if (w === undefined) {
                throw new Error(`Invalid escape code ${esch}`);
            }

            // Initialize the array if it doesn't exist
            escapeCharMap[oidx] = escapeCharMap[oidx] || [];
            const code = s.substring(sidx + 1, sidx + w); // Extract the escape code
            escapeCharMap[oidx].push(code); // Add the escape code to the map
            sidx += w; // Move the string index forward
        } else {
            output[oidx] = ch; // Add character to output
            oidx++; // Increment output index
            sidx++; // Move to next character
        }
    }

    return [output, escapeCharMap];
}

export function wrapString(s: string, width: number): [string[], { [key: number]: string[] }] {
    const [str, map] = extractEscapeCodes(s); // Extract escape codes
    const ccstr = str.join(""); // Concatenate the characters into a single string
    const output: string[] = [];
    let idx = 0; // Index for characters in str
    let row = 0; // Row index for output
    let col = 0; // Column index for current row

    // Function to write a character into the output
    const writeChar = (ch: string) => {
        if (col >= width) {
            col = 0; // Reset column
            row++; // Move to next row
        }
        output[row] = output[row] || ""; // Ensure there's a string for this row
        output[row] += ch; // Add character to the row
        col++; // Increment column
    };

    // Function to handle escape codes (this can be expanded as needed)
    const handleEscapeCodes = (codes?: string[]) => {
        if (codes) {
            for (const code of codes) {
                // Handle each escape code, if necessary
                // This part can be customized based on what needs to be done with the escape codes
            }
        }
    };

    while (idx < str.length) {
        const ch = str[idx];
        if (/\S/.test(ch)) { // Check if it's not whitespace
            let length = 1;

            // Calculate the length of the non-whitespace sequence
            while (idx + length < str.length && /\S/.test(str[idx + length])) {
                length++;
            }

            // Handle case where wrapping is needed
            if (width - col < length && length < width) {
                row++; // Move to the next row
                col = 0; // Reset column
            }

            // Write each character and handle escape codes
            for (let i = 0; i < length; i++) {
                handleEscapeCodes(map[idx + i]); // Handle escape codes
                writeChar(str[idx + i]); // Write character to output
            }

            idx += length; // Move index forward
        } else if (ch === "\n") {
            handleEscapeCodes(map[idx]); // Handle escape codes for new line
            writeChar("\n"); // Write new line
            col = 0; // Reset column
            row++; // Move to next row
            idx++; // Move index forward
        } else {
            handleEscapeCodes(map[idx]); // Handle escape codes for whitespace
            writeChar(ch); // Write character to output
            idx++; // Move index forward
        }
    }

    return [output, map]; // Return the wrapped output and escape character map
}

// Type alias for Alignment
type Alignment = "l" | "c" | "r";

// Interface for DocumentLine
interface SDOCDocumentLine {
    [index: number]: string; // Index signature for strings
    alignment: Alignment; // Alignment property
    lineX: number; // lineX property
}

// Interface for Document
interface SDOCDocument {
    pageWidth: number; // Page width
    pageHeight: number; // Page height
    pages: SDOCDocumentLine[][]; // Array of DocumentLines indexed by page
    indicies: Array<{ page: number; line: number; col: number }>; // Array of index objects
    indexlut: number[][][]; // 3D array for index lookup [page][line][col]
    editable: SDOCEditableDocument; // Editable document object
    blit: BLIT[]; // Array of BLIT objects
}

// Interface for EditableDocument
interface SDOCEditableDocument {
    title?: string; // Optional title property
    pageWidth: number; // Page width
    pageHeight: number; // Page height
    content: string[]; // Array of strings for content
    linestart: { [key: number]: { alignment: Alignment } | null }; // Index signature for line starts
    pages: { [key: number]: number | null }; // Inserted page markers
}

const headerMatch = /^shrekdoc-v(\d{2})w(\d{2})h(\d{2})m([RS]):/;
const headerExample = "shrekdoc-v01w00h00mR:";

const validVersions: { [key: string]: boolean } = {
    "01": true,
    "02": true,
};

/**
 * Decodes the header string and extracts the version, width, height, and mode.
 * 
 * @param str - The input string to decode.
 * @returns A tuple containing the decoded string, width, and height.
 * @throws Will throw an error if the document header is invalid.
 */
function decodeHeader(str: string): [string, number, number] {
    const match = str.match(headerMatch);
    if (!match) {
        throw new Error("Invalid document (missing header!)");
    }

    const version = match[1];
    const w = Number(match[2]);
    const h = Number(match[3]);
    const mode = match[4];

    if (!validVersions[version]) {
        throw new Error(`Unsupported document version v${version}`);
    }
    
    if (isNaN(w) || isNaN(h)) {
        throw new Error("Invalid document dimensions.");
    }

    if (mode === "R") {
        str = str.substring(headerExample.length);
    } else if (mode === "S") {
        const s = textutils.unserialize(str.substring(headerExample.length)); // Adjust as needed for unserializing
        if (typeof s !== "string") {
            throw new Error("Invalid serialized document.");
        }
        str = s;
    }

    return [str, w, h];
}

function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") {
        return obj; // Return the primitive value directly
    }

    if (Array.isArray(obj)) {
        // Handle array case
        return obj.map(item => deepClone(item)) as unknown as T;
    }

    // Handle object case
    const clonedObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = deepClone(obj[key]);
        }
    }
    return clonedObj as T;
}

export function encode(editable: SDOCEditableDocument): string {
    let color = "f";
    let alignment = "l";
    const str: string[] = [];
    
    str.push(`shrekdoc-v02w${String(editable.pageWidth).padStart(2, '0')}h${String(editable.pageHeight).padStart(2, '0')}mR:`);
    
    if (editable.title) {
        if (editable.title.length > 32) {
            throw new Error("Title is more than 32 characters!");
        }
        str.push(`${ESCAPE_CHAR}t${editable.title.padEnd(32, ' ')}`);
    }

    for (let i = 0; i < editable.content[0].length; i++) {
        const fg = editable.content[0].charAt(i);
        const bg = editable.content[1].charAt(i);
        const line = editable.linestart[i];

        if (fg === ESCAPE_CHAR) {
            str.push(ESCAPE_CHAR); // Escape escape characters
        }
        
        if (bg !== color) {
            color = bg;
            str.push(`${ESCAPE_CHAR}c${color}`);
        }

        if (editable.pages[i] != null) {
            for (let n = 0; n < editable.pages[i]; n++) {
                str.push(`${ESCAPE_CHAR}p`);
            }
        }
        
        if (line && line.alignment !== alignment) {
            if (line.alignment != null) {
                alignment = line.alignment;
                str.push(`${ESCAPE_CHAR}a${alignment}`);
            }
        }

        str.push(fg);
    }

    return str.join('');
}

export class DocumentImpl implements SDOCDocument {
    editable: SDOCEditableDocument;

    constructor(editable: SDOCEditableDocument) {
        this.editable = editable;
    }
    pageWidth: number;
    pageHeight: number;
    pages: SDOCDocumentLine[][];
    indicies: { page: number; line: number; col: number; }[];
    indexlut: number[][][];
    blit: BLIT[];

    remove(a: number, b: number): string {
        a = Math.min(a, b);
        b = Math.max(a, b);
        const sectionWidth = b - a + 1;
        const editableClone = deepClone(this.editable);

        for (let i = a; i <= b; i++) {
            editableClone.linestart[i];
            editableClone.pages[i] = null;
        }

        for (let i = b + 1; i < editableClone.content[0].length; i++) {
            if (editableClone.linestart[i]) {
                editableClone.linestart[i - sectionWidth] = editableClone.linestart[i];
                editableClone.linestart[i] = null;
            }
            if (editableClone.pages[i]) {
                editableClone.pages[i - sectionWidth] = editableClone.pages[i];
                editableClone.pages[i] = null;
            }
        }
        editableClone.content[0] = editableClone.content[0].substring(0, a - 1) + editableClone.content[0].substring(b);
        editableClone.content[1] = editableClone.content[1].substring(0, a - 1) + editableClone.content[1].substring(b);
        return encode(editableClone);
    }

    setAlignment(idx: number, alignment: Alignment, b?: number): string {
        const editableClone = deepClone(this.editable);

        if (b) {
            for (let i = b; i >= idx; i--) {
                const nl = editableClone.linestart[i];
                if (nl) {
                    nl.alignment = alignment;
                }
            }
        }
        for (let i = idx; i >= 1; i--) {
            const nl = editableClone.linestart[i];
            if (nl) {
                nl.alignment = alignment;
                break;
            }
        }

        return encode(editableClone);
    }

    setColor(color: string, a: number, b: number): string {
        a = Math.min(a, b);
        b = Math.max(a, b);
        const size = b - a + 1;
        const editableClone = deepClone(this.editable);
        const s = editableClone.content[1];
        editableClone.content[1] = s.substring(0, a - 1) + color.repeat(size) + s.substring(b);
        return encode(editableClone);
    }

    insertAt(idx: number, str: string, color: string): string {
        const sectionWidth = str.length;
        const editableClone = deepClone(this.editable);
        
        for (let i = editableClone.content[0].length - 1; i >= idx; i--) {
            if (editableClone.linestart[i]) {
                editableClone.linestart[i + sectionWidth] = editableClone.linestart[i];
                editableClone.linestart[i] = null;
            }
            if (editableClone.pages[i]) {
                editableClone.pages[i + sectionWidth] = editableClone.pages[i];
                editableClone.pages[i] = null;
            }
        }
        editableClone.content[0] = editableClone.content[0].substring(0, idx - 1) + str + editableClone.content[0].substring(idx);
        editableClone.content[1] = editableClone.content[1].substring(0, idx - 1) + color.repeat(sectionWidth) + editableClone.content[1].substring(idx);
        return encode(editableClone);
    }

    insertPage(idx: number): string {
        const editableClone = deepClone(this.editable);
        editableClone.pages[idx] = (editableClone.pages[idx] || 0) + 1;
        return encode(editableClone);
    }
}

export function decode(str: string): SDOCDocument {
    const [headerStr, w, h] = decodeHeader(str);
    const [s, m] = wrapString(headerStr, w);

    const doc: SDOCDocument = {
        pages: [[]],
        indicies: [],
        indexlut: [],
        pageWidth: w,
        pageHeight: h,
        editable: { content: [], linestart: [], pages: [], pageHeight: h, pageWidth: w },
        blit: []
    };

    let color = "f";
    let alignment = "l" as Alignment;
    let idx = 1;
    let page = 1;
    let ln = 1;
    let chn = 1;
    let lineColor: string[] = [];
    let lineText: string[] = [];

    const writeLine = () => {
        doc.pages[page] = doc.pages[page] || [];
        doc.pages[page][ln][0] = lineText.join("");
        doc.pages[page][ln][1] = lineColor.join("");
        doc.pages[page][ln]['alignment'] = alignment;
        lineColor = [];
        lineText = [];
        ln++;
        chn = 1;
    };

    const parseEscapeCode = (code: string[], y: number) => {
        for (const s of code) {
            if (s.startsWith("r")) {
                color = "f";
                alignment = "l";
            } else if (s.startsWith("c")) {
                color = s.charAt(1);
            } else if (s.startsWith("a")) {
                alignment = s.charAt(1) as Alignment;
            } else if (s.startsWith("p")) {
                writeLine();
                page++;
                ln = 1;
                doc.editable.pages[idx] = (doc.editable.pages[idx] || 0) + 1;
            } else if (s.startsWith("t")) {
                const title = s.substring(1, 34).trim();
                if (title === "") {
                    throw new Error("???");
                }
                doc.editable.title = title;
            } else {
                throw new Error(`Invalid escape code ${s}`);
            }
        }
    };

    for (let i = 0; i < s.length; i++) {
        if (ln - 1 === h) {
            page++;
            ln = 1;
        }
        for (let x = 0; x < s[i].length; x++) {
            const ch = s[i].charAt(x);
            if (m[idx]) {
                parseEscapeCode(m[idx], i);
            }
            doc.indicies[idx] = { line: ln, col: chn, page: page };
            doc.indexlut[page] = doc.indexlut[page] || [];
            doc.indexlut[page][ln] = doc.indexlut[page][ln] || [];
            doc.indexlut[page][ln][chn] = idx;
            lineColor[chn] = color;
            lineText[chn] = ch;
            idx++;
            chn++;
        }
        writeLine();
    }

    const last = doc.indicies[idx - 1] || { line: 1, col: 1, page: 1 };
    doc.indicies[idx] = { line: last.line, col: last.col + 1, page: last.page };

    let lastSeenIdx = 1;
    const lastPage = page;

    for (let pg = 1; pg <= lastPage; pg++) {
        doc.indexlut[pg] = doc.indexlut[pg] || [];
        const pageHeight = doc.indexlut[pg].length;
        for (let line = 1; line <= doc.pageHeight; line++) {
            const lineLength = doc.indexlut[pg][line]?.length || 0;
            doc.indexlut[pg][line] = doc.indexlut[pg][line] || [];
            for (let chn = 1; chn <= doc.pageWidth; chn++) {
                if (doc.indexlut[pg][line][chn]) {
                    lastSeenIdx = doc.indexlut[pg][line][chn];
                } else {
                    doc.indexlut[pg][line][chn] = lastSeenIdx;
                }
                if (pg === lastPage && line === pageHeight && chn === lineLength) {
                    lastSeenIdx++;
                }
            }
        }
    }

    doc.pages[0][0] = doc.pages[0][0] || { alignment: "l", lineX: 1 } as SDOCDocumentLine;

    const fgstring: string[] = [];
    const bgstring: string[] = [];
    let lastLineHadNewline = true;

    for (let pn = 0; pn < doc.pages.length; pn++) {
        const page = doc.pages[pn];
        for (let ln = 0; ln < page.length; ln++) {
            const line = page[ln];
            fgstring.push(line[0]);
            bgstring.push(line[1]);
            if (lastLineHadNewline) {
                const index = doc.indexlut[pn + 1][ln + 1][0];
                doc.editable.linestart[index] = { alignment: line.alignment };
                lastLineHadNewline = false;
            }
            const chn = line[0].indexOf("\n");
            lastLineHadNewline = chn !== -1;
        }
        if (page.length < doc.pageHeight && pn < doc.pages.length - 1) {
            lastLineHadNewline = true;
        }
    }

    doc.editable.content[0] = fgstring.join("");
    doc.editable.content[1] = bgstring.join("");

    doc.blit = render(doc);

    return doc;
}

export function render(doc: SDOCDocument, a?: number, b?: number, renderNewlines?: boolean, renderNewpages?: boolean, renderControl?: boolean): BLIT[] {
    b = b ?? a; // Using nullish coalescing operator to default b to a
    if (a !== undefined && b !== undefined) {
        a = Math.min(a, b);
        b = Math.max(a, b);
    }
    
    const blit: BLIT[] = [];
    const highlightColor = "8";
    const newpageColor = "1";
    let lastSeenColor = "f";
    let lineEndsInHighlight = false;
    let lineStartsInHighlight = false;
    let y = 0; // Start from 0 since TypeScript arrays are 0-indexed

    for (let pn = 0; pn < doc.pages.length; pn++) {
        const page = doc.pages[pn];
        const pblit: BLIT = [];
        y = 0; // Reset y for each page

        for (let ln = 0; ln < doc.pageHeight; ln++) {
            const line = page[ln] || { alignment: "l", lineX: 1 } as SDOCDocumentLine; // Default line structure
            line[2] = ""; // Initialize third element (if applicable)
            let sx = 1; // Start x position for line

            for (let i = 0; i < line[0].length; i++) {
                const idx = doc.indexlut[pn + 1][ln + 1][i + 1]; // Adjusting for 1-based indexing in Lua
                if (a !== undefined && b !== undefined && idx >= a && idx <= b) {
                    lineEndsInHighlight = true;
                } else {
                    lineEndsInHighlight = false;
                }

                if (renderNewpages && (doc.editable.pages[idx] || 0) > 0) {
                    line[2] += newpageColor;
                } else {
                    line[2] += lineEndsInHighlight ? highlightColor : "0";
                }
            }

            const alignment = line[3] || "l"; // Default alignment to left
            if (alignment === "c") {
                sx = Math.floor((doc.pageWidth - line[0].length) / 2) + 1;
            } else if (alignment === "r") {
                sx = doc.pageWidth - line[0].length + 1;
            }

            let colorStart = line[1].charAt(0);
            let colorEnd = line[1].charAt(line[1].length - 1);
            if (line[1].length === 0) {
                colorStart = lastSeenColor;
                colorEnd = lastSeenColor;
            } else {
                lastSeenColor = colorEnd;
            }

            if (page[ln]) {
                page[ln]['lineX'] = sx; // Add lineX to line
            }

            pblit[y] = [
                " ".repeat(sx - 1) + line[0] + " ".repeat(doc.pageWidth - sx + 1 - line[0].length),
                colorStart.repeat(sx - 1) + line[1] + colorEnd.repeat(doc.pageWidth - sx + 1 - line[1].length),
                (lineStartsInHighlight ? highlightColor : "0").repeat(sx - 1) + line[2] + (lineEndsInHighlight ? highlightColor : "0").repeat(doc.pageWidth - sx + 1 - line[2].length)
            ];

            y++;
            lineStartsInHighlight = lineEndsInHighlight; // Update for the next line
        }
        
        blit[pn] = pblit; // Store the page blit
    }

    return blit;
}

function setColor(dev: Term, fg?: Color, bg?: Color): [Color, Color] {
    const obg = dev.getBackgroundColor();
    const ofg = dev.getTextColor();
    if (bg) dev.setBackgroundColor(bg);
    if (fg) dev.setTextColor(fg);
    return [ofg, obg];
}

export function blitOn(
    doc: BLIT[], 
    page: number, 
    dev: Term, 
    x?: number, 
    y?: number, 
): void {
    const pageWidth = doc[0][0][0].length;
    const pageHeight = doc[0].length;
    const [w, h] = dev.getSize();

    x = x || Math.ceil((w - pageWidth) / 2);
    y = y || Math.ceil((h - pageHeight) / 2);
    const [ofg, obg] = setColor(dev, 'black', 'white'); // Assuming 'colors.black' and 'colors.white' are strings

    for (let i = 0; i < doc[page].length; i++) {
        const line = doc[page][i];
        dev.setCursorPos(x, y + i);
        dev.blit(line[0], line[1], line[2]); // Using spread operator to unpack line array
    }

    setColor(dev, ofg, obg); // Restore original colors
}