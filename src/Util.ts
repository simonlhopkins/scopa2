import Card from "./Game/Card";

export default class Util {
  static cantorPair(x: number, y: number) {
    return ((x + y) * (x + y + 1)) / 2 + y;
  }
  static wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  //stolen from chat
  static getAllUniqueCombinations<T>(arr: T[]): T[][] {
    const results: T[][] = [];

    function helper(start: number, combination: T[]): void {
      // Add the current combination to results (excluding empty combinations)
      if (combination.length > 0) {
        results.push([...combination]);
      }

      for (let i = start; i < arr.length; i++) {
        combination.push(arr[i]); // Add current element to the combination
        helper(i + 1, combination); // Recurse with the next index
        combination.pop(); // Backtrack
      }
    }

    helper(0, []);
    return results;
  }

  static CardArrToString(arr: Card[]) {
    return `${arr.length} cards: ` + arr.map((c) => c.toString()).join(", ");
  }
}
