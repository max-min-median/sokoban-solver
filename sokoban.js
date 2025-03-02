const BinHeap = require('./BinHeap');
const { readFile } = require('./readFile');

process.argv[2] = 'puzzle8.txt';
let input = readFile(process.argv[2]);
if (input instanceof Error) {
    console.error(`Unable to read/fetch "${process.argv[2]}"!`);
    process.exit(1);
}
if (input.at(-1) === '') input = input.slice(0, -1);

const curry = (f, ...args) => args.length >= f.length ? f(...args) : (...moreArgs) => curry(f, ...args, ...moreArgs);
const deepMap = curry((f, x, ...indices) => x?.map ? x.map((y, i) => deepMap(f, y, ...indices, i)) : f(x, ...indices));
const deepCopy = deepMap(x => x);
const gridify = deepMap(y => [...y]);
const deepForEach = curry((f, x) => { deepMap(f, x) });
const deepSearch = curry((f, x) => { const arr = []; deepForEach((v, ...indices) => f(v, ...indices) && arr.push([v, ...indices]))(x); return arr; });
const print2D = (x, sep='') => process.stdout.write(x.map(y => y.join(sep)).join('\n') + '\n');

const dir$_U = [-1, 0], dir$_D = [1, 0], dir$_L = [0, -1], dir$_R = [0, 1];
Object.assign(dir$_U, {R: dir$_R, L: dir$_L, B: dir$_D, name: 'up', idx: 0, r: -1, c: 0, move: function (arr, n=1) { arr[0] += n * this.r, arr[1] += n * this.c; return arr; } });
Object.assign(dir$_D, {R: dir$_L, L: dir$_R, B: dir$_U, name: 'down', idx: 1, r: 1, c: 0, move: function (arr, n=1) { arr[0] += n * this.r, arr[1] += n * this.c; return arr; }, });
Object.assign(dir$_L, {R: dir$_U, L: dir$_D, B: dir$_R, name: 'left', idx: 2, r: 0, c: -1, move: function (arr, n=1) { arr[0] += n * this.r, arr[1] += n * this.c; return arr; }, });
Object.assign(dir$_R, {R: dir$_D, L: dir$_U, B: dir$_L, name: 'right', idx: 3, r: 0, c: 1, move: function (arr, n=1) { arr[0] += n * this.r, arr[1] += n * this.c; return arr; }, });
const dirs4 = [dir$_U, dir$_D, dir$_L, dir$_R];  // U D L R
Object.assign(dirs4, { up: dir$_U, down: dir$_D, left: dir$_L, right: dir$_R, chars: "^v<>UDLRudlr",
              from: function (dr, dc) { return Array.isArray(dr) ? this.from(...dr) : this.filter(d => d[0] === dr && d[1] === dc)[0]; },
              fromChar: function (ch) { return this[this.chars.indexOf(ch) % 4]; },
              rename: function (arr) { this.forEach((d, i) => d.name = arr[i]); }
});

dirs4.rename("UDLR");

sokoban(input);

