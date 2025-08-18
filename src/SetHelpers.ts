export class SetHelpers {
    /**
     * Returns a new Set containing elements in A ∪ B (union).
     */
    static union<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set([...a, ...b]);
    }

    /**
     * Returns a new Set containing elements in A ∩ B (intersection).
     */
    static intersection<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set([...a].filter(x => b.has(x)));
    }

    /**
     * Returns a new Set containing elements in A \ B (difference).
     */
    static difference<T>(a: Set<T>, b: Set<T>): Set<T> {
        return new Set([...a].filter(x => !b.has(x)));
    }

    /**
     * Returns a new Set containing elements in A △ B (symmetric difference).
     */
    static symmetricDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
        const inAOnly = [...a].filter(x => !b.has(x));
        const inBOnly = [...b].filter(x => !a.has(x));
        return new Set([...inAOnly, ...inBOnly]);
    }

    /**
     * Checks if set A is a subset of set B.
     */
    static isSubset<T>(a: Set<T>, b: Set<T>): boolean {
        return [...a].every(x => b.has(x));
    }

    /**
     * Checks if set A is a superset of set B.
     */
    static isSuperset<T>(a: Set<T>, b: Set<T>): boolean {
        return [...b].every(x => a.has(x));
    }

    /**
     * Returns the added elements from A to B (B \ A).
     */
    static added<T>(original: Set<T>, updated: Set<T>): Set<T> {
        return this.difference(updated, original);
    }

    /**
     * Returns the removed elements from A to B (A \ B).
     */
    static removed<T>(original: Set<T>, updated: Set<T>): Set<T> {
        return this.difference(original, updated);
    }
}
