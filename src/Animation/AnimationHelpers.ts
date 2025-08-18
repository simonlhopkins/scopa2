import TweenChain = Phaser.Tweens.TweenChain;

class AnimationHelpers{
    
    static ForceFinishTween(tween: Phaser.Tweens.Tween|Phaser.Tweens.TweenChain): void {
        if(tween instanceof Phaser.Tweens.TweenChain){
            const chain:TweenChain = tween;
            AnimationHelpers.SeekTweenToEnd(chain.currentTween);
            while (!chain.nextTween()){
                if(chain.currentTween){
                    AnimationHelpers.SeekTweenToEnd(chain.currentTween);
                }
            }
        }else{
            AnimationHelpers.SeekTweenToEnd(tween)
        }
        tween.complete();
    }

    private static SeekTweenToEnd(tween:Phaser.Tweens.Tween){
        tween.seek(tween.duration+100);
    }
    public static WaitForTweensToComplete(tweens: (Phaser.Tweens.Tween|TweenChain)[], delayAfter:number = 0): Promise<void> {
        return new Promise<void>(async (resolve) => {
            await Promise.all(
                tweens.map(tween => {
                    return new Promise<void>((resolve_1) => {
                        tween.setCallback('onComplete', () => {
                            resolve_1();
                        });
                    });
                })
            );
            await new Promise<void>(resolve => {
                setTimeout(resolve, delayAfter);
            })
            resolve();
        })
        
    }
    
    public static CreateLoopDeLoopSpline(
        start: Phaser.Math.Vector2,
        end: Phaser.Math.Vector2,
        loopRadius: number
    ): Phaser.Curves.Spline {
        const points: Phaser.Math.Vector2[] = [];

        const dir = end.clone().subtract(start).normalize();
        const midPoint = start.clone().add(dir.clone().scale(start.distance(end)/2));
        const centerOfLoop = midPoint.clone().add(dir.clone().rotate(Math.PI / 2).scale(loopRadius));
        points.push(start);
        const startAngle = dir.clone().rotate(-Math.PI / 2).normalize();
        for(let i = 0; i< 10; i++){
            const angle = startAngle.clone().rotate(Phaser.Math.DegToRad(i * 36)); // 10 points, 36 degrees apart
            const point = centerOfLoop.clone().add(angle.scale(loopRadius));
            points.push(point);
        }
        points.push(midPoint);
        points.push(end);
        return new Phaser.Curves.Spline(new Phaser.Curves.Spline(points).getSpacedPoints(40));
    }

}

export default AnimationHelpers;