# __sokoban-solver__
Solver for the popular puzzle game Sokoban. Written for NodeJS.
Because my son keeps bugging me to play a Sokoban clone on his new kiddy camera but I just suck too much.

## Requirements
NodeJS

## Installation
1. Clone the repository.
2. Create a text file (or edit an existing one) of the puzzle.
3. Run the solver with `node sokoban.js <puzzleFilename>.txt`

## Sample puzzle text file format
```
  ####
  #..#
 ## .##
 #  b.#
## b  ##
#  #bb #
#  S   #
########
```

| Char | Meaning |
| ---- | ------- |
| `S` | start position |
| `#` | wall |
| `b` | box |
| `.` | goal |
| `B` | box on goal |

Enjoy!
