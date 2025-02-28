const BinHeap = require('./BinHeap');
const { readFile } = require('./readFile');

let input = readFile(process.argv[2]);  // <-- select input
if (input instanceof Error) {
    console.error(`Unable to read/fetch "${process.argv[2]}"!`);
    process.exit(1);
}
if (input.at(-1) === '') input = input.slice(0, -1);

/* Useful constants */
// const { curry, reverseCurry, deepMap, deepCopy, gridify, numerify, removeEmptyRows, makeArray, gcd, lcm, egcd, print2D, match, splitArray,
//     splitArrayByEmptyRows, chunkArray, deepSearch, deepForEach, dirs4, memoize, memoizeStr, perms, choices, partitions, findSubsets, arrayCartesianProduct,
// } = require('../AoC_utils');
const curry = (f, ...args) => args.length >= f.length ? f(...args) : (...moreArgs) => curry(f, ...args, ...moreArgs);
const deepMap = curry((f, x, ...indices) => x?.map ? x.map((y, i) => deepMap(f, y, ...indices, i)) : f(x, ...indices));
const deepCopy = deepMap(x => x);
const gridify = deepMap(y => [...y]);
const deepForEach = curry((f, x) => { deepMap(f, x) });
const deepSearch = curry((f, x) => { const arr = []; deepForEach((v, ...indices) => f(v, ...indices) && arr.push([v, ...indices]))(x); return arr; });
const print2D = (x, sep='') => console.log(x.map(y => y.join(sep)).join('\n'));

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

/* process input here */
sokoban(input);

function sokoban(input) {
    const visited = new Map;  // gridKey => [moves, handle (in minPQ)]
    const width = Math.max(...input.map(x => x.length));
    let firstGrid = gridify(input).map(x => x.concat(Array(width - x.length).fill(' ')));
    const goals = deepSearch(x => '.B'.includes(x))(firstGrid);
    const boxes = deepSearch(x => 'bB'.includes(x))(firstGrid);
    if (deepSearch(x => 'bB'.includes(x))(firstGrid).length !== goals.length) throw new Error('different numbers of boxes and goals!');
    const startPos = deepSearch(x => x === 'S')(firstGrid);
    if (startPos.length === 0) throw new Error(`Player position not found! Please indicate player with an 'S'`);
    else if (startPos.length > 1) throw new Error(`Too many player positions ('S') found! There should only be one player position`);
    const [startR, startC] = startPos[0].slice(1);
    firstGrid[startR][startC] = ' ';
    firstGrid.parent = null;
    firstGrid.dirStrFromParent = '';
    firstGrid.boxPos = [startR, startC];
    const minPQ = new BinHeap((a, b) => a[0] - b[0], [[0, 0, [startR, startC], firstGrid, boxes]]);  // [heu, moves, [playerR, playerC], grid]
    visited.set(makeKey(firstGrid, startR, startC), [0, 0]);

    processQueue:
    while (minPQ.size) {
        const [heu_unused, moves, [playerR, playerC], grid, boxes] = minPQ.pop();
        // print2D(grid);
        visited.get(makeKey(grid, playerR, playerC))[1] = -1;  // set handle to -1
        if (goals.every(([_, r, c]) => grid[r][c] === 'B')) {
            console.log(`FOUND SOLUTION! ${moves} moves`);
            const allGrids = [], allDirs = [];
            for (let thisGrid = grid; thisGrid !== null; thisGrid = thisGrid.parent) allGrids.push(thisGrid);
            for (const g of allGrids.reverse()) {
                if (g.parent === null) g[g.boxPos[0]][g.boxPos[1]] = 'S';
                else g[g.boxPos[0]][g.boxPos[1]] = { U: '↑', D: '↓', L: '←', R: '→'}[g.dirStrFromParent.at(-1)];
                print2D(g);
                console.log();
                allDirs.push(g.dirStrFromParent);
            }
            console.log(`Directions: ${allDirs.slice(1).join(', ')}\n`);
            return;
        }
        const playerReachableTiles = bfs(grid, playerR, playerC);
        
        /* Test for boxes stuck in a corner */
        for (const [i, box] of boxes.entries()) {
            const r = box[1], c = box[2];
            if ((grid[r - 1]?.[c] === '#' || grid[r + 1]?.[c] === '#') && (grid[r][c - 1] === '#' || grid[r][c + 1] === '#'))
                if (box[0] === 'b') continue processQueue;
                else continue;
            else {
                for (const d of dirs4) {
                    const accessTile = '' + [r - d.r, c - d.c];
                    if (". ".includes(grid[r + d.r]?.[c + d.c]) && playerReachableTiles.has(accessTile)) {
                        const newGrid = deepCopy(grid);
                        newGrid[r][c] = newGrid[r][c] === 'B' ? '.' : ' ';
                        newGrid[r + d.r][c + d.c] = newGrid[r + d.r][c + d.c] === '.' ? 'B' : 'b';
                        const thisBoxes = boxes.with(i, [newGrid[r + d.r][c + d.c], r + d.r, c + d.c]);
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
                        } else if (prev[0] > thisMoves) {
                            prev[0] = thisMoves;
                            minPQ.modify(prev[1], [thisMoves + heuristic(newGrid, thisBoxes), thisMoves, [r, c], newGrid, thisBoxes]);
                        }
                    }
                }
            }
        }
        // console.log(playerReachableTiles);
    }

    function bfs(g, r, c, bfsVisited=new Map([['' + [r, c], [0, '']]])) {
        let q = [[r, c]], qIdx = 0;
        for ( ; qIdx < q.length; qIdx++) {
            const [r2, c2] = q[qIdx];
            const [dist, dirStr] = bfsVisited.get('' + [r2, c2]);
            for (const d of dirs4) {
                const key = '' + d.move([r2, c2])
                if (bfsVisited.has(key) || !". ".includes(g[r2 + d.r]?.[c2 + d.c])) continue;
                bfsVisited.set(key, [dist + 1, dirStr + d.name]);
                q.push([r2 + d.r, c2 + d.c, dist + 1]);
            }
        }
        return bfsVisited;
    }

    function makeKey(grid, r, c) { return grid.map(x => x.join('')).join('') + ':' + r + ':' + c; }
    function heuristic(grid, boxArray) {
        const nearestBoxToGoal = Array(goals.length).fill(Infinity), nearestGoalToBox = Array(goals.length).fill(Infinity);
        for (const [b, [_, boxR, boxC]] of boxArray.entries()) {
            for (const [g, [_, goalR, goalC]] of goals.entries()) {
                const manh = Math.abs(boxR - goalR) + Math.abs(boxC - goalC);
                if (manh < nearestBoxToGoal[g]) nearestBoxToGoal[g] = manh;
                if (manh < nearestGoalToBox[b]) nearestGoalToBox[b] = manh;
            }
        }
        return nearestBoxToGoal.reduce((prev, v) => prev + v) + nearestGoalToBox.reduce((prev, v) => prev + v);
    }
}

/*
######  S = player
#Sb .#  # = wall
##  ##  b = box (misplaced)
 # B#   . = goal position
 ####   B = box on goal position
*/