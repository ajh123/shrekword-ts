import "./styles.css";

import { colors, HtmlTerminal } from './term';

const term = new HtmlTerminal("terminal1", 51, 19)

term.clear();
term.setTextColor(colors["9"]);
term.setCursorPos(0, 0)
term.write("Hello");