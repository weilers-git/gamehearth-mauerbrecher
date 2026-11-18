export const columns = 10;
export const maxRows = 12;
export const solid = -1;
export const maxHits = 3;

export const symbols = { empty: ".", solid: "#", hits: ["1", "2", "3"] } as const;

export interface Level {
  rows: number;
  cells: number[];
}

export const levelPlans: readonly string[] = [
  `
1111111111
1111111111
1111111111
1111111111
1111111111`,
  `
2222222222
1111111111
1111111111
1111111111
1111111111
1111111111`,
  `
....22....
...2112...
..211112..
.21111112.
2111111112
1111111111`,
  `
1111111111
2222222222
1111111111
#1#1##1#1#
1111111111
2222222222`,
  `
3333333333
2222222222
1111111111
..........
1#1#11#1#1
1111111111
2222222222`,
  `
3.3.3.3.3.
.3.3.3.3.3
2.2.2.2.2.
.2.2.2.2.2
1.1.1.1.1.
.#.1.1.#..`,
  `
3333333333
3111111113
3122222213
3121111213
3121331213
3121111213
3122222213
3111111113
##.####.##`,
  `
2222222222
##1####1##
3333333333
1111111111
#11####11#
2222222222
1111111111`,
  `
....33....
...3223...
..321123..
.32111123.
3211#11123
.32111123.
..321123..
...3223...
....33....
#........#`,
  `
3333333333
3#3#33#3#3
2222222222
2#2.22.2#2
1111111111
1.1#11#1.1
3333333333
##.#..#.##
2222222222
1111111111`,
];

export function cellFromSymbol(symbol: string): number | undefined {
  if (symbol === symbols.empty) {
    return 0;
  }
  if (symbol === symbols.solid) {
    return solid;
  }
  const hits = symbols.hits.indexOf(symbol as (typeof symbols.hits)[number]);
  return hits < 0 ? undefined : hits + 1;
}

export function symbolFromCell(cell: number): string {
  if (cell === solid) {
    return symbols.solid;
  }
  return symbols.hits[cell - 1] ?? symbols.empty;
}

export function isBreakable(cell: number | undefined): boolean {
  return cell !== undefined && cell > 0;
}

export function breakableCount(cells: readonly number[]): number {
  return cells.filter(isBreakable).length;
}

export function splitRows(text: string): string[] {
  return text.trim().split(/[\s/]+/).filter((row) => row.length > 0);
}

export function gridText(cells: readonly number[]): string {
  const rows: string[] = [];
  for (let start = 0; start < cells.length; start += columns) {
    rows.push(cells.slice(start, start + columns).map(symbolFromCell).join(""));
  }
  return rows.join("/");
}

export function parseLevel(text: string): Level {
  const rows = splitRows(text);
  if (rows.length === 0 || rows.length > maxRows) {
    throw new Error(`Ein Level hat 1 bis ${maxRows} Reihen, dieses hat ${rows.length}`);
  }
  const cells: number[] = [];
  rows.forEach((row, y) => {
    if (row.length !== columns) {
      throw new Error(`Reihe ${y + 1} ist ${row.length} Zeichen lang; jede Reihe hat genau ${columns} Steine`);
    }
    for (const symbol of row) {
      const cell = cellFromSymbol(symbol);
      if (cell === undefined) {
        throw new Error(`Unbekanntes Zeichen „${symbol}“ in Reihe ${y + 1}; erlaubt sind . 1 2 3 #`);
      }
      cells.push(cell);
    }
  });
  if (breakableCount(cells) === 0) {
    throw new Error("Ein Level braucht mindestens einen Stein, der kaputtgeht");
  }
  return { rows: rows.length, cells };
}

export const levels: readonly Level[] = levelPlans.map(parseLevel);

export function unreachableBricks(level: Level): number[] {
  const height = level.rows + 2;
  const key = (x: number, y: number) => y * columns + x;
  const open = (x: number, y: number) => y === 0 || y === height - 1 || level.cells[(y - 1) * columns + x] !== solid;
  const seen = new Set<number>();
  const queue: [number, number][] = [];
  for (let x = 0; x < columns; x++) {
    seen.add(key(x, height - 1));
    queue.push([x, height - 1]);
  }
  while (queue.length > 0) {
    const [x, y] = queue.shift() as [number, number];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= columns || ny >= height || seen.has(key(nx, ny)) || !open(nx, ny)) {
        continue;
      }
      seen.add(key(nx, ny));
      queue.push([nx, ny]);
    }
  }
  const missing: number[] = [];
  level.cells.forEach((cell, index) => {
    if (isBreakable(cell) && !seen.has(index + columns)) {
      missing.push(index);
    }
  });
  return missing;
}
