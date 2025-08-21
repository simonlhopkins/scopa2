type ShakeConfig = {
    duration?: number;
    strength?: number;
    frequency?: number;
    axis?: 'x' | 'y' | 'both';
};

function makeShakeTimeline(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Components.Transform,
    config?: ShakeConfig
): { at: number; run: () => void }[] {
    const {
        duration = 300,
        strength = 10,
        frequency = 30,
        axis = 'both',
    } = config || {};

    const shakes = Math.floor(frequency * (duration / 1000));
    const interval = duration / shakes;

    const originalX = target.x;
    const originalY = target.y;

    const steps: { at: number; run: () => void }[] = [];

    for (let i = 0; i < shakes; i++) {
        const at = i * interval;

        const offsetX = axis === 'y' ? 0 : Phaser.Math.Between(-strength, strength);
        const offsetY = axis === 'x' ? 0 : Phaser.Math.Between(-strength, strength);

        // Apply shake
        steps.push({
            at,
            run: () => {
                target.x = originalX + offsetX;
                target.y = originalY + offsetY;
            },
        });

        // Restore position
        steps.push({
            at: at + interval / 2,
            run: () => {
                target.x = originalX;
                target.y = originalY;
            },
        });
    }

    // Final restore in case of rounding error
    steps.push({
        at: duration + 10,
        run: () => {
            target.x = originalX;
            target.y = originalY;
        },
    });

    return steps;
}