function sokoban(input) {
    const visited = new Map;  // gridKey => [moves, handle (in minPQ)]
    const width = Math.max(...input.map(x => x.length));
    let firstGrid = gridify(input).map(x => x.concat(Array(width - x.length).fill(' ')));
    const startPos = deepSearch(x => x === 'S')(firstGrid);
    if (startPos.length === 0) throw new Error(`Player position not found! Please indicate player with an 'S'`);
    else if (startPos.length > 1) throw new Error(`Too many player positions ('S') found! There should only be one player position`);
    const [startR, startC] = startPos[0].slice(1);
    const [adjList, revList, boxes, goals, goalArray] = makeGraph(firstGrid, startR, startC);
    const goodBoxTiles = new Set([...reachableGoals(adjList, revList, goals)].filter(([x, y]) => y.size !== 0).map(([x, ]) => x));
    if (boxes.length !== goals.size) throw new Error('different numbers of boxes and goals!');
    firstGrid[startR][startC] = ' ';
    firstGrid.parent = null;
    firstGrid.dirStrFromParent = '';
    firstGrid.boxPos = [startR, startC];
    const minPQ = new BinHeap((a, b) => a[0] - b[0], [[0, 0, [startR, startC], firstGrid, boxes]]);  // [heu, moves, [playerR, playerC], grid]
    visited.set(makeKey(firstGrid, startR, startC), [0, 0]);
    let counter = 0, positions1k = 0;
    let heu = 0;

    processQueue:
    while (minPQ.size) {
        const [heu_unused, moves, [playerR, playerC], grid, boxes] = minPQ.pop();
        // console.log(`Dequeue: ${heu_unused}`);
        // if (heu_unused < heu) throw new Error(`Error with priority queue after ${positions1k * 1000 + counter} elements. Prev priority: ${heu}, Current priority: ${heu_unused}`);
        // else heu = heu_unused;
        counter++;
        if (counter === 1000) {
            counter = 0;
            positions1k++;
            process.stdout.write(`\rPositions examined: ${positions1k}k`);
        }

        visited.get(makeKey(grid, playerR, playerC))[1] = -1;  // set handle to -1

        // check for win condition
        if (goalArray.every(([r, c]) => grid[r][c] === 'B')) {
            const allGrids = [], allDirs = [];
            for (let thisGrid = grid; thisGrid !== null; thisGrid = thisGrid.parent) allGrids.push(thisGrid);
            for (const g of allGrids.reverse()) {
                if (g.parent === null) g[g.boxPos[0]][g.boxPos[1]] = 'S';
                else g[g.boxPos[0]][g.boxPos[1]] = { U: '↑', D: '↓', L: '←', R: '→'}[g.dirStrFromParent.at(-1)];
                allDirs.push(g.dirStrFromParent);
            }
            printGrids(allGrids);
            process.stdout.write(`\nFOUND SOLUTION!\nPositions calculated: ${positions1k * 1000 + counter}\n`);
            process.stdout.write(`Box-pushes: ${allDirs.length - 1}\n`);
            process.stdout.write(`     Moves: ${moves}\n`);
            process.stdout.write(`Directions: ${allDirs.slice(1).join(', ')}\n`);
            return;
        }

        const playerReachableTiles = bfsReachable(grid, playerR, playerC);
        
        for (const [i, box] of boxes.entries()) {
            const [r, c] = box;
            for (const d of dirs4) {
                if (!'. '.includes(grid[r + d.r]?.[c + d.c])) continue;
                const accessTile = '' + [r - d.r, c - d.c], destTile = '' + [r + d.r, c + d.c];
                if (!goodBoxTiles.has(destTile) || !playerReachableTiles.has(accessTile)) continue;
                // check for 'dead' 2-by-2 block
                if ('#bB'.includes(grid[r + 2 * d.r]?.[c + 2 * d.c])) {
                    const midTwo = (grid[r + d.r][c + d.c] === '.' ? 'B' : 'b') + grid[r + 2 * d.r][c + 2 * d.c];
                    let $2by2 = midTwo + grid[r + d.r + d.R.r][c + d.c + d.R.c] + grid[r + 2 * d.r + d.R.r][c + 2 * d.c + d.R.c];
                    if (!$2by2.includes(' ') && !$2by2.includes('.') && $2by2.includes('b'))
                        continue;
                    $2by2 = midTwo + grid[r + d.r + d.L.r][c + d.c + d.L.c] + grid[r + 2 * d.r + d.L.r][c + 2 * d.c + d.L.c];
                    if (!$2by2.includes(' ') && !$2by2.includes('.') && $2by2.includes('b'))
                        continue;
                }
                const newGrid = deepCopy(grid);
                newGrid[r][c] = newGrid[r][c] === 'B' ? '.' : ' ';
                newGrid[r + d.r][c + d.c] = newGrid[r + d.r][c + d.c] === '.' ? 'B' : 'b';
                const thisBoxes = boxes.with(i, [r + d.r, c + d.c]);
                const thisKey = makeKey(newGrid, r, c);
                const [distToTile, dirsToTile] = playerReachableTiles.get(accessTile);
                const thisMoves = moves + distToTile + 1;
                const prev = visited.get(thisKey);
                if (prev !== undefined && prev[0] <= thisMoves) continue;
                newGrid.parent = grid;
                newGrid.dirStrFromParent = dirsToTile + d.name;
                newGrid.boxPos = [r, c];
                if (prev === undefined || prev[1] === -1) {
                    visited.set(thisKey, [thisMoves, minPQ.push([thisMoves + heuristic(newGrid, thisBoxes), thisMoves, [r, c], newGrid, thisBoxes])]);
                    // console.log(`Enqueueing: ${thisMoves + heuristic(newGrid, thisBoxes)}`);
                } else if (prev[0] > thisMoves) {
                    prev[0] = thisMoves;
                    const displaced = minPQ.modify(prev[1], [thisMoves + heuristic(newGrid, thisBoxes), thisMoves, [r, c], newGrid, thisBoxes]);
                    // console.log(`Modifying: ${displaced[0]} -> ${thisMoves + heuristic(newGrid, thisBoxes)}`);
                }
            }
        }
    }

    function bfsReachable(g, row, col) {
        const bfsVisited = new Map([['' + [row, col], [0, '']]]);
        let q = [[row, col]], qIdx = 0;
        for ( ; qIdx < q.length; qIdx++) {
            const [r, c] = q[qIdx];
            const [dist, dirStr] = bfsVisited.get('' + [r, c]);
            for (const d of dirs4) {
                const newCoord = [r2, c2] = d.move([r, c])
                const key = '' + newCoord;
                if (bfsVisited.has(key) || !'. '.includes(g[r2]?.[c2])) continue;
                bfsVisited.set(key, [dist + 1, dirStr + d.name]);
                q.push([r + d.r, c + d.c, dist + 1]);
            }
        }
        return bfsVisited;
    }

    /**
     * A multi-purpose function which creates a digraph adjacency list from a sokoban grid.
     * The adjacency list is a `Map<String, Set>`.
     * Also returns the following lists: locations of boxes, reverse adjacency list, locations of goals, start position.
     */ 
    function makeGraph(grid, r, c, adjList = new Map, revList = new Map, boxes=[], goalArray=[]) {
        const key = '' + [r, c];
        adjList.set(key, new Set);
        const thisCell = grid[r][c];
        if (thisCell === 'S') grid[r][c] = ' ';
        if ('bB'.includes(thisCell)) boxes.push([r, c]);
        if ('.B'.includes(thisCell)) goalArray.push([r, c]);
        for (const d of dirs4) {
            if (!" .bB".includes(grid[r + d.r]?.[c + d.c])) continue;
            const otherKey = '' + [r + d.r, c + d.c];
            if (" .bB".includes(grid[r - d.r]?.[c - d.c])) {
                adjList.get(key).add(otherKey);
                if (!revList.has(otherKey)) revList.set(otherKey, new Set);
                revList.get(otherKey).add(key);
            }
            if (!adjList.has(otherKey)) makeGraph(grid, r + d.r, c + d.c, adjList, revList, boxes, goalArray);
        }
        return [adjList, revList, boxes, new Set(goalArray.map(x => '' + x)), goalArray];
    }

    function reachableGoals(adjList, revList, goals) {
        const reachable = new Map([...adjList].map(([x, ]) => [x, new Set]));
        for (const goalKey of goals) dfs(goalKey, goalKey);
        return reachable;

        function dfs(gKey, thisKey, visited = new Set) {
            visited.add(thisKey);
            reachable.get(thisKey).add(gKey);
            for (const neighbor of revList.get(thisKey) ?? [])
                if (!visited.has(neighbor)) dfs(gKey, neighbor, visited);
        }
    }

    function makeKey(grid, r, c) { return grid.map(x => x.join('')).join('') + ':' + r + ':' + c; }

    function heuristic(grid, boxArray) {
        // return 0;
        const nearestBoxToGoal = Array(goals.size).fill(Infinity), nearestGoalToBox = Array(goals.size).fill(Infinity);
        for (const [b, [boxR, boxC]] of boxArray.entries()) {
            for (const [g, [goalR, goalC]] of goalArray.entries()) {
                const manh = Math.abs(boxR - goalR) + Math.abs(boxC - goalC);
                if (manh < nearestBoxToGoal[g]) nearestBoxToGoal[g] = manh;
                if (manh < nearestGoalToBox[b]) nearestGoalToBox[b] = manh;
            }
        }
        return (nearestBoxToGoal.reduce((prev, v) => prev + v) + nearestGoalToBox.reduce((prev, v) => prev + v)) / 2;
    }

    function printGrids(grids, screenWidth=100) {
        const SPACING = 3;
        const gridsPerRow = 1 + Math.floor((screenWidth - width) / (width + SPACING));
        const rows = firstGrid.length;
        const toPrint = Array(Math.ceil(grids.length / gridsPerRow) * (rows + 1) - 1).fill(0).map(x => []);
        const allGridRows = grids.flat();
        for (let i = 0, rowAt = -rows - 1, rowDone = rows * gridsPerRow; i < allGridRows.length; i++) {
            if (i % rowDone === 0) rowAt += rows + 1;
            const offset = i % rows;
            toPrint[rowAt + offset].push(allGridRows[i]);
        }
        const printStr = toPrint.map(row => row.map(gr => gr.join('')).join(' '.repeat(SPACING))).join('\n');
        process.stdout.write(`\n${printStr}\n`);
    }
}

/*
######  S = player
#Sb .#  # = wall
##  ##  b = box (misplaced)
 # B#   . = goal position
 ####   B = box on goal position
*/