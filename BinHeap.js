/**
 * BinHeap v1.0.0
 * --------------
 * A simple binary heap which supports removal/modification of items.
 * Exposes the following methods:
 * 
 * - `constructor(cmp = (a, b) => a - b, array = [])`
 * - `clear()` : clears the heap.
 * - `push(item)` : adds `item` to the heap, returning a handle to the item.
 * - `pop()` : removes and returns the topmost item.
 * - `modify(handle, item)` : replaces the slot pointed to by `handle` with `item`. Returns the displaced (previous) item.
 * - `remove(handle)` : removes the slot pointed to by `handle`. Returns the removed item.
 * - `peek()` : returns the topmost item without removing it.
 * - `toString()` : returns a string representation of the underlying Array.
 * - `.size` : returns the size of the heap.
 * - `.heap` : returns a copy of the heap array.
 */
class BinHeap {

    #heap = [];
    #handle = [];  // maps: heap index -> handle number
    #index = [];   // maps: handle number -> heap index
    #vacant = [];  // holds available handle numbers
    #cmp;  // comparator

    constructor(cmp = (a, b) => a - b, array = []) {  // default sort order is ascending (min-heap)
        this.#cmp = cmp;
        for (const elem of array) this.push(elem);
        this.#heapify();
    }

    get size() { return this.#heap.length; }
    get heap() { return this.#heap.slice() };  // returns a copy of the heap array

    clear() {
        this.#heap = [];
        this.#handle = [];
        this.#index = [];
        this.#vacant = [];
    }

    push(item) {
        const handle = this.#vacant.pop() ?? this.#index.length;
        this.#index[handle] = this.#heap.length;
        this.#heap.push(item);
        this.#handle.push(handle);
        this.#siftUp(this.size - 1);
        return handle;
    }

    pop() {
        if (this.size === 0) return;
        this.#swap(0, this.size - 1);
        const freedHandle = this.#handle.pop();
        this.#vacant.push(freedHandle);
        this.#index[freedHandle] = undefined;
        const result = this.#heap.pop();
        this.#siftDown(0);
        return result;
    }

    modify(handle, item) {
        const index = this.#index[handle];
        if (index === undefined) throw new Error(`BinHeap.modify(): handle ${handle} is not currently in use!`);
        const prevItem = this.#heap[index];
        this.#heap[index] = item;
        if (this.#cmp(item, prevItem) > 0) this.#siftDown(index);
        else if (this.#cmp(item, prevItem) < 0) this.#siftUp(index);
        return prevItem;
    }

    remove(handle) {
        const index = this.#index[handle];
        if (index === undefined) throw new Error(`BinHeap.remove(): handle ${handle} is not currently in use!`);
        this.#swap(index, this.size - 1);
        this.#vacant.push(this.#handle.pop());
        this.#index[handle] = undefined;
        const removedItem = this.#heap.pop();
        if (this.size > 0) {
             if (this.#cmp(this.#heap[index], removedItem) > 0) this.#siftDown(index);
             else if (this.#cmp(this.#heap[index], removedItem) < 0) this.#siftUp(index);
        } 
        return removedItem;
    }

    peek() { return this.#heap[0]; }

    #heapify() { for (let i = (this.size - 1) >> 1; i >= 0; i--) this.#siftDown(i); }

    #siftDown(i) {  // children are 2*i+1 and 2*i+2
        const c1 = 2 * i + 1, c2 = c1 + 1;
        if (this.size < 2 * i + 2) return;  // no children
        const smallerChild = this.size > c2 && this.#cmp(this.#heap[c1], this.#heap[c2]) > 0 ? c2 : c1;
        if (this.#cmp(this.#heap[i], this.#heap[smallerChild]) > 0) {
            this.#swap(i, smallerChild);
            this.#siftDown(smallerChild);
        }
    }

    #siftUp(i) {
        if (i === 0) return;
        const parent = (i - 1) >> 1;
        if (this.#cmp(this.#heap[i], this.#heap[parent]) < 0 ) {
            this.#swap(i, parent);
            this.#siftUp(parent);
        }
    }

    #swap(a, b) {  // a, b are heap indices
        [this.#heap[a], this.#heap[b]] = [this.#heap[b], this.#heap[a]];
        [this.#handle[a], this.#handle[b]] = [this.#handle[b], this.#handle[a]];
        [this.#index[this.#handle[a]], this.#index[this.#handle[b]]] = [this.#index[this.#handle[b]], this.#index[this.#handle[a]]];
    }

    toString() {return JSON.stringify(this.#heap);}
}

module.exports = BinHeap;