import Card, {Suit} from "./Game/Card";

export default class Util {
  static cantorPair(x: number, y: number) {
    return ((x + y) * (x + y + 1)) / 2 + y;
  }
  static wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
  static mapRange(
      value: number,
      inMin: number,
      inMax: number,
      outMin: number,
      outMax: number
  ): number {
    if (inMin === inMax) {
      throw new Error("Input range cannot be zero (inMin === inMax).");
    }

    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
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
  
  static async WaitUntilTweensFinish(tweens: Phaser.Tweens.BaseTween[]) {
    const tweenPromises = tweens.map(
      (tween) =>
        new Promise<void>((resolve) => {
          tween.once("complete", resolve);
          tween.once("stop", resolve);
        })
    );
    // Wait for all tweens to complete
    await Promise.all(tweenPromises);
  }
}
